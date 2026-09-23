import os
from urllib.parse import urlsplit

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app
from app.models import Order, Product, User
from app.security import create_token


@pytest.fixture
def shop(tmp_path, monkeypatch):
    url = os.getenv("MSI_SHOP_TEST_DATABASE_URL")
    if url:
        parsed = urlsplit(url)
        assert parsed.hostname in {"localhost", "127.0.0.1", "::1"}
        assert parsed.path.startswith("/msi_") and parsed.path.endswith("_test")
    else:
        url = f"sqlite:///{tmp_path / 'picks.db'}"
    engine = create_engine(url, connect_args={"check_same_thread": False} if url.startswith("sqlite") else {})
    assert not inspect(engine).get_table_names(), "Student Picks tests require an empty disposable database"
    Base.metadata.create_all(engine)
    sessions = sessionmaker(engine, expire_on_commit=False)

    def database():
        with sessions() as session:
            yield session

    monkeypatch.setattr("app.main.initialize_database", lambda: None)
    app.dependency_overrides[get_db] = database
    try:
        with TestClient(app) as client:
            yield client, sessions
    finally:
        app.dependency_overrides.pop(get_db)
        Base.metadata.drop_all(engine)
        engine.dispose()


def product(id, **fields):
    return Product(id=id, name=id, price=10, product_type="digital", fulfillment_type="digital_delivery", **fields)


def order(id, product_id, quantity, status="paid", **fields):
    return Order(id=id, status=status, created_at="2026-08-01T00:00:00+00:00", total_price=10,
                 customer_name="Private buyer", customer_phone="private-phone", delivery_address="private-address",
                 delivery_method="digital", items=[{"product": {"id": product_id, "name": "Historical name"},
                 "quantity": quantity, "deliveryDetails": {"playerId": "private-player-id"}}], **fields)


def picks(client):
    response = client.get("/api/student-picks")
    assert response.status_code == 200
    assert "private-" not in response.text and "Private buyer" not in response.text
    return [item["id"] for item in response.json()]


def test_existing_purchases_rank_by_quantity_without_manual_flags_and_hide_unavailable_products(shop):
    client, sessions = shop
    with sessions() as database, database.begin():
        database.add_all([product("robux", carousel=False), product("book", carousel=None),
                          product("unsold", carousel=True), product("hidden", active=False)])
        database.add_all([order("old-robux", "robux", 1, "received"), order("book", "book", 3),
                          order("hidden", "hidden", 100), order("deleted", "deleted", 100),
                          order("cancelled", "unsold", 100, "cancelled"),
                          order("refunded", "unsold", 100, "refunded"),
                          order("pending", "unsold", 100, "pending")])
    assert picks(client) == ["book", "robux"]
    assert "customerName" not in client.get("/api/student-picks").text


def test_all_paid_fulfillment_stages_count_and_equal_quantities_keep_catalogue_order(shop):
    client, sessions = shop
    statuses = ["paid", "packed", "ready", "collected", "activating", "connected", "sent", "received"]
    with sessions() as database, database.begin():
        database.add_all([product(status, position=index) for index, status in enumerate(statuses)])
        database.add_all([order(status, status, 1, status) for status in reversed(statuses)])
        database.add_all([product("zero"), product("bad"), product("negative")])
        database.add_all([order("zero", "zero", 0), order("bad", "bad", "bad"), order("negative", "negative", -5)])
    assert picks(client) == statuses


def test_merged_variant_history_counts_once_with_exact_product_priority(shop):
    client, sessions = shop
    with sessions() as database, database.begin():
        database.add_all([
            product("robux", variants=[{"id": "old-small"}, {"id": "robux"}, {"id": "shared"}, {"id": "other"}]),
            product("other", variants=[{"id": "shared"}]), product("old-small", active=False),
        ])
        database.add_all([order("old", "old-small", 3), order("current", "robux", 2),
                          order("other", "other", 4), order("ambiguous", "shared", 100)])
    assert picks(client) == ["robux", "other"]
    with sessions() as database, database.begin():
        # Reactivating an old product gives its history back to that exact product.
        database.get(Product, "old-small").active = True
    assert picks(client) == ["other", "old-small", "robux"]


def test_new_purchase_retry_and_fulfillment_refresh_selection_without_double_counting(shop):
    client, sessions = shop
    with sessions() as database, database.begin():
        database.add(User(id="buyer", name="Buyer", email="buyer@example.invalid", balance=1000,
                          discount=0, password_hash="unused"))
        database.add_all([product("new"), product("existing")])
        database.add(order("existing", "existing", 3))
    assert picks(client) == ["existing"]
    headers = {"Authorization": f"Bearer {create_token('buyer', 'user')}"}
    payload = {"productId": "new", "quantity": 2, "customerName": "Buyer", "requestId": "new-purchase"}
    for _ in range(2):
        response = client.post("/api/orders", headers=headers, json=payload)
        assert response.status_code == 201
    assert picks(client) == ["existing", "new"]
    admin = {"Authorization": f"Bearer {create_token('admin', 'admin')}"}
    for status in ["sent", "received"]:
        assert client.patch("/api/orders/new-purchase/status", headers=admin, json={"status": status}).status_code == 200
    assert picks(client) == ["existing", "new"]
    assert client.post("/api/orders", headers=headers, json={**payload, "requestId": "another-purchase"}).status_code == 201
    assert picks(client) == ["new", "existing"]
    with sessions() as database:
        assert database.get(User, "buyer").balance == 960


def test_no_purchases_returns_empty_even_when_manually_featured(shop):
    client, sessions = shop
    assert picks(client) == []
    with sessions() as database, database.begin():
        database.add(product("featured", carousel=True))
    assert picks(client) == []
