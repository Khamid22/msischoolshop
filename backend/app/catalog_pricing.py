"""Coin prices shared by checkout and catalog consolidation."""

from math import floor


def price_after_discount(price: int, discount: float | None) -> int:
    """Match storefront Math.round for non-negative coin prices."""
    return floor(price * (1 - discount / 100) + 0.5) if discount and discount > 0 else price
