import base64
import hashlib
import hmac
import json
import os
import sys
import time
from pathlib import Path
from types import SimpleNamespace
from urllib.parse import urlencode


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from fastapi.testclient import TestClient  # noqa: E402
from werkzeug.security import generate_password_hash  # noqa: E402

from app.main import app  # noqa: E402
from app.database import engine  # noqa: E402
from app.order_fulfillment import (  # noqa: E402
    FULFILLMENT_FLOWS,
    fulfillment_type_from_order,
    next_status,
    status_for_fulfillment,
)
from app.routers.auth import authenticate_lms_student  # noqa: E402


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


def admin_sso_assertion(**overrides) -> str:
    now = int(time.time())
    payload = {
        "aud": "msi-shop-admin",
        "exp": now + 45,
        "iat": now,
        "iss": "msi-lms",
        "nonce": "test-nonce-123",
        "role": "customer_support",
        "sub": "41",
        **overrides,
    }
    encoded = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    ).decode().rstrip("=")
    signature = base64.urlsafe_b64encode(
        hmac.new(
            os.environ["SHOP_ADMIN_SSO_SECRET"].encode(),
            encoded.encode(),
            hashlib.sha256,
        ).digest()
    ).decode().rstrip("=")
    return f"{encoded}.{signature}"


class FakeLmsResult:
    def __init__(self, account: dict) -> None:
        self.account = account

    def mappings(self) -> "FakeLmsResult":
        return self

    def first(self) -> dict:
        return self.account


class FakeLmsSession:
    def __init__(self, account: dict) -> None:
        self.account = account
        self.added = None
        self.committed = False

    def execute(self, *_args, **_kwargs) -> FakeLmsResult:
        return FakeLmsResult(self.account)

    def get(self, *_args, **_kwargs):
        return None

    def scalar(self, *_args, **_kwargs):
        return None

    def add(self, user) -> None:
        self.added = user

    def commit(self) -> None:
        self.committed = True


def test_lms_login_creates_shop_profile_without_copying_credentials() -> None:
    lms_hash = generate_password_hash("student-password")
    database = FakeLmsSession({
        "account_id": 41,
        "password_hash": lms_hash,
        "account_name": "Aisha Karimova",
        "phone": "+998 90 123 45 67",
        "student_id": 114,
        "student_code": "MSI00114",
        "student_name": "Aisha Karimova",
        "group_names": "MG1",
        "active_course_count": 3,
        "total_coins": 143,
        "earned_this_month": 25,
    })

    user = authenticate_lms_student("MSI00114", "student-password", database)  # type: ignore[arg-type]

    assert user is database.added
    assert user is not None
    assert user.id == "lms-student-114"
    assert user.student_id == "MSI00114"
    assert user.group_name == "MG1"
    assert user.balance == 143
    assert user.earned == 25
    assert user.active_courses == 3
    assert user.password_hash != lms_hash
    assert database.committed is True


def test_lms_customer_support_assertion_creates_admin_session() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/admin/sso",
            json={"assertion": admin_sso_assertion()},
        )
        assert response.status_code == 200
        assert client.get(
            "/api/admin/me",
            headers=auth_header(response.json()["token"]),
        ).json() == {"authenticated": True, "role": "admin"}

        invalid = client.post(
            "/api/admin/sso",
            json={"assertion": admin_sso_assertion(role="student")},
        )
        assert invalid.status_code == 401

        expired = client.post(
            "/api/admin/sso",
            json={"assertion": admin_sso_assertion(iat=1, exp=2)},
        )
        assert expired.status_code == 401


def test_each_fulfillment_type_has_a_distinct_order_path() -> None:
    assert FULFILLMENT_FLOWS["physical_pickup"] == (
        "paid", "packed", "ready", "collected",
    )
    assert FULFILLMENT_FLOWS["digital_activation"] == (
        "paid", "activating", "connected",
    )
    assert FULFILLMENT_FLOWS["digital_delivery"] == (
        "paid", "sent", "received",
    )
    assert next_status("digital_delivery", "paid") == "sent"
    assert next_status("digital_delivery", "received") is None


def test_legacy_digital_order_does_not_keep_physical_pickup_flow() -> None:
    legacy_order = SimpleNamespace(
        items=[{"product": {"type": "digital"}, "quantity": 1}],
        delivery_method="pickup",
        pickup_code="K-6799",
        status="ready",
    )
    fulfillment_type = fulfillment_type_from_order(legacy_order)
    assert fulfillment_type == "digital_activation"
    assert status_for_fulfillment(fulfillment_type, legacy_order.status) == "activating"


def test_catalog_categories_gallery_and_variant_purchase_are_synchronized() -> None:
    with TestClient(app) as client:
        admin_login = client.post(
            "/api/admin/login",
            json={"password": "test-admin-password"},
        )
        admin_headers = auth_header(admin_login.json()["token"])
        student_login = client.post(
            "/api/auth/login",
            json={"studentId": "2023114", "password": "demo"},
        )
        student_headers = auth_header(student_login.json()["token"])

        category = client.post(
            "/api/categories",
            headers=admin_headers,
            json={
                "id": "subscriptions-test",
                "nameRu": "Подписки",
                "nameUz": "Obunalar",
                "nameEn": "Subscriptions",
                "active": True,
            },
        )
        assert category.status_code == 201
        assert any(
            item["id"] == "subscriptions-test"
            for item in client.get("/api/categories").json()
        )

        product = client.post(
            "/api/products",
            headers=admin_headers,
            json={
                "image": "data:image/png;base64,ZmFrZQ==",
                "images": [
                    "data:image/png;base64,ZmFrZQ==",
                    "https://example.test/second.png",
                ],
                "price": 100,
                "categoryId": "subscriptions-test",
                "name": "Variant test product",
                "fulfillmentType": "digital_activation",
                "variantLabel": "Срок",
                "variants": [
                    {"id": "one-month", "label": "1 месяц", "price": 100, "active": True},
                    {"id": "three-months", "label": "3 месяца", "price": 240, "active": True},
                ],
            },
        )
        assert product.status_code == 201
        product_data = product.json()
        product_id = product_data["id"]
        assert product_data["categoryId"] == "subscriptions-test"
        assert len(product_data["images"]) == 2
        assert product_data["variants"][1]["price"] == 240

        missing_variant = client.post(
            "/api/orders",
            headers=student_headers,
            json={
                "productId": product_id,
                "quantity": 1,
                "customerName": "Aisha Karimova",
                "requestId": "variant-test-missing",
            },
        )
        assert missing_variant.status_code == 422

        purchase_payload = {
            "productId": product_id,
            "variantId": "three-months",
            "quantity": 1,
            "customerName": "Aisha Karimova",
            "requestId": "variant-test-purchase",
        }
        purchase = client.post(
            "/api/orders",
            headers=student_headers,
            json=purchase_payload,
        )
        assert purchase.status_code == 201
        assert purchase.json()["order"]["items"][0]["variant"]["id"] == "three-months"
        assert purchase.json()["order"]["totalPrice"] == 216
        duplicate = client.post(
            "/api/orders",
            headers=student_headers,
            json=purchase_payload,
        )
        assert duplicate.status_code == 201
        assert duplicate.json()["order"]["id"] == purchase.json()["order"]["id"]

        bootstrap = client.get("/api/admin/bootstrap", headers=admin_headers).json()
        assert any(item["id"] == "subscriptions-test" for item in bootstrap["categories"])
        assert client.patch(
            "/api/categories/subscriptions-test",
            headers=admin_headers,
            json={"active": False},
        ).json()["active"] is False
        assert all(item["id"] != "subscriptions-test" for item in client.get("/api/categories").json())

        order_id = purchase.json()["order"]["id"]
        assert client.delete(f"/api/orders/{order_id}", headers=admin_headers).status_code == 204
        assert client.delete(f"/api/products/{product_id}", headers=admin_headers).status_code == 204


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
                "descKey": "products.testDesc", "name": "API Test Product", "type": "physical",
                "fulfillmentType": "physical_pickup", "stock": 2,
            })
            assert product_create.status_code == 201
            assert product_create.json()["fulfillmentType"] == "physical_pickup"
            assert product_create.json()["active"] is True
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
            student_id_login = client.post("/api/auth/login", json={"studentId": "2023114", "password": "demo"})
            assert student_id_login.status_code == 200
            assert student_id_login.json()["user"]["studentId"] == "2023114"
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
            assert created_order["fulfillmentType"] == "digital_activation"
            assert created_order["statusFlow"] == ["paid", "activating", "connected"]
            assert created_order["nextStatus"] == "activating"
            assert "pickupCode" not in created_order
            assert "pickupSlot" not in created_order
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
            invalid_status = client.patch(
                f"/api/orders/{order_id}/status",
                headers=admin_headers,
                json={"status": "ready"},
            )
            assert invalid_status.status_code == 409
            status_update = client.patch(
                f"/api/orders/{order_id}/status",
                headers=admin_headers,
                json={"status": "activating"},
            )
            assert status_update.json()["status"] == "activating"
            assert status_update.json()["nextStatus"] == "connected"
            completed = client.patch(
                f"/api/orders/{order_id}/status",
                headers=admin_headers,
                json={"status": "connected"},
            )
            assert completed.json()["status"] == "connected"
            assert "nextStatus" not in completed.json()
            assert client.delete(f"/api/orders/{order_id}", headers=admin_headers).status_code == 204

            physical_before = client.get("/api/products/student-sticker-pack").json()["stock"]
            physical_payload = {
                "productId": "student-sticker-pack", "quantity": 1,
                "customerName": "Aisha Karimova", "customerPhone": "+998 90 123 45 67",
                "deliveryAddress": "MSI Campus · Lobby", "deliveryMethod": "pickup",
                "pickupSlot": "16:00–17:00 · MSI Campus · Lobby",
                "requestId": "api-test-physical-purchase-1",
            }
            physical = client.post("/api/orders", headers=student_headers, json=physical_payload)
            assert physical.status_code == 201
            assert physical.json()["order"]["fulfillmentType"] == "physical_pickup"
            assert physical.json()["order"]["pickupCode"].startswith("K-")
            assert physical.json()["order"]["nextStatus"] == "packed"
            assert client.get("/api/products/student-sticker-pack").json()["stock"] == physical_before - 1
            duplicate_physical = client.post("/api/orders", headers=student_headers, json=physical_payload)
            assert duplicate_physical.status_code == 201
            assert client.get("/api/products/student-sticker-pack").json()["stock"] == physical_before - 1
            physical_id = physical.json()["order"]["id"]
            assert client.patch(
                f"/api/orders/{physical_id}/status",
                headers=admin_headers,
                json={"status": "packed"},
            ).json()["nextStatus"] == "ready"
            assert client.delete(f"/api/orders/{physical_id}", headers=admin_headers).status_code == 204

            inactive_product = client.post("/api/products", headers=admin_headers, json={
                "image": "./images/course.svg", "price": 5, "name": "Inactive link",
                "type": "digital", "fulfillmentType": "digital_delivery", "active": False,
            })
            assert inactive_product.status_code == 201
            inactive_id = inactive_product.json()["id"]
            assert all(item["id"] != inactive_id for item in client.get("/api/products").json())
            unavailable = client.post("/api/orders", headers=student_headers, json={
                "productId": inactive_id, "quantity": 1, "customerName": "Aisha Karimova",
                "requestId": "api-test-inactive-purchase",
            })
            assert unavailable.status_code == 409
            assert client.delete(f"/api/products/{inactive_id}", headers=admin_headers).status_code == 204

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
        engine.dispose()
