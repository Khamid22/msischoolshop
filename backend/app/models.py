from typing import Any

from sqlalchemy import Boolean, Float, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0, index=True)
    image: Mapped[str] = mapped_column(Text, default="")
    price: Mapped[int] = mapped_column(Integer)
    name_key: Mapped[str] = mapped_column(String(200), default="")
    desc_key: Mapped[str] = mapped_column(String(200), default="")
    name: Mapped[str | None] = mapped_column(String(300), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    product_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    fulfillment_type: Mapped[str] = mapped_column(String(30), default="physical_pickup")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    carousel: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    download_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    license_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    stock: Mapped[int | None] = mapped_column(Integer, nullable=True)
    discount: Mapped[float | None] = mapped_column(Float, nullable=True)
    rating: Mapped[float | None] = mapped_column(Float, nullable=True)
    rating_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    course: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)


class Banner(Base):
    __tablename__ = "banners"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0, index=True)
    title: Mapped[str] = mapped_column(String(300), default="")
    subtitle: Mapped[str] = mapped_column(String(500), default="")
    description: Mapped[str] = mapped_column(Text, default="")
    image: Mapped[str] = mapped_column(Text, default="")
    accent: Mapped[str] = mapped_column(String(30), default="#666666")
    icon: Mapped[str] = mapped_column(String(30), default="")
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    product_ids: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)


class News(Base):
    __tablename__ = "news"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0, index=True)
    title: Mapped[str] = mapped_column(String(300))
    description: Mapped[str] = mapped_column(Text)
    image: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[str] = mapped_column(String(50), index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)


class PickupSlot(Base):
    __tablename__ = "pickup_slots"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    position: Mapped[int] = mapped_column(Integer, default=0, index=True)
    label: Mapped[str] = mapped_column(String(300))
    when_text: Mapped[str] = mapped_column("when", String(100))
    location: Mapped[str] = mapped_column(String(300))


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    telegram_id: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(300))
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(100), default="")
    address: Mapped[str] = mapped_column(String(500), default="")
    avatar: Mapped[str | None] = mapped_column(Text, nullable=True)
    balance: Mapped[int] = mapped_column(Integer, default=0)
    group_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    student_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    discount: Mapped[float] = mapped_column(Float, default=10)
    earned: Mapped[int] = mapped_column(Integer, default=0)
    password_hash: Mapped[str] = mapped_column(Text)


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    items: Mapped[list[dict[str, Any]]] = mapped_column(JSON)
    total_price: Mapped[int] = mapped_column(Integer)
    original_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    customer_name: Mapped[str] = mapped_column(String(300))
    customer_phone: Mapped[str] = mapped_column(String(100))
    delivery_address: Mapped[str] = mapped_column(String(500))
    delivery_method: Mapped[str] = mapped_column(String(30))
    created_at: Mapped[str] = mapped_column(String(50), index=True)
    user_id: Mapped[str | None] = mapped_column(String(100), index=True, nullable=True)
    customer_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="paid")
    pickup_code: Mapped[str | None] = mapped_column(String(30), nullable=True)
    pickup_slot: Mapped[str | None] = mapped_column(String(300), nullable=True)


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(100), index=True)
    notification_type: Mapped[str] = mapped_column(String(30))
    amount: Mapped[int] = mapped_column(Integer)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[str] = mapped_column(String(50), index=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False)


class GrantLog(Base):
    __tablename__ = "grant_log"
    __table_args__ = (UniqueConstraint("id"),)

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    admin: Mapped[str] = mapped_column(String(200), default="Administrator")
    user_name: Mapped[str] = mapped_column(String(300))
    user_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    amount: Mapped[int] = mapped_column(Integer)
    operation_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[str] = mapped_column(String(50), index=True)
