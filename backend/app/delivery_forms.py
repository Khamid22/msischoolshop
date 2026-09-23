"""Product-owned instructions and fields captured with each digital purchase."""

from copy import deepcopy
import re
from typing import Literal
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .models import Product
from .order_fulfillment import fulfillment_type_from_product

ROBUX_PRODUCT_ID = "product-4e53e3f6ed90"
ROBUX_PLAYER_ID = "roblox_player_id"
ROBLOX_PROFILE_URL = "https://www.roblox.com/share?code=cf4cd3ed2f25f445838ed6867ba5cc3b&type=Profile&source=ProfileShare&stamp=1790162565396"


class DeliveryField(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    id: str = Field(pattern=r"^[A-Za-z][A-Za-z0-9_-]{0,63}$")
    label: str = Field(min_length=1, max_length=140)
    type: Literal["text", "player_id", "email", "checkbox"] = "text"
    required: bool = True
    help: str = Field(default="", max_length=500)


class DeliveryLink(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    label: str = Field(min_length=1, max_length=100)
    url: str = Field(min_length=1, max_length=2000)

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        parsed = urlsplit(value)
        if (parsed.scheme not in {"http", "https"} or not parsed.hostname
                or parsed.username or parsed.password or re.search(r"[\s\\]", value)):
            raise ValueError("Use a complete http:// or https:// link without credentials")
        return value


class DeliveryForm(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    instructions: str = Field(default="", max_length=3000)
    links: list[DeliveryLink] = Field(default_factory=list, max_length=5)
    fields: list[DeliveryField] = Field(default_factory=list, max_length=10)

    @model_validator(mode="after")
    def unique_fields(self) -> "DeliveryForm":
        ids = [field.id for field in self.fields]
        if len(set(ids)) != len(ids):
            raise ValueError("Field IDs must be unique")
        return self


def robux_delivery_form() -> dict:
    return DeliveryForm(
        instructions="Откройте наш профиль Roblox по ссылке и отправьте заявку в друзья. Затем укажите свой Player ID и подтвердите отправку заявки, чтобы сотрудники MSI могли выдать Robux.",
        links=[DeliveryLink(label="Добавить MSI в друзья в Roblox", url=ROBLOX_PROFILE_URL)],
        fields=[
            DeliveryField(id="playerId", label="Roblox Player ID", type="player_id",
                          help="Числовой ID вашего профиля Roblox, а не ID ученика MSI. Пароль не нужен."),
            DeliveryField(id="friendRequestSent", label="Я отправил заявку в друзья", type="checkbox"),
        ],
    ).model_dump()


def product_delivery_form(product: Product) -> dict | None:
    if fulfillment_type_from_product(product) == "physical_pickup":
        return None
    if product.delivery_form is not None:
        return deepcopy(product.delivery_form)
    return robux_delivery_form() if product.id == ROBUX_PRODUCT_ID else None


def snapshot_delivery_form(product: dict) -> dict | None:
    if "deliveryForm" in product:
        return product["deliveryForm"]
    # Older Robux purchases have no form snapshot. Show the new instructions
    # without rewriting those orders or reopening completed fulfillment.
    if product.get("id") == ROBUX_PRODUCT_ID or product.get("deliveryRequirement") == ROBUX_PLAYER_ID:
        return robux_delivery_form()
    return None


def missing_required_fields(form: dict, answers: dict) -> list[str]:
    return [field["id"] for field in form.get("fields", []) if field.get("required", True)
            and (answers.get(field["id"]) is not True if field["type"] == "checkbox"
                 else not answers.get(field["id"]))]


def validate_answers(form: dict, answers: dict[str, str | bool]) -> dict[str, str | bool]:
    fields = {field["id"]: field for field in form.get("fields", [])}
    if set(answers) - fields.keys():
        raise ValueError("Unknown delivery field")
    normalized: dict[str, str | bool] = {}
    for field_id, value in answers.items():
        field = fields[field_id]
        if field["type"] == "checkbox":
            if type(value) is not bool:
                raise ValueError(f"{field['label']}: expected a confirmation")
        else:
            if not isinstance(value, str) or len(value) > 1000:
                raise ValueError(f"{field['label']}: expected text up to 1000 characters")
            value = value.strip()
            if value:
                if field["type"] == "player_id" and not re.fullmatch(r"[1-9][0-9]{0,19}", value):
                    raise ValueError(f"{field['label']}: enter 1–20 digits, starting with a non-zero digit")
                if field["type"] == "email" and not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", value):
                    raise ValueError(f"{field['label']}: enter a valid email")
        normalized[field_id] = value
    if missing_required_fields(form, normalized):
        raise ValueError("Complete all required delivery fields")
    return normalized
