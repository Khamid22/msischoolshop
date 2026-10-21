"""Uploaded images are served once by digest instead of inline in every response."""

import base64
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from app.database import SessionLocal
from app.main import app
from app.media import externalize_inline_images
from app.models import Banner, MediaFile, News, Order, Product

PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)
PNG_URL = "data:image/png;base64," + base64.b64encode(PNG).decode()
SVG_URL = "data:image/svg+xml;base64," + base64.b64encode(b'<svg xmlns="http://www.w3.org/2000/svg"/>').decode()


def admin_headers(client: TestClient) -> dict[str, str]:
    token = client.post("/api/admin/login", json={"password": "test-admin-password"}).json()["token"]
    return {"Authorization": f"Bearer {token}"}


def media_count() -> int:
    with SessionLocal() as database:
        return database.scalar(select(func.count()).select_from(MediaFile))


def test_uploaded_product_images_are_stored_once_and_cached_forever():
    with TestClient(app) as client:
        admin = admin_headers(client)
        before = media_count()
        product = client.post("/api/products", headers=admin, json={
            "name": "Media test", "price": 5, "image": PNG_URL, "images": [PNG_URL, SVG_URL],
        }).json()
        assert product["image"].startswith("/api/media/") and product["image"].endswith(".png")
        assert product["images"][0] == product["image"]
        assert product["images"][1].endswith(".svg")
        # Identical uploads share one stored file.
        assert media_count() == before + 2

        image = client.get(product["image"])
        assert image.status_code == 200
        assert image.content == PNG
        assert image.headers["content-type"] == "image/png"
        assert image.headers["cache-control"] == "public, max-age=31536000, immutable"
        assert client.get(product["image"], headers={"If-None-Match": image.headers["etag"]}).status_code == 304
        svg = client.get(product["images"][1])
        assert "sandbox" in svg.headers["content-security-policy"]
        assert client.get("/api/media/" + "0" * 64 + ".png").status_code == 404
        assert client.get("/api/media/not-a-digest").status_code == 404

        public = next(item for item in client.get("/api/products").json() if item["id"] == product["id"])
        assert not any(value.startswith("data:") for value in [public["image"], *public["images"]])

        updated = client.patch(f"/api/products/{product['id']}", headers=admin, json={"image": SVG_URL, "images": [SVG_URL]}).json()
        assert updated["image"] == product["images"][1]


def test_banner_and_news_images_are_stored_and_unknown_data_urls_stay_inline():
    with TestClient(app) as client:
        admin = admin_headers(client)
        banner = client.post("/api/banners", headers=admin, json={"title": "Media", "image": PNG_URL}).json()
        assert banner["image"].startswith("/api/media/")
        text_url = "data:text/plain;base64,aGVsbG8="
        assert client.patch(f"/api/banners/{banner['id']}", headers=admin, json={"image": text_url}).json()["image"] == text_url
        news = client.post("/api/news", headers=admin, json={"title": "Media", "description": "News", "image": PNG_URL}).json()
        assert news["image"].startswith("/api/media/")
        assert client.patch(f"/api/news/{news['id']}", headers=admin, json={"image": SVG_URL}).json()["image"].endswith(".svg")


def test_purchases_snapshot_image_urls():
    with TestClient(app) as client:
        admin = admin_headers(client)
        student = {"Authorization": "Bearer " + client.post(
            "/api/auth/login", json={"studentId": "2023114", "password": "demo"},
        ).json()["token"]}
        product = client.post("/api/products", headers=admin, json={"name": "Snapshot", "price": 1, "image": PNG_URL}).json()
        order = client.post("/api/orders", headers=student, json={
            "productId": product["id"], "quantity": 1, "customerName": "Media test", "requestId": str(uuid4()),
        })
        assert order.status_code == 201, order.text
        assert order.json()["order"]["items"][0]["product"]["image"] == product["image"]


def test_startup_moves_existing_inline_images_and_is_repeatable():
    with TestClient(app):
        suffix = uuid4().hex[:8]
        snapshot = {"id": f"legacy-{suffix}", "image": PNG_URL, "images": [PNG_URL]}
        with SessionLocal() as database:
            database.add_all([
                Product(id=f"legacy-{suffix}", position=999, price=1, name="Legacy", image=PNG_URL, images=[PNG_URL, "/images/mug.svg"]),
                Banner(id=f"legacy-{suffix}", position=999, title="Legacy", image=SVG_URL),
                News(id=f"legacy-{suffix}", position=999, title="Legacy", description="", image=PNG_URL, date="2026-01-01"),
                Order(
                    id=f"legacy-{suffix}", items=[{"product": snapshot, "quantity": 1}], total_price=1,
                    customer_name="Legacy", customer_phone="", delivery_address="", delivery_method="pickup",
                    created_at="2026-01-01T00:00:00+00:00",
                ),
            ])
            database.commit()

        assert externalize_inline_images() >= 4
        assert externalize_inline_images() == 0

        with SessionLocal() as database:
            product = database.get(Product, f"legacy-{suffix}")
            assert product.image.startswith("/api/media/")
            assert product.images == [product.image, "/images/mug.svg"]
            assert database.get(Banner, f"legacy-{suffix}").image.endswith(".svg")
            assert database.get(News, f"legacy-{suffix}").image == product.image
            order_product = database.get(Order, f"legacy-{suffix}").items[0]["product"]
            assert order_product == {**snapshot, "image": product.image, "images": [product.image]}


def test_api_reads_revalidate_and_compress():
    with TestClient(app) as client:
        first = client.get("/api/products", headers={"Accept-Encoding": "gzip"})
        assert first.headers["cache-control"] == "no-cache"
        assert first.headers["etag"].startswith('W/"')
        assert first.headers["content-encoding"] == "gzip"
        assert first.json()
        unchanged = client.get("/api/products", headers={"If-None-Match": first.headers["etag"]})
        assert unchanged.status_code == 304
        assert unchanged.content == b""

        bootstrap = client.get("/api/admin/bootstrap", headers=admin_headers(client))
        assert bootstrap.status_code == 200
        assert bootstrap.headers["cache-control"] == "private, no-cache"
