"""Reversible consolidation of existing digital products into named options."""

from copy import deepcopy

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from .catalog_pricing import price_after_discount
from .models import Product


class MergeOption(BaseModel):
    product_id: str
    expected_name: str
    expected_price: int = Field(ge=0)
    expected_discount: float = Field(default=0, ge=0, le=100)
    label: str = Field(min_length=1, max_length=100)


class MergeGroup(BaseModel):
    name: str = Field(min_length=1, max_length=300)
    primary_id: str
    options: list[MergeOption] = Field(min_length=2, max_length=30)


CHANGED_FIELDS = ("name", "name_key", "price", "discount", "variant_label", "variants", "active")


def product_state(product: Product) -> dict:
    return {field: deepcopy(getattr(product, field)) for field in CHANGED_FIELDS}


def prepare_catalog_merge(database: Session, groups: list[MergeGroup], *, lock: bool = False) -> list[dict]:
    ids = [option.product_id for group in groups for option in group.options]
    if len(ids) != len(set(ids)):
        raise ValueError("A product may occur only once in a merge plan")
    query = select(Product).where(Product.id.in_(ids)).order_by(Product.id)
    products = {product.id: product for product in database.scalars(query.with_for_update() if lock else query)}
    if set(products) != set(ids):
        raise ValueError("Some planned products no longer exist")
    changes = []
    for group in groups:
        if group.primary_id not in {option.product_id for option in group.options}:
            raise ValueError("The primary product must belong to its merge group")
        variants = [{"id": option.product_id, "label": option.label, "price": price_after_discount(
            option.expected_price, option.expected_discount), "active": True} for option in group.options]
        primary = products[group.primary_id]
        primary_after = {
            **product_state(primary), "name": group.name, "name_key": "", "price": min(option["price"] for option in variants),
            "discount": 0, "variant_label": None, "variants": variants, "active": True,
        }
        if product_state(primary) == primary_after and all(
            not products[option.product_id].active for option in group.options if option.product_id != primary.id
        ):
            continue
        for option in group.options:
            product = products[option.product_id]
            if (product.name, product.price, product.discount or 0, product.active, product.variants or []) != (
                option.expected_name, option.expected_price, option.expected_discount, True, [],
            ):
                raise ValueError(f"Product changed since the plan was prepared: {product.id}")
            if product.product_type != "digital" or product.stock is not None:
                raise ValueError("This merge supports unlimited digital products only")
            for field in ("category_id", "fulfillment_type", "download_url", "license_key", "course"):
                if getattr(product, field) != getattr(primary, field):
                    raise ValueError(f"Products have different {field}; merge would lose product details")
            before = product_state(product)
            after = primary_after if product.id == primary.id else {**before, "active": False}
            changes.append({"id": product.id, "before": before, "after": after})
    return changes


def apply_catalog_changes(database: Session, changes: list[dict], *, restore: bool = False) -> None:
    """The caller owns the transaction. Never overwrite a subsequently edited product."""
    ids = [change["id"] for change in changes]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate product IDs in backup")
    products = {product.id: product for product in database.scalars(
        select(Product).where(Product.id.in_(ids)).order_by(Product.id).with_for_update()
    )}
    expected_key, target_key = ("after", "before") if restore else ("before", "after")
    for change in changes:
        product = products.get(change["id"])
        if product is None or product_state(product) != change[expected_key]:
            raise ValueError(f"Product changed; refusing to overwrite: {change['id']}")
        if set(change[target_key]) != set(CHANGED_FIELDS):
            raise ValueError("Invalid product fields in backup")
    for change in changes:
        for field, value in change[target_key].items():
            setattr(products[change["id"]], field, deepcopy(value))
