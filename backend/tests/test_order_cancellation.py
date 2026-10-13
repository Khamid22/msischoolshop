"""An admin rejection refunds the paid amount once and closes fulfillment."""

import pytest
from sqlalchemy import event, select

from app.models import Notification, Order, Product, User
from app.sales_analytics import sales_analytics
from test_order_delivery_details import headers, purchase, shop, submit


def cancel(client, order_id="robux-purchase"):
    return client.post(f"/api/orders/{order_id}/cancel", headers=headers("staff", "admin"))


@pytest.mark.parametrize("details", [False, True])
def test_refund_once_keeps_history_and_closes_delivery(shop, details):
    client, sessions = shop
    purchase(client)
    if details:
        submit(client)
    for _ in range(2):
        response = cancel(client)
        assert response.status_code == 200
        order = response.json()
        assert order["status"] == "cancelled"
        assert order["canCancel"] is False
        assert "nextStatus" not in order
        assert order["informationRequired"] is False
        assert order["deliveryRequirements"][0]["editable"] is False
    assert submit(client, player_id="222").status_code == 409
    assert client.patch("/api/orders/robux-purchase/status", headers=headers("staff", "admin"), json={"status": "sent"}).status_code == 409
    # A retry of checkout returns the cancelled purchase without another debit.
    retry = purchase(client)
    assert retry["user"]["balance"] == 2000
    assert retry["order"]["status"] == "cancelled"
    notifications = client.get("/api/auth/notifications", headers=headers()).json()
    assert not any(item["type"] == "information_required" for item in notifications)
    refunds = [item for item in notifications if item["type"] == "refund"]
    assert len(refunds) == 1 and refunds[0]["amount"] == 880
    with sessions() as database:
        saved = database.get(Order, "robux-purchase")
        assert len(saved.items[0].get("deliveryDetailsHistory", [])) == int(details)
        assert sales_analytics([saved], "all").totalCoins == 0
        assert sales_analytics([saved], "all").orderCount == 0


def test_cancellation_requires_admin_and_cannot_use_status_or_bulk_shortcut(shop):
    client, sessions = shop
    purchase(client)
    url = "/api/orders/robux-purchase/cancel"
    assert client.post(url).status_code == 401
    assert client.post(url, headers=headers()).status_code == 403
    assert cancel(client, "missing").status_code == 404
    admin = headers("staff", "admin")
    assert client.patch("/api/orders/robux-purchase/status", headers=admin, json={"status": "cancelled"}).status_code == 409
    assert client.put("/api/admin/sync/orders", headers=admin, json={"items": [{"status": "cancelled"}]}).status_code == 409
    with sessions() as database:
        assert database.get(User, "buyer-a").balance == 1120
        assert database.get(Order, "robux-purchase").status == "paid"


@pytest.mark.parametrize("status,allowed", [("paid", True), ("packed", True), ("ready", True), ("collected", False), ("refunded", False)])
def test_physical_order_refunds_actual_discounted_price_and_restores_stock(shop, status, allowed):
    client, sessions = shop
    with sessions() as database:
        product = database.get(Product, "manual-digital")
        product.product_type = "physical"
        product.fulfillment_type = "physical_pickup"
        product.price = 101
        product.stock = 5
        database.get(User, "buyer-a").discount = 10
        database.commit()
    response = client.post("/api/orders", headers=headers(), json={"productId": "manual-digital", "quantity": 2, "customerName": "Buyer", "requestId": "physical"})
    paid = response.json()["order"]["totalPrice"]
    assert paid == 182
    with sessions() as database:
        database.get(Order, "physical").status = status
        database.get(Product, "manual-digital").price = 999
        database.commit()
    for _ in range(2):
        assert cancel(client, "physical").status_code == (200 if allowed else 409)
    with sessions() as database:
        assert database.get(User, "buyer-a").balance == (2000 if allowed else 2000 - paid)
        assert database.get(Product, "manual-digital").stock == (5 if allowed else 3)


@pytest.mark.parametrize("status,allowed", [("paid", True), ("activating", True), ("connected", False), ("sent", False), ("received", False)])
def test_delivery_and_activation_cannot_be_refunded_after_fulfillment(shop, status, allowed):
    client, sessions = shop
    purchase(client)
    with sessions() as database:
        order = database.get(Order, "robux-purchase")
        if status in {"activating", "connected"}:
            order.items = [{**order.items[0], "product": {**order.items[0]["product"], "fulfillmentType": "digital_activation"}}]
        order.status = status
        database.commit()
    assert cancel(client).status_code == (200 if allowed else 409)


def test_variant_stock_and_deleted_catalogue_do_not_change_refund(shop):
    client, sessions = shop
    with sessions() as database:
        # The Robux fixture owns both denominations in one product.
        product = database.scalar(select(Product).where(Product.variants.is_not(None)))
        product.variants = [{**variant, "stock": 3} for variant in product.variants]
        database.commit()
    order = purchase(client)["order"]
    assert cancel(client).status_code == 200
    with sessions() as database:
        product = database.get(Product, order["items"][0]["product"]["id"])
        assert [variant["stock"] for variant in product.variants] == [3, 3]
    purchase(client, request_id="deleted-product")
    with sessions() as database:
        database.delete(database.get(Product, order["items"][0]["product"]["id"]))
        database.commit()
    assert cancel(client, "deleted-product").status_code == 200


def test_failed_refund_rolls_back_everything_and_can_retry(shop):
    client, sessions = shop
    purchase(client)
    def fail_flush(database, _context, _instances):
        if any(isinstance(item, Notification) and item.notification_type == "refund" for item in database.new):
            raise RuntimeError("Simulated refund write failure")
    event.listen(sessions.class_, "before_flush", fail_flush)
    try:
        with pytest.raises(RuntimeError, match="Simulated refund"):
            cancel(client)
    finally:
        event.remove(sessions.class_, "before_flush", fail_flush)
    with sessions() as database:
        assert database.get(Order, "robux-purchase").status == "paid"
        assert database.get(User, "buyer-a").balance == 1120
    assert cancel(client).status_code == 200


def test_refund_record_cannot_be_erased_or_reopened_by_old_admin_cache(shop):
    client, _ = shop
    purchase(client, product="manual-digital", request_id="manual", variant=None)
    assert cancel(client, "manual").status_code == 200
    admin = headers("staff", "admin")
    assert client.delete("/api/orders/manual", headers=admin).status_code == 409
    assert client.delete("/api/orders", headers=admin).status_code == 409
    assert client.put("/api/admin/sync/orders", headers=admin, json={"items": []}).status_code == 409


def test_missing_buyer_rejects_without_marking_order_cancelled(shop):
    client, sessions = shop
    purchase(client)
    with sessions() as database:
        database.delete(database.get(User, "buyer-a"))
        database.commit()
    assert cancel(client).status_code == 409
    with sessions() as database:
        assert database.get(Order, "robux-purchase").status == "paid"
