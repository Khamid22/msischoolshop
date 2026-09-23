from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..coin_ledger import change_coins, current_balance
from ..database import get_db
from ..catalog_pricing import price_after_discount
from ..models import Notification, Order, Product, User
from ..order_delivery_details import information_required, save_delivery_details
from ..order_fulfillment import (
    fulfillment_type_from_order,
    fulfillment_type_from_product,
    is_allowed_transition,
    next_status,
    status_for_fulfillment,
)
from ..schemas import OrderCreate, OrderDeliveryDetailsInput, OrderStatusUpdate
from ..security import current_claims, require_admin, require_user
from ..serializers import order_to_dict, product_to_dict, user_to_dict


router = APIRouter(prefix="/api/orders", tags=["orders"])


def resolve_variant(product: Product, variant_id: str | None) -> dict | None:
    variants = [variant for variant in (product.variants or []) if variant.get("active", True)]
    if not variants:
        if product.variants:
            raise HTTPException(status_code=409, detail="Product variants are not available")
        if variant_id:
            raise HTTPException(status_code=409, detail="Product variant is not available")
        return None
    if not variant_id:
        raise HTTPException(status_code=422, detail="Choose a product variant")
    variant = next((item for item in variants if item.get("id") == variant_id), None)
    if variant is None:
        raise HTTPException(status_code=409, detail="Product variant is not available")
    return variant


@router.get("")
def list_orders(claims: dict = Depends(current_claims), database: Session = Depends(get_db)) -> list[dict]:
    query = select(Order).order_by(Order.created_at.desc())
    if claims.get("role") != "admin":
        query = query.where(Order.user_id == claims.get("sub"))
    orders = database.scalars(query).all()
    return [order_to_dict(order) for order in orders]


@router.post("", status_code=201)
def create_order(
    data: OrderCreate,
    claims: dict = Depends(require_user),
    database: Session = Depends(get_db),
) -> dict:
    user = database.scalar(
        select(User).where(User.id == claims["sub"]).with_for_update()
    )
    if user is None:
        raise HTTPException(status_code=401, detail="User no longer exists")

    if data.requestId:
        existing_order = database.get(Order, data.requestId)
        if existing_order is not None:
            if existing_order.user_id != user.id:
                raise HTTPException(status_code=409, detail="Purchase request ID is already in use")
            return {"order": order_to_dict(existing_order), "user": {**user_to_dict(user), "balance": current_balance(database, user)}}

    product = database.scalar(
        select(Product).where(Product.id == data.productId).with_for_update()
    )
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if not product.active:
        raise HTTPException(status_code=409, detail="Product is not available")
    variant = resolve_variant(product, data.variantId)
    available_stock = variant.get("stock") if variant and variant.get("stock") is not None else product.stock
    if available_stock is not None and int(available_stock) < data.quantity:
        raise HTTPException(status_code=409, detail="Not enough stock")

    product_price = int(variant["price"]) if variant else product.price
    product_price = price_after_discount(product_price, product.discount)
    original_price = product_price * data.quantity
    unit_price = product_price
    unit_price = price_after_discount(unit_price, user.discount)
    total_price = unit_price * data.quantity
    now = datetime.now(timezone.utc).isoformat()
    fulfillment_type = fulfillment_type_from_product(product)
    is_physical = fulfillment_type == "physical_pickup"
    delivery_method = data.deliveryMethod if is_physical else "digital"
    pickup_code = (
        f"K-{uuid4().int % 9000 + 1000}"
        if is_physical and delivery_method == "pickup"
        else None
    )
    order_id = data.requestId or str(uuid4())
    change_coins(database, user, -total_price, source=f"shop:order:{order_id}", note=product.name or product.name_key)
    if variant and variant.get("stock") is not None:
        product.variants = [
            {**item, "stock": int(item["stock"]) - data.quantity}
            if item.get("id") == variant.get("id")
            else item
            for item in (product.variants or [])
        ]
    elif product.stock is not None:
        product.stock -= data.quantity
    order = Order(
        id=order_id,
        items=[{
            "product": product_to_dict(product, include_delivery_form=True),
            "quantity": data.quantity,
            **({"variant": variant} if variant else {}),
        }],
        total_price=total_price, original_price=original_price, customer_name=data.customerName,
        customer_phone=data.customerPhone, delivery_address=data.deliveryAddress,
        delivery_method=delivery_method, created_at=now, user_id=user.id,
        customer_email=user.email, status="paid", pickup_code=pickup_code,
        pickup_slot=data.pickupSlot if is_physical else None,
    )
    notification = Notification(
        id=f"notif-{uuid4().hex}", user_id=user.id, notification_type="spend", amount=total_price,
        note=product.name or product.name_key, created_at=now, read=False,
    )
    database.add_all([order, notification])
    database.commit()
    return {"order": order_to_dict(order), "user": user_to_dict(user)}


@router.put("/{order_id}/delivery-details")
def update_delivery_details(
    order_id: str,
    data: OrderDeliveryDetailsInput,
    claims: dict = Depends(require_user),
    database: Session = Depends(get_db),
) -> dict:
    return order_to_dict(save_delivery_details(
        database, order_id=order_id, user_id=claims["sub"],
        item_index=data.itemIndex, answers=data.answers if data.answers is not None else {"playerId": data.playerId},
    ))


@router.patch("/{order_id}/status", dependencies=[Depends(require_admin)])
def update_order_status(order_id: str, data: OrderStatusUpdate, database: Session = Depends(get_db)) -> dict:
    order = database.scalar(select(Order).where(Order.id == order_id).with_for_update())
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    fulfillment_type = fulfillment_type_from_order(order)
    current_status = status_for_fulfillment(fulfillment_type, order.status)
    if data.status != current_status and information_required(order):
        raise HTTPException(status_code=409, detail="The student must complete the required delivery details before delivery")
    if not is_allowed_transition(fulfillment_type, current_status, data.status):
        expected = next_status(fulfillment_type, current_status)
        raise HTTPException(
            status_code=409,
            detail=(
                f"Invalid status transition. Expected {expected}."
                if expected
                else "This order is already complete."
            ),
        )
    order.status = data.status
    database.commit()
    return order_to_dict(order)


@router.delete("/{order_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_order(order_id: str, database: Session = Depends(get_db)) -> Response:
    order = database.get(Order, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    database.delete(order)
    database.commit()
    return Response(status_code=204)


@router.delete("", status_code=204, dependencies=[Depends(require_admin)])
def clear_orders(database: Session = Depends(get_db)) -> Response:
    database.execute(delete(Order))
    database.commit()
    return Response(status_code=204)
