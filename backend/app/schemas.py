from typing import Any, Literal

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    image: str
    price: int = Field(ge=0)
    nameKey: str = ""
    descKey: str = ""
    name: str | None = None
    description: str | None = None
    type: Literal["digital", "physical"] | None = None
    carousel: bool | None = None
    downloadUrl: str | None = None
    licenseKey: str | None = None
    weight: float | None = None
    stock: int | None = Field(default=None, ge=0)
    discount: float | None = Field(default=None, ge=0, le=100)
    rating: float | None = Field(default=None, ge=0, le=5)
    ratingCount: int | None = Field(default=None, ge=0)
    course: dict[str, Any] | None = None


class ProductUpdate(ProductCreate):
    image: str | None = None
    price: int | None = Field(default=None, ge=0)
    nameKey: str | None = None
    descKey: str | None = None


class BannerCreate(BaseModel):
    title: str = ""
    subtitle: str = ""
    description: str = ""
    image: str = ""
    accent: str = "#666666"
    icon: str = ""
    active: bool = True
    productIds: list[str] | None = None


class BannerUpdate(BaseModel):
    title: str | None = None
    subtitle: str | None = None
    description: str | None = None
    image: str | None = None
    accent: str | None = None
    icon: str | None = None
    active: bool | None = None
    productIds: list[str] | None = None


class NewsCreate(BaseModel):
    title: str
    description: str
    image: str | None = None
    date: str | None = None
    active: bool = True


class NewsUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    image: str | None = None
    date: str | None = None
    active: bool | None = None


class StudentLogin(BaseModel):
    studentId: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, max_length=320)
    password: str = Field(max_length=256)


class TelegramLogin(BaseModel):
    initData: str


class AdminLogin(BaseModel):
    password: str


class AdminSsoLogin(BaseModel):
    assertion: str = Field(min_length=32, max_length=4096)


class UserUpdate(BaseModel):
    name: str | None = None
    phone: str | None = None
    address: str | None = None
    avatar: str | None = None


class OrderCreate(BaseModel):
    productId: str
    requestId: str | None = Field(default=None, max_length=100)
    quantity: int = Field(default=1, ge=1, le=100)
    customerName: str
    customerPhone: str
    deliveryAddress: str
    deliveryMethod: Literal["courier", "pickup", "post"]
    pickupSlot: str | None = None


class OrderStatusUpdate(BaseModel):
    status: Literal["paid", "packed", "ready", "collected"]


class BalanceChange(BaseModel):
    amount: int
    note: str | None = None


class BulkSync(BaseModel):
    items: list[dict[str, Any]]
