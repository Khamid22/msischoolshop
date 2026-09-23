"""Active catalogue products ranked by all-time purchased quantity."""

from collections import Counter, defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Order, Product
from .order_fulfillment import FULFILLMENT_FLOWS


def list_student_picks(database: Session) -> list[Product]:
    products = database.scalars(
        select(Product).where(Product.active.is_(True)).order_by(Product.position, Product.id)
    ).all()
    if not products:
        return []

    product_ids = {product.id: product.id for product in products}
    variant_owners: dict[str, set[str]] = defaultdict(set)
    for product in products:
        for variant in product.variants or []:
            if variant.get("id"):
                variant_owners[variant["id"]].add(product.id)
    # Catalogue consolidation preserves former product IDs as variant IDs.
    # Current product IDs take priority; ambiguous variant IDs cannot identify a product.
    for variant_id, owners in variant_owners.items():
        if variant_id not in product_ids and len(owners) == 1:
            product_ids[variant_id] = next(iter(owners))

    paid_statuses = {status for flow in FULFILLMENT_FLOWS.values() for status in flow}
    quantities: Counter[str] = Counter()
    query = select(Order.items).where(Order.status.in_(paid_statuses)).execution_options(yield_per=200)
    # Read only item snapshots, in batches, without loading buyer profiles or serializing orders.
    for items in database.scalars(query):
        for item in items or []:
            product_id = product_ids.get((item.get("product") or {}).get("id"))
            quantity = item.get("quantity")
            if product_id and type(quantity) is int and quantity > 0:
                quantities[product_id] += quantity

    # Stable sorting keeps catalogue position/ID order for equal quantities.
    return sorted(
        (product for product in products if quantities[product.id] > 0),
        key=lambda product: -quantities[product.id],
    )
