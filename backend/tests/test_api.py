import hashlib
import hmac
import json
import os
import sys
import tempfile
import time
from pathlib import Path
from urllib.parse import urlencode


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

database_file = tempfile.NamedTemporaryFile(prefix="msishop-test-", suffix=".db", delete=False)
database_file.close()
os.environ["DATABASE_URL"] = f"sqlite:///{database_file.name}"
os.environ["ADMIN_PASSWORD"] = "test-admin-password"
os.environ["SECRET_KEY"] = "test-secret-key"
os.environ["BOT_TOKEN"] = "test-bot-token"
os.environ["DEMO_TELEGRAM_ID"] = "777000"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def telegram_init_data() -> str:
    values = {
        "auth_date": str(int(time.time())),
        "query_id": "test-query",
        "user": json.dumps({"id": 777000, "first_name": "Aisha"}, separators=(",", ":")),
    }
    data_check_string = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret = hmac.new(b"WebAppData", b"test-bot-token", hashlib.sha256).digest()
    values["hash"] = hmac.new(secret, data_check_string.encode(), hashlib.sha256).hexdigest()
    return urlencode(values)


def test_complete_api_workflow() -> None:
    try:
        with TestClient(app) as client:
            assert client.get("/health").json() == {"status": "ok"}
            assert client.get("/api/health").json() == {"status": "ok"}

            products = client.get("/api/products")
            assert products.status_code == 200
            assert len(products.json()) == 30
            assert client.get("/api/products/tg-premium-6m").status_code == 200
            assert len(client.get("/api/banners").json()) == 3
            assert len(client.get("/api/news").json()) == 3
            assert len(client.get("/api/pickup-slots").json()) == 4

            assert client.post("/api/admin/login", json={"password": "wrong"}).status_code == 401
            admin_login = client.post("/api/admin/login", json={"password": "test-admin-password"})
            assert admin_login.status_code == 200
            admin_headers = auth_header(admin_login.json()["token"])
            assert client.get("/api/admin/me", headers=admin_headers).json()["authenticated"] is True
            assert client.post("/api/products", json={"image": "x", "price": 1}).status_code == 401

            product_create = client.post("/api/products", headers=admin_headers, json={
                "image": "./images/mug.svg", "price": 300, "nameKey": "products.test",
                "descKey": "products.testDesc", "name": "API Test Product", "type": "physical", "stock": 2,
            })
            assert product_create.status_code == 201
            product_id = product_create.json()["id"]
            product_update = client.patch(
                f"/api/products/{product_id}", headers=admin_headers, json={"price": 321, "discount": 5}
            )
            assert product_update.json()["price"] == 321
            assert client.delete(f"/api/products/{product_id}", headers=admin_headers).status_code == 204
            assert client.get(f"/api/products/{product_id}").status_code == 404

            banner_create = client.post("/api/banners", headers=admin_headers, json={
                "title": "API Banner", "subtitle": "Test", "description": "Test",
                "image": "", "accent": "#123456", "icon": "T", "active": True,
            })
            assert banner_create.status_code == 201
            banner_id = banner_create.json()["id"]
            assert client.patch(f"/api/banners/{banner_id}", headers=admin_headers, json={"active": False}).json()["active"] is False
            assert client.delete(f"/api/banners/{banner_id}", headers=admin_headers).status_code == 204

            news_create = client.post("/api/news", headers=admin_headers, json={
                "title": "API News", "description": "Test news", "active": True,
            })
            assert news_create.status_code == 201
            news_id = news_create.json()["id"]
            assert client.patch(f"/api/news/{news_id}", headers=admin_headers, json={"title": "Updated"}).json()["title"] == "Updated"
            assert client.delete(f"/api/news/{news_id}", headers=admin_headers).status_code == 204

            assert client.post("/api/auth/login", json={"email": "aisha@msi.uz", "password": "wrong"}).status_code == 401
            student_login = client.post("/api/auth/login", json={"email": "aisha@msi.uz", "password": "demo"})
            assert student_login.status_code == 200
            student_headers = auth_header(student_login.json()["token"])
            assert client.get("/api/auth/me", headers=student_headers).json()["email"] == "aisha@msi.uz"
            assert client.patch("/api/auth/me", headers=student_headers, json={"address": "Campus B"}).json()["address"] == "Campus B"

            telegram_login = client.post("/api/auth/telegram", json={"initData": telegram_init_data()})
            assert telegram_login.status_code == 200
            assert telegram_login.json()["user"]["id"] == "student-2023114"
            assert client.post("/api/auth/telegram", json={"initData": "hash=invalid"}).status_code == 401

            before_balance = client.get("/api/auth/me", headers=student_headers).json()["balance"]
            order_payload = {
                "productId": "tg-gift-25", "quantity": 1, "customerName": "Aisha Karimova",
                "customerPhone": "+998 90 123 45 67", "deliveryAddress": "Campus A · Lobby",
                "deliveryMethod": "pickup", "pickupSlot": "16:00 · Campus A",
                "requestId": "api-test-purchase-1",
            }
            order_create = client.post("/api/orders", headers=student_headers, json=order_payload)
            assert order_create.status_code == 201
            created_order = order_create.json()["order"]
            assert created_order["totalPrice"] == 23
            assert order_create.json()["user"]["balance"] == before_balance - 23
            order_id = created_order["id"]
            duplicate_order = client.post("/api/orders", headers=student_headers, json=order_payload)
            assert duplicate_order.status_code == 201
            assert duplicate_order.json()["order"]["id"] == order_id
            assert duplicate_order.json()["user"]["balance"] == before_balance - 23
            assert any(order["id"] == order_id for order in client.get("/api/orders", headers=student_headers).json())
            assert client.get("/api/orders").status_code == 401

            notifications = client.get("/api/auth/notifications", headers=student_headers)
            assert notifications.status_code == 200
            assert any(item["type"] == "spend" and item["amount"] == 23 for item in notifications.json())
            assert client.post("/api/auth/notifications/read-all", headers=student_headers).status_code == 204
            assert all(item["read"] for item in client.get("/api/auth/notifications", headers=student_headers).json())

            admin_orders = client.get("/api/orders", headers=admin_headers)
            assert any(order["id"] == order_id for order in admin_orders.json())
            status_update = client.patch(f"/api/orders/{order_id}/status", headers=admin_headers, json={"status": "ready"})
            assert status_update.json()["status"] == "ready"
            assert client.delete(f"/api/orders/{order_id}", headers=admin_headers).status_code == 204

            users = client.get("/api/admin/users", headers=admin_headers)
            assert users.status_code == 200
            balance_change = client.post(
                "/api/admin/users/student-2023114/balance", headers=admin_headers,
                json={"amount": 50, "note": "API test grant"},
            )
            assert balance_change.status_code == 200
            assert balance_change.json()["amount"] == 50
            assert len(client.get("/api/admin/grants", headers=admin_headers).json()) >= 1

            bootstrap = client.get("/api/admin/bootstrap", headers=admin_headers)
            assert bootstrap.status_code == 200
            for resource in ("products", "banners", "news", "orders", "users", "notifications", "grants"):
                sync = client.put(
                    f"/api/admin/sync/{resource}", headers=admin_headers,
                    json={"items": bootstrap.json()[resource]},
                )
                assert sync.status_code == 200
                assert sync.json()["resource"] == resource
            assert client.put("/api/admin/sync/unknown", headers=admin_headers, json={"items": []}).status_code == 404

            reset = client.post("/api/admin/users/reset-balances", headers=admin_headers)
            assert reset.status_code == 200
            assert reset.json()["users"] >= 1
            assert client.delete("/api/orders", headers=admin_headers).status_code == 204
            assert client.get("/api/orders", headers=admin_headers).json() == []
            assert client.post("/api/auth/logout", headers=student_headers).status_code == 204
    finally:
        Path(database_file.name).unlink(missing_ok=True)
