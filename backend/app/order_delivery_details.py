"""Buyer-owned answers and fulfillment gates for digital product instructions."""

from copy import deepcopy
from datetime import datetime, timezone
from typing import Literal, TypedDict

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .delivery_forms import (
    ROBUX_PLAYER_ID, ROBUX_PRODUCT_ID, missing_required_fields,
    product_delivery_form, snapshot_delivery_form, validate_answers,
)
from .models import Order, Product
from .order_fulfillment import fulfillment_type_from_order, status_for_fulfillment


class DeliveryRequirement(TypedDict):
    itemIndex: int
    kind: Literal["roblox_player_id", "custom"]
    form: dict
    answers: dict[str, str | bool]
    missingRequiredFields: list[str]
    playerId: str | None
    submittedAt: str | None
    editable: bool


def product_delivery_requirement(product: Product) -> str | None:
    form = product_delivery_form(product) or {}
    return ROBUX_PLAYER_ID if product.id == ROBUX_PRODUCT_ID and any(
        field["id"] == "playerId" for field in form.get("fields", [])
    ) else None


def delivery_requirements(order: Order) -> list[DeliveryRequirement]:
    status = status_for_fulfillment(fulfillment_type_from_order(order), order.status)
    requirements: list[DeliveryRequirement] = []
    for index, item in enumerate(order.items or []):
        product = item.get("product") or {}
        form = snapshot_delivery_form(product)
        if not form or not (form.get("fields") or form.get("links") or form.get("instructions")):
            continue
        details = item.get("deliveryDetails") or {}
        answers = dict(details.get("answers") or {})
        if "playerId" not in answers and details.get("playerId"):
            answers["playerId"] = details["playerId"]
        requirements.append({
            "itemIndex": index,
            "kind": ROBUX_PLAYER_ID if product.get("id") == ROBUX_PRODUCT_ID else "custom",
            "form": form,
            "answers": answers,
            "missingRequiredFields": missing_required_fields(form, answers),
            "playerId": answers.get("playerId") if isinstance(answers.get("playerId"), str) else None,
            "submittedAt": details.get("submittedAt"),
            "editable": status == "paid",
        })
    return requirements


def information_required(order: Order) -> bool:
    return any(item["editable"] and item["missingRequiredFields"] for item in delivery_requirements(order))


def save_delivery_details(
    database: Session, *, order_id: str, user_id: str, item_index: int,
    answers: dict[str, str | bool],
) -> Order:
    order = database.scalar(
        select(Order).where(Order.id == order_id, Order.user_id == user_id).with_for_update()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    requirement = next(
        (item for item in delivery_requirements(order) if item["itemIndex"] == item_index), None,
    )
    if requirement is None or not requirement["form"].get("fields"):
        raise HTTPException(status_code=409, detail="This item does not request delivery details")
    try:
        values = validate_answers(requirement["form"], answers)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from None
    if requirement["answers"] == values:
        return order
    if not requirement["editable"]:
        raise HTTPException(status_code=409, detail="Delivery has started. Contact MSI staff to correct the details.")

    items = deepcopy(order.items)
    details = {
        "answers": values,
        "submittedAt": datetime.now(timezone.utc).isoformat(),
        "submittedBy": user_id,
        **({"playerId": values["playerId"]} if isinstance(values.get("playerId"), str) else {}),
    }
    item = items[item_index]
    item["deliveryDetails"] = details
    item.setdefault("deliveryDetailsHistory", []).append(deepcopy(details))
    order.items = items
    database.commit()
    return order


def pending_information_notifications(database: Session, user_id: str) -> list[dict]:
    orders = database.scalars(
        select(Order).where(Order.user_id == user_id, Order.status == "paid")
        .order_by(Order.created_at.desc())
    ).all()
    return [
        {
            "id": f"order-information:{order.id}", "userId": user_id,
            "type": "information_required", "amount": 0, "orderId": order.id,
            "note": (order.items[0].get("product") or {}).get("name") or "",
            "createdAt": order.created_at, "read": False,
        }
        for order in orders if information_required(order)
    ]
