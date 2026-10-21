from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.mark.parametrize("fulfillment", ["physical_pickup", "digital_activation", "digital_delivery"])
@pytest.mark.parametrize("with_variant", [False, True])
def test_stock_updates_are_public_and_checkout_is_limited_and_idempotent(fulfillment, with_variant):
    with TestClient(app) as client:
        admin_token = client.post("/api/admin/login", json={"password": "test-admin-password"}).json()["token"]
        student_token = client.post("/api/auth/login", json={"studentId": "2023114", "password": "demo"}).json()["token"]
        admin = {"Authorization": f"Bearer {admin_token}"}
        student = {"Authorization": f"Bearer {student_token}"}
        payload = {"name": "Stock test", "price": 1, "stock": 2, "fulfillmentType": fulfillment}
        if with_variant:
            payload["variants"] = [{"id": "one", "label": "One", "price": 1, "stock": 2}]
        product = client.post("/api/products", headers=admin, json=payload).json()
        url = f"/api/products/{product['id']}"
        for invalid in [-1, 1.5]:
            change = {"variants": [{**payload["variants"][0], "stock": invalid}]} if with_variant else {"stock": invalid}
            assert client.patch(url, headers=admin, json=change).status_code == 422
        assert client.patch(url, headers=student, json={"stock": 99}).status_code == 403
        assert client.patch(url, json={"stock": 99}).status_code == 401
        public = next(item for item in client.get("/api/products").json() if item["id"] == product["id"])
        assert public["stock"] == 2
        if with_variant:
            assert public["variants"][0]["stock"] == 2

        purchase = {"productId": product["id"], "quantity": 2, "customerName": "Stock test", "requestId": str(uuid4())}
        if with_variant:
            purchase["variantId"] = "one"
        response = client.post("/api/orders", headers=student, json=purchase)
        assert response.status_code == 201, response.text
        assert client.post("/api/orders", headers=student, json=purchase).json() == response.json()
        public = client.get(url).json()
        assert (public["variants"][0]["stock"] if with_variant else public["stock"]) == 0
        balance = client.get("/api/auth/me", headers=student).json()["balance"]
        rejected = client.post("/api/orders", headers=student, json={**purchase, "requestId": str(uuid4())})
        assert rejected.status_code == 409
        assert rejected.json()["detail"] == "Not enough stock"
        assert client.get("/api/auth/me", headers=student).json()["balance"] == balance

        # Clearing a variant limit falls back to shared product stock.
        change = {"stock": None}
        if with_variant:
            change["variants"] = [{**payload["variants"][0], "stock": None}]
        assert client.patch(url, headers=admin, json=change).status_code == 200
        assert client.post("/api/orders", headers=student, json={**purchase, "requestId": str(uuid4())}).status_code == 201
