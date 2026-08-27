"""Authoritative fulfillment paths for MSI Shop products and orders."""

from __future__ import annotations

from typing import Any, Literal


FulfillmentType = Literal[
    "physical_pickup",
    "digital_activation",
    "digital_delivery",
]
OrderStatus = Literal[
    "paid",
    "packed",
    "ready",
    "collected",
    "activating",
    "connected",
    "sent",
    "received",
]

FULFILLMENT_FLOWS: dict[FulfillmentType, tuple[OrderStatus, ...]] = {
    "physical_pickup": ("paid", "packed", "ready", "collected"),
    "digital_activation": ("paid", "activating", "connected"),
    "digital_delivery": ("paid", "sent", "received"),
}


def default_fulfillment_type(
    product_type: str | None,
    download_url: str | None = None,
) -> FulfillmentType:
    if product_type == "physical":
        return "physical_pickup"
    if download_url:
        return "digital_delivery"
    return "digital_activation"


def normalize_fulfillment_type(
    fulfillment_type: str | None,
    *,
    product_type: str | None,
    download_url: str | None = None,
) -> FulfillmentType:
    if fulfillment_type in FULFILLMENT_FLOWS:
        return fulfillment_type  # type: ignore[return-value]
    return default_fulfillment_type(product_type, download_url)


def fulfillment_type_from_product(product: Any) -> FulfillmentType:
    return normalize_fulfillment_type(
        getattr(product, "fulfillment_type", None),
        product_type=getattr(product, "product_type", None),
        download_url=getattr(product, "download_url", None),
    )


def fulfillment_type_from_items(items: list[dict[str, Any]] | None) -> FulfillmentType:
    product = ((items or [{}])[0].get("product") or {})
    return normalize_fulfillment_type(
        product.get("fulfillmentType"),
        product_type=product.get("type"),
        download_url=product.get("downloadUrl"),
    )


def fulfillment_type_from_order(order: Any) -> FulfillmentType:
    items = getattr(order, "items", None) or []
    product = ((items or [{}])[0].get("product") or {})
    fulfillment_type = fulfillment_type_from_items(items)
    has_product_fulfillment = bool(
        product.get("fulfillmentType") or product.get("type")
    )
    if (
        not has_product_fulfillment
        and fulfillment_type != "physical_pickup"
        and getattr(order, "delivery_method", None) == "pickup"
        and (
            getattr(order, "pickup_code", None)
            or getattr(order, "status", None) in {"packed", "ready", "collected"}
        )
    ):
        return "physical_pickup"
    return fulfillment_type


def status_for_fulfillment(
    fulfillment_type: FulfillmentType,
    current_status: str,
) -> OrderStatus:
    """Translate legacy pickup statuses when the product is explicitly digital."""
    flow = flow_for_fulfillment(fulfillment_type)
    if current_status in flow:
        return current_status  # type: ignore[return-value]
    if fulfillment_type == "digital_activation":
        return "connected" if current_status == "collected" else "activating"
    if fulfillment_type == "digital_delivery":
        return "received" if current_status == "collected" else "sent"
    return "paid"


def flow_for_fulfillment(fulfillment_type: FulfillmentType) -> tuple[OrderStatus, ...]:
    return FULFILLMENT_FLOWS[fulfillment_type]


def next_status(
    fulfillment_type: FulfillmentType,
    current_status: str,
) -> OrderStatus | None:
    flow = flow_for_fulfillment(fulfillment_type)
    try:
        current_index = flow.index(current_status)  # type: ignore[arg-type]
    except ValueError:
        return None
    if current_index >= len(flow) - 1:
        return None
    return flow[current_index + 1]


def is_allowed_transition(
    fulfillment_type: FulfillmentType,
    current_status: str,
    requested_status: str,
) -> bool:
    return requested_status == current_status or requested_status == next_status(
        fulfillment_type,
        current_status,
    )


__all__ = [
    "FULFILLMENT_FLOWS",
    "FulfillmentType",
    "OrderStatus",
    "default_fulfillment_type",
    "flow_for_fulfillment",
    "fulfillment_type_from_items",
    "fulfillment_type_from_order",
    "fulfillment_type_from_product",
    "is_allowed_transition",
    "next_status",
    "normalize_fulfillment_type",
    "status_for_fulfillment",
]
