from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from .order_fulfillment import FulfillmentType, OrderStatus


class ProductVariantInput(BaseModel):
    id: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=100)
    price: int = Field(ge=0)
    stock: int | None = Field(default=None, ge=0)
    active: bool = True


class ProductCreate(BaseModel):
    image: str = ""
    images: list[str] = Field(default_factory=list, max_length=6)
    price: int = Field(ge=0)
    categoryId: str | None = Field(default=None, max_length=100)
    nameKey: str = ""
    descKey: str = ""
    name: str | None = None
    description: str | None = None
    type: Literal["digital", "physical"] | None = None
    fulfillmentType: FulfillmentType | None = None
    active: bool = True
    carousel: bool | None = None
    downloadUrl: str | None = None
    licenseKey: str | None = None
    weight: float | None = None
    stock: int | None = Field(default=None, ge=0)
    variantLabel: str | None = Field(default=None, max_length=100)
    variants: list[ProductVariantInput] = Field(default_factory=list, max_length=30)
    discount: float | None = Field(default=None, ge=0, le=100)
    rating: float | None = Field(default=None, ge=0, le=5)
    ratingCount: int | None = Field(default=None, ge=0)
    course: dict[str, Any] | None = None

    @field_validator("image", "images")
    @classmethod
    def validate_media_size(cls, value: str | list[str]) -> str | list[str]:
        values = [value] if isinstance(value, str) else value
        if any(len(item) > 2_800_000 for item in values):
            raise ValueError("Each image must be smaller than 2 MB")
        return value

    @model_validator(mode="after")
    def validate_variant_ids(self) -> "ProductCreate":
        variant_ids = [variant.id for variant in self.variants]
        if len(variant_ids) != len(set(variant_ids)):
            raise ValueError("Variant IDs must be unique")
        return self


class ProductUpdate(ProductCreate):
    image: str | None = None
    price: int | None = Field(default=None, ge=0)
    nameKey: str | None = None
    descKey: str | None = None
    active: bool | None = None


class CatalogCategoryCreate(BaseModel):
    id: str | None = Field(default=None, max_length=100, pattern=r"^[a-z0-9][a-z0-9-]*$")
    nameRu: str = Field(min_length=1, max_length=100)
    nameUz: str = Field(min_length=1, max_length=100)
    nameEn: str = Field(min_length=1, max_length=100)
    active: bool = True


class CatalogCategoryUpdate(BaseModel):
    nameRu: str | None = Field(default=None, min_length=1, max_length=100)
    nameUz: str | None = Field(default=None, min_length=1, max_length=100)
    nameEn: str | None = Field(default=None, min_length=1, max_length=100)
    active: bool | None = None


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
    variantId: str | None = Field(default=None, max_length=100)
    requestId: str | None = Field(default=None, max_length=100)
    quantity: int = Field(default=1, ge=1, le=100)
    customerName: str
    customerPhone: str = ""
    deliveryAddress: str = ""
    deliveryMethod: Literal["courier", "pickup", "post", "digital"] = "digital"
    pickupSlot: str | None = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class BalanceChange(BaseModel):
    amount: int
    note: str | None = None


class BulkSync(BaseModel):
    items: list[dict[str, Any]]
