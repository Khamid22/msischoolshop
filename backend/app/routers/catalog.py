from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Banner, CatalogCategory, News, PickupSlot, Product
from ..order_fulfillment import default_fulfillment_type, normalize_fulfillment_type
from ..schemas import (
    BannerCreate,
    BannerUpdate,
    CatalogCategoryCreate,
    CatalogCategoryUpdate,
    NewsCreate,
    NewsUpdate,
    ProductCreate,
    ProductUpdate,
)
from ..security import require_admin
from ..serializers import banner_to_dict, category_to_dict, news_to_dict, product_to_dict, slot_to_dict
from ..student_picks import list_student_picks


router = APIRouter(prefix="/api", tags=["catalog"])


PRODUCT_FIELDS = {
    "image": "image", "images": "images", "price": "price", "categoryId": "category_id",
    "nameKey": "name_key", "descKey": "desc_key",
    "name": "name", "description": "description", "type": "product_type", "carousel": "carousel",
    "fulfillmentType": "fulfillment_type", "active": "active",
    "downloadUrl": "download_url", "licenseKey": "license_key", "weight": "weight", "stock": "stock",
    "variantLabel": "variant_label", "variants": "variants",
    "discount": "discount", "rating": "rating", "ratingCount": "rating_count", "course": "course",
    "deliveryForm": "delivery_form",
}
BANNER_FIELDS = {
    "title": "title", "subtitle": "subtitle", "description": "description", "image": "image",
    "accent": "accent", "icon": "icon", "active": "active", "productIds": "product_ids",
}
NEWS_FIELDS = {"title": "title", "description": "description", "image": "image", "date": "date", "active": "active"}
CATEGORY_FIELDS = {
    "nameRu": "name_ru", "nameUz": "name_uz", "nameEn": "name_en", "active": "active",
}


def apply_fields(instance: object, data: dict, field_map: dict[str, str]) -> None:
    for source, target in field_map.items():
        if source in data:
            setattr(instance, target, data[source])


def normalize_product_fulfillment(product: Product, changed_fields: set[str]) -> None:
    if "type" in changed_fields and "fulfillmentType" not in changed_fields:
        product.fulfillment_type = default_fulfillment_type(
            product.product_type,
            product.download_url,
        )
    else:
        product.fulfillment_type = normalize_fulfillment_type(
            product.fulfillment_type,
            product_type=product.product_type,
            download_url=product.download_url,
        )
    product.product_type = (
        "physical" if product.fulfillment_type == "physical_pickup" else "digital"
    )
    if product.product_type == "physical":
        if product.delivery_form and any(product.delivery_form.values()):
            raise HTTPException(status_code=422, detail="Delivery forms are for digital products")
        product.delivery_form = None


def normalize_product_media(product: Product) -> None:
    images = [item.strip() for item in (product.images or []) if item.strip()]
    if product.image and product.image.strip() and product.image.strip() not in images:
        images.insert(0, product.image.strip())
    product.images = images[:6]
    product.image = product.images[0] if product.images else ""


def normalize_product_variant_price(product: Product) -> None:
    prices = [int(option["price"]) for option in (product.variants or []) if option.get("active", True)]
    if prices:
        product.price = min(prices)


def require_category(database: Session, category_id: str | None) -> None:
    if category_id and database.get(CatalogCategory, category_id) is None:
        raise HTTPException(status_code=422, detail="Catalog category does not exist")


def next_position(database: Session, model: type) -> int:
    current = database.scalar(select(func.max(model.position)))
    return 0 if current is None else int(current) + 1


@router.get("/categories")
def list_categories(database: Session = Depends(get_db)) -> list[dict]:
    categories = database.scalars(
        select(CatalogCategory)
        .where(CatalogCategory.active.is_(True))
        .order_by(CatalogCategory.position, CatalogCategory.id)
    ).all()
    return [category_to_dict(category) for category in categories]


@router.post("/categories", status_code=201, dependencies=[Depends(require_admin)])
def create_category(data: CatalogCategoryCreate, database: Session = Depends(get_db)) -> dict:
    category_id = data.id or f"category-{uuid4().hex[:8]}"
    if database.get(CatalogCategory, category_id) is not None:
        raise HTTPException(status_code=409, detail="Catalog category already exists")
    category = CatalogCategory(
        id=category_id,
        position=next_position(database, CatalogCategory),
        name_ru=data.nameRu,
        name_uz=data.nameUz,
        name_en=data.nameEn,
        active=data.active,
    )
    database.add(category)
    database.commit()
    return category_to_dict(category)


@router.patch("/categories/{category_id}", dependencies=[Depends(require_admin)])
def update_category(
    category_id: str,
    data: CatalogCategoryUpdate,
    database: Session = Depends(get_db),
) -> dict:
    category = database.get(CatalogCategory, category_id)
    if category is None:
        raise HTTPException(status_code=404, detail="Catalog category not found")
    apply_fields(category, data.model_dump(exclude_unset=True), CATEGORY_FIELDS)
    database.commit()
    return category_to_dict(category)


@router.get("/products")
def list_products(database: Session = Depends(get_db)) -> list[dict]:
    products = database.scalars(
        select(Product).where(Product.active.is_(True)).order_by(Product.position, Product.id)
    ).all()
    return [product_to_dict(product) for product in products]


@router.get("/student-picks")
def student_picks(database: Session = Depends(get_db)) -> list[dict]:
    return [product_to_dict(product) for product in list_student_picks(database)]


@router.get("/products/{product_id}")
def get_product(product_id: str, database: Session = Depends(get_db)) -> dict:
    product = database.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product_to_dict(product)


@router.post("/products", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_product(data: ProductCreate, database: Session = Depends(get_db)) -> dict:
    product = Product(id=f"product-{uuid4().hex[:12]}", position=next_position(database, Product), image="", price=0)
    fields = data.model_dump()
    require_category(database, fields.get("categoryId"))
    apply_fields(product, fields, PRODUCT_FIELDS)
    normalize_product_fulfillment(product, set(fields))
    normalize_product_media(product)
    normalize_product_variant_price(product)
    database.add(product)
    database.commit()
    return product_to_dict(product, include_delivery_form=True)


@router.patch("/products/{product_id}", dependencies=[Depends(require_admin)])
def update_product(product_id: str, data: ProductUpdate, database: Session = Depends(get_db)) -> dict:
    product = database.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    fields = data.model_dump(exclude_unset=True)
    require_category(database, fields.get("categoryId"))
    apply_fields(product, fields, PRODUCT_FIELDS)
    normalize_product_fulfillment(product, set(fields))
    normalize_product_media(product)
    normalize_product_variant_price(product)
    database.commit()
    return product_to_dict(product, include_delivery_form=True)


@router.delete("/products/{product_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_product(product_id: str, database: Session = Depends(get_db)) -> Response:
    product = database.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    database.delete(product)
    database.commit()
    return Response(status_code=204)


@router.get("/banners")
def list_banners(database: Session = Depends(get_db)) -> list[dict]:
    banners = database.scalars(select(Banner).order_by(Banner.position, Banner.id)).all()
    return [banner_to_dict(banner) for banner in banners]


@router.get("/banners/{banner_id}")
def get_banner(banner_id: str, database: Session = Depends(get_db)) -> dict:
    banner = database.get(Banner, banner_id)
    if banner is None:
        raise HTTPException(status_code=404, detail="Banner not found")
    return banner_to_dict(banner)


@router.post("/banners", status_code=201, dependencies=[Depends(require_admin)])
def create_banner(data: BannerCreate, database: Session = Depends(get_db)) -> dict:
    banner = Banner(id=f"banner-{uuid4().hex[:12]}", position=next_position(database, Banner))
    apply_fields(banner, data.model_dump(), BANNER_FIELDS)
    database.add(banner)
    database.commit()
    return banner_to_dict(banner)


@router.patch("/banners/{banner_id}", dependencies=[Depends(require_admin)])
def update_banner(banner_id: str, data: BannerUpdate, database: Session = Depends(get_db)) -> dict:
    banner = database.get(Banner, banner_id)
    if banner is None:
        raise HTTPException(status_code=404, detail="Banner not found")
    apply_fields(banner, data.model_dump(exclude_unset=True), BANNER_FIELDS)
    database.commit()
    return banner_to_dict(banner)


@router.delete("/banners/{banner_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_banner(banner_id: str, database: Session = Depends(get_db)) -> Response:
    banner = database.get(Banner, banner_id)
    if banner is None:
        raise HTTPException(status_code=404, detail="Banner not found")
    database.delete(banner)
    database.commit()
    return Response(status_code=204)


@router.get("/news")
def list_news(database: Session = Depends(get_db)) -> list[dict]:
    items = database.scalars(select(News).order_by(News.position, News.id)).all()
    return [news_to_dict(item) for item in items]


@router.get("/news/{news_id}")
def get_news(news_id: str, database: Session = Depends(get_db)) -> dict:
    item = database.get(News, news_id)
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")
    return news_to_dict(item)


@router.post("/news", status_code=201, dependencies=[Depends(require_admin)])
def create_news(data: NewsCreate, database: Session = Depends(get_db)) -> dict:
    item = News(
        id=f"news-{uuid4().hex[:12]}", position=next_position(database, News), title=data.title,
        description=data.description, image=data.image,
        date=data.date or datetime.now(timezone.utc).isoformat(), active=data.active,
    )
    database.add(item)
    database.commit()
    return news_to_dict(item)


@router.patch("/news/{news_id}", dependencies=[Depends(require_admin)])
def update_news(news_id: str, data: NewsUpdate, database: Session = Depends(get_db)) -> dict:
    item = database.get(News, news_id)
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")
    apply_fields(item, data.model_dump(exclude_unset=True), NEWS_FIELDS)
    database.commit()
    return news_to_dict(item)


@router.delete("/news/{news_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_news(news_id: str, database: Session = Depends(get_db)) -> Response:
    item = database.get(News, news_id)
    if item is None:
        raise HTTPException(status_code=404, detail="News item not found")
    database.delete(item)
    database.commit()
    return Response(status_code=204)


@router.get("/pickup-slots")
def list_pickup_slots(database: Session = Depends(get_db)) -> list[dict]:
    slots = database.scalars(select(PickupSlot).order_by(PickupSlot.position, PickupSlot.id)).all()
    return [slot_to_dict(slot) for slot in slots]
