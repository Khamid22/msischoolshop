"""Buyer-supplied delivery details for the existing Robux catalogue product."""

from copy import deepcopy
from datetime import datetime, timezone
from typing import Literal, TypedDict

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Order, Product
from .order_fulfillment import fulfillment_type_from_order, status_for_fulfillment


# Both 270 and 500 Robux belong to this catalogue product. Keep its identity
# stable so renamed products and historical snapshots retain the requirement.
ROBUX_PRODUCT_ID = "product-4e53e3f6ed90"
ROBUX_PLAYER_ID = "roblox_player_id"


class DeliveryRequirement(TypedDict):
    itemIndex: int
    kind: Literal["roblox_player_id"]
    playerId: str | None
    submittedAt: str | None
    editable: bool


def product_delivery_requirement(product: Product) -> str | None:
    return ROBUX_PLAYER_ID if product.id == ROBUX_PRODUCT_ID else None


def delivery_requirements(order: Order) -> list[DeliveryRequirement]:
    status = status_for_fulfillment(fulfillment_type_from_order(order), order.status)
    requirements: list[DeliveryRequirement] = []
    for index, item in enumerate(order.items or []):
        product = item.get("product") or {}
        if (
            product.get("deliveryRequirement") != ROBUX_PLAYER_ID
            and product.get("id") != ROBUX_PRODUCT_ID
        ):
            continue
        details = item.get("deliveryDetails") or {}
        requirements.append({
            "itemIndex": index,
            "kind": ROBUX_PLAYER_ID,
            "playerId": details.get("playerId"),
            "submittedAt": details.get("submittedAt"),
            "editable": status == "paid",
        })
    return requirements


def information_required(order: Order) -> bool:
    return any(item["editable"] and not item["playerId"] for item in delivery_requirements(order))


def save_player_id(
    database: Session, *, order_id: str, user_id: str, item_index: int, player_id: str,
) -> Order:
    order = database.scalar(
        select(Order).where(Order.id == order_id, Order.user_id == user_id).with_for_update()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    requirement = next(
        (item for item in delivery_requirements(order) if item["itemIndex"] == item_index), None,
    )
    if requirement is None:
        raise HTTPException(status_code=409, detail="This item does not request a Roblox Player ID")
    if requirement["playerId"] == player_id:
        return order
    if not requirement["editable"]:
        raise HTTPException(status_code=409, detail="Delivery has started. Contact MSI staff to correct the Player ID.")

    items = deepcopy(order.items)
    details = {
        "playerId": player_id,
        "submittedAt": datetime.now(timezone.utc).isoformat(),
        "submittedBy": user_id,
    }
    item = items[item_index]
    item["deliveryDetails"] = details
    item.setdefault("deliveryDetailsHistory", []).append(details.copy())
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
            "note": "Robux", "createdAt": order.created_at, "read": False,
        }
        for order in orders if information_required(order)
    ]
