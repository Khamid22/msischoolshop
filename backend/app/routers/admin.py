import secrets
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..balance_changes import change_balance as apply_balance_change
from ..coin_ledger import user_balances
from ..sales_analytics import SalesAnalytics, SalesRange, sales_analytics
from ..config import ADMIN_PASSWORD
from ..database import get_db
from ..models import Banner, CatalogCategory, GrantLog, News, Notification, Order, Product, User
from ..schemas import (
    AdminLogin,
    AdminSsoLogin,
    BalanceChange,
    BannerCreate,
    BulkSync,
    NewsCreate,
    ProductCreate,
)
from ..security import (
    create_token,
    hash_password,
    require_admin,
    verify_lms_admin_assertion,
)
from ..serializers import (
    banner_to_dict,
    category_to_dict,
    grant_to_dict,
    news_to_dict,
    notification_to_dict,
    order_to_dict,
    product_to_dict,
    user_to_dict,
)
from .catalog import (
    BANNER_FIELDS,
    PRODUCT_FIELDS,
    apply_fields,
    normalize_product_fulfillment,
)


router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/login")
def login(data: AdminLogin) -> dict:
    if not secrets.compare_digest(data.password, ADMIN_PASSWORD):
        raise HTTPException(status_code=401, detail="Invalid admin password")
    return {"token": create_token("admin", "admin")}


@router.post("/sso")
def sso_login(data: AdminSsoLogin) -> dict:
    claims = verify_lms_admin_assertion(data.assertion)
    return {"token": create_token(f"lms:{claims['sub']}", "admin")}


@router.get("/me")
def me(_: dict = Depends(require_admin)) -> dict:
    return {"authenticated": True, "role": "admin"}


@router.get("/users", dependencies=[Depends(require_admin)])
def list_users(database: Session = Depends(get_db)) -> list[dict]:
    users = database.scalars(select(User).order_by(User.name, User.id)).all()
    balances = user_balances(database, list(users))
    return [{**user_to_dict(user), "balance": balances.get(user.id, user.balance)} for user in users]


@router.get("/grants", dependencies=[Depends(require_admin)])
def list_grants(database: Session = Depends(get_db)) -> list[dict]:
    grants = database.scalars(select(GrantLog).order_by(GrantLog.created_at.desc())).all()
    return [grant_to_dict(grant) for grant in grants]


@router.post("/users/{user_id}/balance")
def change_balance(
    user_id: str, data: BalanceChange, claims: dict = Depends(require_admin), database: Session = Depends(get_db),
) -> dict:
    return apply_balance_change(database, user_id, data, str(claims["sub"]))


@router.get("/analytics", dependencies=[Depends(require_admin)], response_model=SalesAnalytics)
def analytics(range: SalesRange = "all", database: Session = Depends(get_db)) -> SalesAnalytics:
    return sales_analytics(list(database.scalars(select(Order)).all()), range)


@router.post("/users/reset-balances", dependencies=[Depends(require_admin)])
def reset_balances(database: Session = Depends(get_db)) -> dict:
    users = database.scalars(select(User).where(User.balance > 0)).all()
    now = datetime.now(timezone.utc).isoformat()
    total = 0
    for user in users:
        amount = user.balance
        total += amount
        user.balance = 0
        database.add_all([
            Notification(
                id=f"notif-{uuid4().hex}", user_id=user.id, notification_type="spend", amount=amount,
                note="Balance reset", created_at=now, read=False,
            ),
            GrantLog(
                id=f"grant-{uuid4().hex}", admin="Administrator", user_name=user.name,
                user_email=user.email, amount=-amount, operation_type="writeoff", created_at=now,
            ),
        ])
    database.commit()
    return {"users": len(users), "amount": total}


@router.get("/bootstrap", dependencies=[Depends(require_admin)])
def bootstrap(database: Session = Depends(get_db)) -> dict:
    return {
        "products": [product_to_dict(item) for item in database.scalars(select(Product).order_by(Product.position)).all()],
        "categories": [category_to_dict(item) for item in database.scalars(select(CatalogCategory).order_by(CatalogCategory.position)).all()],
        "banners": [banner_to_dict(item) for item in database.scalars(select(Banner).order_by(Banner.position)).all()],
        "news": [news_to_dict(item) for item in database.scalars(select(News).order_by(News.position)).all()],
        "orders": [order_to_dict(item) for item in database.scalars(select(Order).order_by(Order.created_at.desc())).all()],
        "users": list_users(database),
        "notifications": [notification_to_dict(item) for item in database.scalars(select(Notification).order_by(Notification.created_at)).all()],
        "grants": [grant_to_dict(item) for item in database.scalars(select(GrantLog).order_by(GrantLog.created_at)).all()],
    }


def sync_products(database: Session, items: list[dict]) -> None:
    database.execute(delete(Product))
    for position, raw in enumerate(items):
        data = ProductCreate.model_validate(raw)
        product = Product(id=str(raw.get("id") or f"product-{uuid4().hex[:12]}"), position=position, image="", price=0)
        fields = data.model_dump()
        apply_fields(product, fields, PRODUCT_FIELDS)
        normalize_product_fulfillment(product, set(fields))
        database.add(product)


def sync_banners(database: Session, items: list[dict]) -> None:
    database.execute(delete(Banner))
    for position, raw in enumerate(items):
        data = BannerCreate.model_validate(raw)
        banner = Banner(id=str(raw.get("id") or f"banner-{uuid4().hex[:12]}"), position=position)
        apply_fields(banner, data.model_dump(), BANNER_FIELDS)
        database.add(banner)


def sync_news(database: Session, items: list[dict]) -> None:
    database.execute(delete(News))
    for position, raw in enumerate(items):
        data = NewsCreate.model_validate(raw)
        database.add(News(
            id=str(raw.get("id") or f"news-{uuid4().hex[:12]}"), position=position,
            title=data.title, description=data.description, image=data.image,
            date=data.date or datetime.now(timezone.utc).isoformat(), active=data.active,
        ))


def sync_orders(database: Session, items: list[dict]) -> None:
    database.execute(delete(Order))
    for raw in items:
        database.add(Order(
            id=str(raw.get("id") or uuid4()), items=raw.get("items") or [],
            total_price=int(raw.get("totalPrice") or 0), original_price=raw.get("originalPrice"),
            customer_name=str(raw.get("customerName") or ""), customer_phone=str(raw.get("customerPhone") or ""),
            delivery_address=str(raw.get("deliveryAddress") or ""), delivery_method=str(raw.get("deliveryMethod") or "pickup"),
            created_at=str(raw.get("createdAt") or datetime.now(timezone.utc).isoformat()), user_id=raw.get("userId"),
            customer_email=raw.get("customerEmail"), status=str(raw.get("status") or "paid"),
            pickup_code=raw.get("pickupCode"), pickup_slot=raw.get("pickupSlot"),
        ))


def sync_users(database: Session, items: list[dict]) -> None:
    existing = {user.id: user for user in database.scalars(select(User)).all()}
    incoming_ids: set[str] = set()
    for raw in items:
        user_id = str(raw.get("id") or f"student-{uuid4().hex[:12]}")
        incoming_ids.add(user_id)
        user = existing.get(user_id)
        if user is None:
            user = User(id=user_id, email=str(raw.get("email") or f"{user_id}@local.invalid"), name="", password_hash=hash_password(secrets.token_urlsafe(24)))
            database.add(user)
        user.telegram_id = raw.get("telegramId")
        user.name = str(raw.get("name") or "")
        user.email = str(raw.get("email") or user.email).lower()
        user.phone = str(raw.get("phone") or "")
        user.address = str(raw.get("address") or "")
        user.avatar = raw.get("avatar")
        user.balance = int(raw.get("balance") or 0)
        user.group_name = raw.get("group")
        user.student_id = raw.get("studentId")
        user.discount = float(raw.get("discount") or 0)
        user.earned = int(raw.get("earned") or 0)
    for user_id, user in existing.items():
        if user_id not in incoming_ids:
            database.delete(user)


def sync_notifications(database: Session, items: list[dict]) -> None:
    database.execute(delete(Notification))
    for raw in items:
        database.add(Notification(
            id=str(raw.get("id") or f"notif-{uuid4().hex}"), user_id=str(raw.get("userId") or ""),
            notification_type=str(raw.get("type") or "welcome"), amount=int(raw.get("amount") or 0),
            note=raw.get("note"), created_at=str(raw.get("createdAt") or datetime.now(timezone.utc).isoformat()),
            read=bool(raw.get("read", False)),
        ))


def sync_grants(database: Session, items: list[dict]) -> None:
    database.execute(delete(GrantLog))
    for raw in items:
        database.add(GrantLog(
            id=str(raw.get("id") or f"grant-{uuid4().hex}"), admin=str(raw.get("admin") or "Administrator"),
            user_name=str(raw.get("userName") or ""), user_email=raw.get("userEmail"),
            amount=int(raw.get("amount") or 0), operation_type=raw.get("type"),
            created_at=str(raw.get("createdAt") or datetime.now(timezone.utc).isoformat()),
        ))


SYNC_HANDLERS = {
    "products": sync_products,
    "banners": sync_banners,
    "news": sync_news,
    "orders": sync_orders,
    "users": sync_users,
    "notifications": sync_notifications,
    "grants": sync_grants,
}


@router.put("/sync/{resource}", dependencies=[Depends(require_admin)])
def sync_resource(resource: str, data: BulkSync, database: Session = Depends(get_db)) -> dict:
    handler = SYNC_HANDLERS.get(resource)
    if handler is None:
        raise HTTPException(status_code=404, detail="Unknown admin resource")
    handler(database, data.items)
    database.commit()
    return {"resource": resource, "count": len(data.items)}
