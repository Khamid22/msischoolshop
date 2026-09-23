from copy import deepcopy

import pytest

from app.delivery_forms import ROBLOX_PROFILE_URL
from app.models import Order, Product, User
from test_order_delivery_details import headers, purchase, shop  # noqa: F401


FORM = {
    "instructions": "Open the profile, then provide your account details.",
    "links": [{"label": "Open profile", "url": "https://example.test/invite?code=private-invite"}],
    "fields": [
        {"id": "nickname", "label": "Game nickname", "type": "text", "required": True, "help": "Your in-game name"},
        {"id": "email", "label": "Account email", "type": "email", "required": True, "help": ""},
        {"id": "confirmed", "label": "Request sent", "type": "checkbox", "required": True, "help": ""},
        {"id": "note", "label": "Optional note", "type": "text", "required": False, "help": ""},
    ],
}
ANSWERS = {"nickname": "Player One", "email": "player@example.test", "confirmed": True}


def configure(client, form=FORM):
    response = client.patch("/api/products/manual-digital", headers=headers("staff", "admin"), json={"deliveryForm": form})
    assert response.status_code == 200, response.json()
    return response.json()


def save(client, answers=ANSWERS, *, buyer="buyer-a", order="custom-order"):
    return client.put(f"/api/orders/{order}/delivery-details", headers=headers(buyer), json={"itemIndex": 0, "answers": answers})


def test_custom_form_is_admin_configurable_and_private_until_purchase(shop):
    client, _ = shop
    assert client.patch("/api/products/manual-digital", json={"deliveryForm": FORM}).status_code == 401
    assert client.patch("/api/products/manual-digital", headers=headers(), json={"deliveryForm": FORM}).status_code == 403
    assert configure(client)["deliveryForm"] == FORM
    for path in ["/api/products", "/api/products/manual-digital", "/api/student-picks"]:
        response = client.get(path)
        assert response.status_code == 200
        assert "private-invite" not in response.text and '"deliveryForm"' not in response.text
    result = purchase(client, product="manual-digital", request_id="custom-order")
    assert "private-invite" not in client.get("/api/student-picks").text
    assert result["order"]["informationRequired"] is True
    assert result["order"]["deliveryRequirements"][0]["form"] == FORM
    assert save(client, buyer="buyer-b").status_code == 404
    assert client.patch("/api/orders/custom-order/status", headers=headers("staff", "admin"), json={"status": "sent"}).status_code == 409
    assert save(client).json()["informationRequired"] is False


def test_form_snapshot_survives_configuration_changes_and_product_deletion(shop):
    client, sessions = shop
    configure(client)
    purchase(client, product="manual-digital", request_id="custom-order")
    changed = {**FORM, "instructions": "New instructions", "fields": [*FORM["fields"],
               {"id": "newField", "label": "New required field", "type": "text", "required": True, "help": ""}]}
    configure(client, changed)
    new = purchase(client, product="manual-digital", request_id="next-order")["order"]
    assert new["deliveryRequirements"][0]["form"] == changed
    assert save(client, order="next-order").status_code == 422
    with sessions() as database, database.begin():
        database.delete(database.get(Product, "manual-digital"))
    saved = save(client)
    assert saved.status_code == 200
    assert saved.json()["deliveryRequirements"][0]["form"] == FORM
    for _ in range(2):
        assert save(client).status_code == 200
    with sessions() as database:
        order = database.get(Order, "custom-order")
        assert len(order.items[0]["deliveryDetailsHistory"]) == 1
        assert database.get(User, "buyer-a").balance == 1980
    assert client.patch("/api/orders/custom-order/status", headers=headers("staff", "admin"), json={"status": "sent"}).status_code == 200
    assert save(client, {**ANSWERS, "nickname": "Changed"}).status_code == 409
    assert save(client).status_code == 200


@pytest.mark.parametrize("answers", [
    {}, {**ANSWERS, "nickname": "   "}, {**ANSWERS, "email": "invalid"}, {**ANSWERS, "confirmed": False},
    {**ANSWERS, "confirmed": "true"}, {**ANSWERS, "unknown": "value"}, {**ANSWERS, "note": "x" * 1001},
])
def test_invalid_answers_never_release_fulfillment_or_create_an_audit(shop, answers):
    client, sessions = shop
    configure(client)
    purchase(client, product="manual-digital", request_id="custom-order")
    assert save(client, answers).status_code == 422
    with sessions() as database:
        assert "deliveryDetails" not in database.get(Order, "custom-order").items[0]
    assert client.get("/api/orders", headers=headers()).json()[0]["informationRequired"] is True


@pytest.mark.parametrize("url", ["javascript:alert(1)", "data:text/html,hello", "//example.test", "https://user:password@example.test", "https://example.test/ bad"])
def test_unsafe_links_are_rejected_in_the_configuration(shop, url):
    client, _ = shop
    form = {**FORM, "links": [{"label": "Unsafe", "url": url}]}
    assert client.patch("/api/products/manual-digital", headers=headers("staff", "admin"), json={"deliveryForm": form}).status_code == 422


def test_no_calendar_fields_duplicate_ids_or_forms_on_physical_products(shop):
    client, _ = shop
    for fields in [[{**FORM["fields"][0], "type": "date"}], [FORM["fields"][0], FORM["fields"][0]]]:
        assert client.patch("/api/products/manual-digital", headers=headers("staff", "admin"), json={"deliveryForm": {**FORM, "fields": fields}}).status_code == 422
    assert client.patch("/api/products/manual-digital", headers=headers("staff", "admin"), json={"fulfillmentType": "physical_pickup", "deliveryForm": FORM}).status_code == 422


def test_links_only_and_explicitly_disabled_forms_do_not_block_delivery(shop):
    client, _ = shop
    configure(client, {**FORM, "fields": []})
    result = purchase(client, product="manual-digital", request_id="custom-order")["order"]
    assert result["informationRequired"] is False and result["nextStatus"] == "sent"
    assert result["deliveryRequirements"][0]["form"]["links"] == FORM["links"]
    assert save(client, {}).status_code == 409
    configure(client, {"fields": [], "links": [], "instructions": ""})
    assert purchase(client, product="manual-digital", request_id="disabled-form")["order"]["deliveryRequirements"] == []


def test_robux_profile_and_confirmation_apply_to_new_and_historical_orders(shop):
    client, sessions = shop
    result = purchase(client)["order"]
    requirement = result["deliveryRequirements"][0]
    assert requirement["form"]["links"][0]["url"] == ROBLOX_PROFILE_URL
    assert requirement["missingRequiredFields"] == ["playerId", "friendRequestSent"]
    assert save(client, {"playerId": "123"}, order=result["id"]).status_code == 422
    with sessions() as database, database.begin():
        order = database.get(Order, result["id"])
        items = deepcopy(order.items)
        del items[0]["product"]["deliveryForm"]
        items[0]["deliveryDetails"] = {"playerId": "123", "submittedAt": "2026-09-20T12:00:00+00:00"}
        order.items = items
    old = client.get("/api/orders", headers=headers()).json()[0]
    assert old["deliveryRequirements"][0]["answers"] == {"playerId": "123"}
    assert old["deliveryRequirements"][0]["missingRequiredFields"] == ["friendRequestSent"]
    with sessions() as database, database.begin():
        database.get(Order, result["id"]).status = "received"
    completed = client.get("/api/orders", headers=headers()).json()[0]
    assert completed["informationRequired"] is False
    assert completed["deliveryRequirements"][0]["form"]["links"][0]["url"] == ROBLOX_PROFILE_URL
    assert completed["deliveryRequirements"][0]["editable"] is False


def test_legacy_single_player_id_payload_remains_supported_for_single_field_forms(shop):
    client, _ = shop
    configure(client, {"fields": [{"id": "playerId", "label": "Player ID", "type": "player_id"}]})
    purchase(client, product="manual-digital", request_id="legacy-client")
    response = client.put("/api/orders/legacy-client/delivery-details", headers=headers(), json={"itemIndex": 0, "playerId": "123"})
    assert response.status_code == 200
    assert response.json()["deliveryRequirements"][0]["answers"] == {"playerId": "123"}
