"""Robux delivery information belongs to an existing buyer-owned order."""

import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from threading import Event
from urllib.parse import urlsplit

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import Order, Product, User
from app.order_delivery_details import ROBUX_PRODUCT_ID, save_delivery_details
from app.security import create_token, hash_password


@pytest.fixture
def shop(tmp_path: Path, monkeypatch):
    url = os.getenv("MSI_SHOP_TEST_DATABASE_URL")
    if url:
        parsed = urlsplit(url)
        assert parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        assert parsed.path.startswith("/msi_") and parsed.path.endswith("_test")
    else:
        url = f"sqlite:///{tmp_path / 'delivery-test.db'}"
    engine = create_engine(url, connect_args={"check_same_thread": False} if url.startswith("sqlite") else {})
    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine, expire_on_commit=False)
    with sessions() as database:
        database.add_all([
            User(id=name, name=name, email=f"{name}@example.invalid", balance=2000,
                 discount=0, password_hash=hash_password("invalid-test-password"))
            for name in ("buyer-a", "buyer-b")
        ])
        database.add_all([
            Product(id=ROBUX_PRODUCT_ID, name="Robux", price=540, product_type="digital",
                    fulfillment_type="digital_delivery", active=True, variants=[
                        {"id": "robux-270", "label": "270 Robux", "price": 540, "active": True},
                        {"id": "robux-500", "label": "500 Robux", "price": 880, "active": True},
                    ]),
            Product(id="manual-digital", name="Manual product", price=10,
                    product_type="digital", fulfillment_type="digital_delivery", active=True),
        ])
        database.commit()

    def connection():
        with sessions() as database:
            yield database

    monkeypatch.setattr("app.main.initialize_database", lambda: None)
    app.dependency_overrides[get_db] = connection
    with TestClient(app) as client:
        yield client, sessions
    app.dependency_overrides.pop(get_db)
    Base.metadata.drop_all(engine)
    engine.dispose()


def headers(user="buyer-a", role="user"):
    return {"Authorization": f"Bearer {create_token(user, role)}"}


def purchase(client, *, variant="robux-500", request_id="robux-purchase", product=ROBUX_PRODUCT_ID):
    response = client.post("/api/orders", headers=headers(), json={
        "productId": product, "variantId": variant if product == ROBUX_PRODUCT_ID else None,
        "requestId": request_id, "quantity": 1, "customerName": "buyer-a",
    })
    assert response.status_code == 201
    return response.json()


def submit(client, order_id="robux-purchase", *, player_id="123456789", buyer="buyer-a", item_index=0):
    return client.put(f"/api/orders/{order_id}/delivery-details", headers=headers(buyer),
                      json={"itemIndex": item_index, "answers": {"playerId": player_id, "friendRequestSent": True}})


@pytest.mark.parametrize("variant,price", [("robux-270", 540), ("robux-500", 880)])
def test_future_purchase_requests_id_and_saving_does_not_charge_again(shop, variant, price):
    client, sessions = shop
    result = purchase(client, variant=variant)
    assert result["user"]["balance"] == 2000 - price
    assert result["order"]["informationRequired"] is True
    assert "nextStatus" not in result["order"]
    assert client.patch("/api/orders/robux-purchase/status", headers=headers("staff", "admin"), json={"status": "sent"}).status_code == 409

    saved = submit(client)
    assert saved.status_code == 200
    order = saved.json()
    assert order["status"] == "paid"
    assert order["informationRequired"] is False
    assert order["nextStatus"] == "sent"
    assert order["deliveryRequirements"][0]["playerId"] == "123456789"
    assert submit(client).json() == order
    assert client.get("/api/orders", headers=headers()).json()[0] == order
    with sessions() as database:
        assert database.get(User, "buyer-a").balance == 2000 - price
        assert len(database.scalars(select(Order)).all()) == 1
        assert len(database.get(Order, "robux-purchase").items[0]["deliveryDetailsHistory"]) == 1
    admin_order = client.get("/api/admin/bootstrap", headers=headers("staff", "admin")).json()["orders"][0]
    assert admin_order["deliveryRequirements"] == order["deliveryRequirements"]


def test_historical_paid_order_gets_form_without_repurchase_or_catalog_change(shop):
    client, sessions = shop
    with sessions() as database:
        database.add(Order(id="legacy-robux", user_id="buyer-a", status="paid", total_price=880,
                           customer_name="buyer-a", customer_phone="", delivery_address="",
                           delivery_method="digital", created_at="2026-09-18T12:49:00+00:00",
                           items=[{"product": {"id": ROBUX_PRODUCT_ID, "name": "Old name", "type": "digital", "fulfillmentType": "digital_delivery"},
                                   "variant": {"id": "old-variant", "label": "500 Robux", "price": 880}, "quantity": 1}]))
        database.delete(database.get(Product, ROBUX_PRODUCT_ID))
        database.commit()
    order = client.get("/api/orders", headers=headers()).json()[0]
    assert order["informationRequired"] is True
    assert submit(client, "legacy-robux").status_code == 200
    with sessions() as database:
        assert database.get(User, "buyer-a").balance == 2000
        assert database.get(Order, "legacy-robux").total_price == 880


def test_only_buyer_can_submit_and_other_buyer_cannot_see_details(shop):
    client, _ = shop
    purchase(client)
    assert submit(client, buyer="buyer-b").status_code == 404
    assert client.put("/api/orders/robux-purchase/delivery-details", json={"itemIndex": 0, "playerId": "123"}).status_code == 401
    assert client.put("/api/orders/robux-purchase/delivery-details", headers=headers("staff", "admin"), json={"itemIndex": 0, "playerId": "123"}).status_code == 403
    assert submit(client).status_code == 200
    assert client.get("/api/orders", headers=headers("buyer-b")).json() == []
    assert client.get("/api/auth/notifications", headers=headers("buyer-b")).json() == []


@pytest.mark.parametrize("value", ["", "0", "0123", "-123", "name123", "1.5", "1 23", "1" * 21, 123, "１２３"])
def test_invalid_player_id_is_rejected_without_changing_order(shop, value):
    client, _ = shop
    purchase(client)
    assert submit(client, player_id=value).status_code == 422
    assert client.get("/api/orders", headers=headers()).json()[0]["informationRequired"] is True


def test_correctable_before_delivery_and_locked_after_staff_sends(shop):
    client, sessions = shop
    purchase(client)
    assert submit(client, player_id=" 123 ").json()["deliveryRequirements"][0]["playerId"] == "123"
    assert submit(client, player_id="456").status_code == 200
    sent = client.patch("/api/orders/robux-purchase/status", headers=headers("staff", "admin"), json={"status": "sent"})
    assert sent.status_code == 200
    assert sent.json()["deliveryRequirements"][0]["editable"] is False
    assert submit(client, player_id="789").status_code == 409
    assert submit(client, player_id="456").status_code == 200
    with sessions() as database:
        assert [entry["playerId"] for entry in database.get(Order, "robux-purchase").items[0]["deliveryDetailsHistory"]] == ["123", "456"]


def test_reminder_persists_until_details_supplied_and_manual_products_are_unchanged(shop):
    client, _ = shop
    purchase(client)
    path = "/api/auth/notifications"
    reminders = [item for item in client.get(path, headers=headers()).json() if item["type"] == "information_required"]
    assert [item["orderId"] for item in reminders] == ["robux-purchase"]
    client.post("/api/auth/notifications/read-all", headers=headers())
    assert any(item["type"] == "information_required" for item in client.get(path, headers=headers()).json())
    submit(client)
    assert not any(item["type"] == "information_required" for item in client.get(path, headers=headers()).json())
    manual = purchase(client, product="manual-digital", request_id="manual-purchase")["order"]
    assert manual["deliveryRequirements"] == []
    assert manual["nextStatus"] == "sent"
    assert submit(client, "manual-purchase").status_code == 409
    assert submit(client, item_index=1).status_code == 409
    assert client.patch("/api/orders/manual-purchase/status", headers=headers("staff", "admin"), json={"status": "sent"}).status_code == 200


def test_every_robux_item_requires_details_before_delivery(shop):
    client, sessions = shop
    purchase(client)
    with sessions() as database:
        order = database.get(Order, "robux-purchase")
        order.items = [*order.items, *order.items]
        database.commit()
    assert submit(client).json()["informationRequired"] is True
    assert submit(client, item_index=1, player_id="456").json()["informationRequired"] is False


def test_stale_admin_bulk_sync_cannot_erase_buyer_details(shop):
    client, sessions = shop
    stale = purchase(client)["order"]
    submit(client)
    stale["status"] = "sent"
    for items in ([stale], []):
        response = client.put("/api/admin/sync/orders", headers=headers("staff", "admin"), json={"items": items})
        assert response.status_code == 409
    with sessions() as database:
        order = database.get(Order, "robux-purchase")
        assert order.status == "paid"
        assert order.items[0]["deliveryDetails"]["playerId"] == "123456789"


def test_failed_save_rolls_back_and_can_be_retried(shop):
    client, sessions = shop
    purchase(client)

    def fail_commit(database):
        if any(isinstance(item, Order) for item in database.dirty):
            raise RuntimeError("Simulated delivery-details write failure")

    event.listen(sessions.class_, "before_commit", fail_commit)
    try:
        with pytest.raises(RuntimeError, match="Simulated"):
            submit(client)
    finally:
        event.remove(sessions.class_, "before_commit", fail_commit)
    with sessions() as database:
        assert "deliveryDetails" not in database.get(Order, "robux-purchase").items[0]
        assert database.get(User, "buyer-a").balance == 1120
    assert submit(client).status_code == 200


@pytest.mark.parametrize("send_first", [False, True])
def test_postgres_staff_delivery_and_student_edits_share_order_lock(shop, send_first):
    client, sessions = shop
    engine = sessions.kw["bind"]
    if engine.dialect.name != "postgresql":
        pytest.skip("Requires an explicitly configured disposable local PostgreSQL database")
    purchase(client)
    if send_first:
        submit(client, player_id="111")
    waiting = Event()

    def lock_requested(_connection, _cursor, statement, _parameters, _context, _many):
        if "FOR UPDATE" in statement:
            waiting.set()

    pool = ThreadPoolExecutor(max_workers=1)
    blocker = sessions()
    order = blocker.scalar(select(Order).where(Order.id == "robux-purchase").with_for_update())
    event.listen(engine, "before_cursor_execute", lock_requested)
    try:
        if send_first:
            pending = pool.submit(submit, client, player_id="222")
        else:
            pending = pool.submit(client.patch, "/api/orders/robux-purchase/status",
                                  headers=headers("staff", "admin"), json={"status": "sent"})
        assert waiting.wait(timeout=5)
        if send_first:
            order.status = "sent"
            blocker.commit()
        else:
            save_delivery_details(blocker, order_id=order.id, user_id="buyer-a", item_index=0, answers={"playerId": "111", "friendRequestSent": True})
        response = pending.result(timeout=5)
        assert response.status_code == (409 if send_first else 200)
    finally:
        blocker.rollback()
        blocker.close()
        event.remove(engine, "before_cursor_execute", lock_requested)
        pool.shutdown(wait=True)
    with sessions() as database:
        saved = database.get(Order, "robux-purchase")
        assert saved.status == "sent"
        assert saved.items[0]["deliveryDetails"]["playerId"] == "111"
        assert database.get(User, "buyer-a").balance == 1120
