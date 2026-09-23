"""Sales projections for the shop administration dashboard."""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel

from .models import Order

SHOP_TIMEZONE = ZoneInfo("Asia/Tashkent")
SalesRange = Literal["7", "30", "all"]


class SalesPoint(BaseModel):
    label: str
    amount: int


class SalesAnalytics(BaseModel):
    totalCoins: int
    orderCount: int
    averageOrder: int
    unitsSold: int
    products: list[SalesPoint]
    periods: list[SalesPoint]


def sales_analytics(orders: list[Order], range: SalesRange, now: datetime | None = None) -> SalesAnalytics:
    today = (now or datetime.now(SHOP_TIMEZONE)).astimezone(SHOP_TIMEZONE).date()
    start = today - timedelta(days=int(range) - 1) if range != "all" else None
    periods: dict[str, int] = defaultdict(int)
    if start:
        for day in range_days(start, today):
            periods[day] = 0
    products: dict[str, int] = defaultdict(int)
    total = count = units = 0
    for order in orders:
        try:
            date = datetime.fromisoformat(order.created_at.replace("Z", "+00:00"))
            date = date.replace(tzinfo=SHOP_TIMEZONE) if date.tzinfo is None else date
            day = date.astimezone(SHOP_TIMEZONE).date()
        except ValueError:
            continue
        if day > today or (start and day < start):
            continue
        total += order.total_price
        count += 1
        periods[day.isoformat() if start else day.strftime("%Y-%m")] += order.total_price
        items = order.items or []
        quantities = [max(0, int(item.get("quantity", 0))) for item in items]
        units += sum(quantities)
        # Allocate the paid total, including discounts, without losing a coin to rounding.
        weights = [quantity * max(0, int((item.get("variant") or item.get("product") or {}).get("price", 0)))
                   for item, quantity in zip(items, quantities)]
        if not sum(weights):
            weights = quantities
        remaining = order.total_price
        for index, item in enumerate(items):
            amount = remaining if index == len(items) - 1 else order.total_price * weights[index] // max(1, sum(weights))
            remaining -= amount
            product = item.get("product") or {}
            products[product.get("name") or product.get("nameKey") or "Товар"] += amount
    return SalesAnalytics(
        totalCoins=total, orderCount=count, averageOrder=(total * 2 + count) // (2 * count) if count else 0,
        unitsSold=units,
        products=[SalesPoint(label=label, amount=amount) for label, amount in sorted(products.items(), key=lambda item: -item[1])],
        periods=[SalesPoint(label=label, amount=amount) for label, amount in sorted(periods.items())],
    )


def range_days(start, end):
    while start <= end:
        yield start.isoformat()
        start += timedelta(days=1)
