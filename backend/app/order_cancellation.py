"""Reject an unfulfilled purchase and refund it in the same transaction."""

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .coin_ledger import change_coins
from .models import Notification, Order, Product, User
from .order_fulfillment import can_cancel_order


def restore_stock(database: Session, order: Order) -> None:
    # Only restore stock that was actually limited at checkout. A later catalogue
    # edit must not turn an unlimited purchase into newly available inventory.
    for item in sorted(order.items, key=lambda item: item["product"]["id"]):
        snapshot = item["product"]
        variant = item.get("variant") or {}
        variant_stock = variant.get("stock") is not None
        if not variant_stock and snapshot.get("stock") is None:
            continue
        product = database.scalar(select(Product).where(Product.id == snapshot["id"]).with_for_update())
        if product is None:
            continue
        if variant_stock:
            product.variants = [
                {**value, "stock": int(value["stock"]) + item["quantity"]}
                if value.get("id") == variant.get("id") and value.get("stock") is not None else value
                for value in product.variants or []
            ]
        elif product.stock is not None:
            product.stock += item["quantity"]


def cancel_order(database: Session, order_id: str, actor: str) -> Order:
    order = database.scalar(select(Order).where(Order.id == order_id).with_for_update())
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    # The locked order is the durable idempotency record, including when a client
    # retries after losing the successful response or two admins act together.
    if order.status == "cancelled":
        return order
    if not can_cancel_order(order):
        raise HTTPException(status_code=409, detail="Only unfulfilled orders with a linked buyer can be cancelled")
    user = database.scalar(select(User).where(User.id == order.user_id).with_for_update())
    if user is None:
        raise HTTPException(status_code=409, detail="Order buyer no longer exists")
    restore_stock(database, order)
    change_coins(database, user, order.total_price, source=f"shop:refund:{order.id}",
                 note=f"Order {order.id} cancelled by {actor}")
    order.status = "cancelled"
    database.add(Notification(
        id=f"notif-{uuid4().hex}", user_id=user.id, notification_type="refund",
        amount=order.total_price, note=None,
        created_at=datetime.now(timezone.utc).isoformat(), read=False,
    ))
    database.commit()
    return order
