import json
from copy import deepcopy
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.catalog_merge import MergeGroup, apply_catalog_changes, prepare_catalog_merge, product_state
from app.database import SessionLocal
from app.main import app
from app.models import Product, User


def login(client, admin=False):
    response = client.post("/api/admin/login" if admin else "/api/auth/login", json=(
        {"password": "test-admin-password"} if admin else {"studentId": "2023114", "password": "demo"}
    ))
    assert response.status_code == 200
    if not admin:
        with SessionLocal() as database, database.begin():
            user = database.get(User, response.json()["user"]["id"])
            user.balance = 10_000
            user.discount = 10
    return {"Authorization": f"Bearer {response.json()['token']}"}


def make_plan(client, headers):
    raw = json.loads((Path(__file__).parents[1] / "scripts/digital_options_20260907.json").read_text())
    for group in raw:
        for option in group["options"]:
            old_id = option["product_id"]
            response = client.post("/api/products", headers=headers, json={
                "name": option["expected_name"], "price": option["expected_price"],
                "discount": option["expected_discount"], "fulfillmentType": "digital_delivery",
                "image": "https://example.test/product.png", "categoryId": "digital",
            })
            assert response.status_code == 201
            option["product_id"] = response.json()["id"]
            if old_id == group["primary_id"]:
                group["primary_id"] = option["product_id"]
    return [MergeGroup.model_validate(group) for group in raw]


def test_merge_preserves_prices_history_and_idempotent_checkout_then_restores():
    with TestClient(app) as client:
        admin, student = login(client, True), login(client)
        groups = make_plan(client, admin)
        old_id = groups[0].options[0].product_id
        purchase = {"productId": old_id, "quantity": 1, "customerName": "Test", "requestId": str(uuid4())}
        legacy_response = client.post("/api/orders", headers=student, json=purchase)
        assert legacy_response.status_code == 201, legacy_response.json()
        old_order = legacy_response.json()["order"]
        assert old_order["totalPrice"] == 486
        with SessionLocal() as database, database.begin():
            changes = prepare_catalog_merge(database, groups, lock=True)
            before = {change["id"]: change["before"] for change in changes}
            assert len(changes) == 7
            assert all(product_state(database.get(Product, key)) == value for key, value in before.items())
            apply_catalog_changes(database, changes)
        catalog = {item["id"]: item for item in client.get("/api/products").json()}
        assert old_id not in catalog
        assert [option["price"] for option in catalog[groups[0].primary_id]["variants"]] == [540, 880]
        assert [option["price"] for option in catalog[groups[1].primary_id]["variants"]] == [1026, 1944, 3726]
        assert [option["price"] for option in catalog[groups[2].primary_id]["variants"]] == [352, 810]
        assert catalog[groups[0].primary_id]["price"] == 540
        assert catalog[groups[0].primary_id]["discount"] == 0
        assert next(order for order in client.get("/api/orders", headers=student).json() if order["id"] == old_order["id"]) == old_order
        assert client.post("/api/orders", headers=student, json={**purchase, "requestId": str(uuid4())}).status_code == 409
        selected = {**purchase, "productId": groups[0].primary_id, "variantId": groups[0].options[1].product_id, "requestId": str(uuid4())}
        ordered = client.post("/api/orders", headers=student, json=selected)
        assert ordered.status_code == 201
        assert ordered.json()["order"]["totalPrice"] == 792
        assert client.post("/api/orders", headers=student, json=selected).json() == ordered.json()
        with SessionLocal() as database, database.begin():
            assert prepare_catalog_merge(database, groups, lock=True) == []
            apply_catalog_changes(database, changes, restore=True)
        with SessionLocal() as database:
            assert all(product_state(database.get(Product, key)) == value for key, value in before.items())


def test_merge_refuses_changed_sources_and_rollback_refuses_later_edits():
    with TestClient(app) as client:
        admin = login(client, True)
        groups = make_plan(client, admin)
        with SessionLocal() as database, database.begin():
            changed = deepcopy(groups)
            changed[-1].options[-1].expected_price += 1
            with pytest.raises(ValueError, match="Product changed"):
                prepare_catalog_merge(database, changed)
            assert database.get(Product, groups[0].primary_id).name == "Robux - 500"
            changes = prepare_catalog_merge(database, groups)
            apply_catalog_changes(database, changes)
        client.patch(f"/api/products/{groups[-1].primary_id}", headers=admin, json={"name": "New edited title"})
        with SessionLocal() as database, database.begin():
            with pytest.raises(ValueError, match="refusing to overwrite"):
                apply_catalog_changes(database, changes, restore=True)
            assert database.get(Product, groups[0].primary_id).name == "Robux"
            assert database.get(Product, groups[-1].primary_id).name == "New edited title"


def test_option_edits_update_catalog_price_and_unavailable_options_cannot_be_bought():
    with TestClient(app) as client:
        admin, student = login(client, True), login(client)
        payload = {"name": "Options", "price": 9999, "fulfillmentType": "digital_delivery", "variants": [
            {"id": "large", "label": "Large", "price": 880}, {"id": "small", "label": "Small", "price": 540},
        ]}
        assert client.post("/api/products", json=payload).status_code == 401
        product = client.post("/api/products", headers=admin, json=payload).json()
        assert product["price"] == 540
        product_id = product["id"]
        updated = client.patch(f"/api/products/{product_id}", headers=admin, json={"variants": [
            {"id": "large", "label": "Renamed option", "price": 720},
        ]}).json()
        assert updated["price"] == 720
        assert client.patch(f"/api/products/{product_id}", headers=admin, json={"variants": [{"id": "bad", "label": "   ", "price": 1}]}).status_code == 422
        assert client.patch(f"/api/products/{product_id}", headers=admin, json={"variants": [{"id": "bad", "label": "Bad", "price": -1}]}).status_code == 422
        client.patch(f"/api/products/{product_id}", headers=admin, json={"variants": [
            {"id": "large", "label": "Hidden", "price": 720, "active": False},
        ]})
        for variant in ({}, {"variantId": "large"}):
            response = client.post("/api/orders", headers=student, json={
                "productId": product_id, "quantity": 1, "customerName": "Test", "requestId": str(uuid4()), **variant,
            })
            assert response.status_code == 409
