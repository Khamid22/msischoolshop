"""Content-addressed storage for uploaded catalog images.

The admin uploads photos as data URLs. Kept inline, every catalog, order and
admin response carried megabytes of base64 and the storefront re-downloaded
them on each refresh. Images are stored once here instead and referenced by a
digest URL that browsers may cache forever.
"""

import base64
import binascii
import hashlib
import logging
import re
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import String, cast, select
from sqlalchemy.dialects.postgresql import insert as postgresql_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from .database import IS_SQLITE, SessionLocal, get_db
from .models import Banner, MediaFile, News, Order, Product


logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/media", tags=["media"])

MEDIA_PATH = "/api/media/"
IMAGE_EXTENSIONS = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
}
IMMUTABLE = "public, max-age=31536000, immutable"
_MEDIA_NAME = re.compile(r"([0-9a-f]{64})(?:\.[a-z]{3,4})?")
_BACKFILL_BATCH = 20


def _decode_data_url(value: str) -> tuple[str, bytes] | None:
    header, separator, payload = value.partition(",")
    parameters = header[len("data:"):].split(";")
    content_type = parameters[0].strip().lower()
    if not separator or content_type not in IMAGE_EXTENSIONS or "base64" not in parameters[1:]:
        return None
    try:
        return content_type, base64.b64decode(payload.strip())
    except (binascii.Error, ValueError):
        return None


def store_image(database: Session, value: str | None) -> str | None:
    """Return a media URL for an inline image, or the value unchanged."""
    if not value or not value.startswith("data:"):
        return value
    decoded = _decode_data_url(value)
    if decoded is None:
        # Unrecognized data URLs stay inline, exactly as they were accepted before.
        return value
    content_type, data = decoded
    digest = hashlib.sha256(data).hexdigest()
    insert = sqlite_insert if IS_SQLITE else postgresql_insert
    database.execute(
        insert(MediaFile)
        .values(
            id=digest, content_type=content_type, size=len(data), data=data,
            created_at=datetime.now(timezone.utc).isoformat(),
        )
        .on_conflict_do_nothing(index_elements=["id"])
    )
    return f"{MEDIA_PATH}{digest}.{IMAGE_EXTENSIONS[content_type]}"


def store_images(database: Session, values: list[str] | None) -> list[str] | None:
    if values is None:
        return None
    return [store_image(database, value) or "" for value in values]


def store_product_images(database: Session, product: Product) -> None:
    product.image = store_image(database, product.image) or ""
    product.images = store_images(database, product.images)


def _store_row_images(database: Session, row: Product | Banner | News) -> bool:
    if isinstance(row, Product):
        before = (row.image, row.images)
        store_product_images(database, row)
        return (row.image, row.images) != before
    before = row.image
    row.image = store_image(database, row.image)
    return row.image != before


def _store_snapshot_images(database: Session, items: list[dict[str, Any]]) -> list[dict[str, Any]] | None:
    stored = deepcopy(items)
    for item in stored:
        product = item.get("product")
        if not isinstance(product, dict):
            continue
        if isinstance(product.get("image"), str):
            product["image"] = store_image(database, product["image"])
        if isinstance(product.get("images"), list):
            product["images"] = [store_image(database, value) if isinstance(value, str) else value for value in product["images"]]
    return stored if stored != items else None


def _inline_ids(database: Session, model: type, *columns) -> list[str]:
    condition = None
    for column in columns:
        match = cast(column, String).like("%data:%")
        condition = match if condition is None else condition | match
    return list(database.scalars(select(model.id).where(condition)))


def externalize_inline_images() -> int:
    """Move inline images out of catalog and order rows. Safe to run repeatedly."""
    moved = 0
    with SessionLocal() as database:
        for model, columns in (
            (Product, (Product.image, Product.images)),
            (Banner, (Banner.image,)),
            (News, (News.image,)),
        ):
            for row_id in _inline_ids(database, model, *columns):
                moved += _store_row_images(database, database.get(model, row_id))
            database.commit()

        order_ids = _inline_ids(database, Order, Order.items)
        # Orders hold full product snapshots; load a few at a time to bound memory.
        for start in range(0, len(order_ids), _BACKFILL_BATCH):
            for order_id in order_ids[start:start + _BACKFILL_BATCH]:
                order = database.get(Order, order_id)
                items = _store_snapshot_images(database, order.items or [])
                if items is not None:
                    order.items = items
                    moved += 1
            database.commit()
            database.expunge_all()
    if moved:
        logger.info("Moved inline images out of %s catalog and order rows", moved)
    return moved


@router.get("/{name}")
def get_media(name: str, request: Request, database: Session = Depends(get_db)) -> Response:
    match = _MEDIA_NAME.fullmatch(name)
    if match is None:
        raise HTTPException(status_code=404, detail="Image not found")
    digest = match.group(1)
    headers = {"Cache-Control": IMMUTABLE, "ETag": f'"{digest}"', "X-Content-Type-Options": "nosniff"}
    if request.headers.get("if-none-match") == headers["ETag"]:
        return Response(status_code=304, headers=headers)
    media = database.get(MediaFile, digest)
    if media is None:
        raise HTTPException(status_code=404, detail="Image not found")
    if media.content_type == "image/svg+xml":
        # Uploaded SVG opened directly must not run scripts on the shop origin.
        headers["Content-Security-Policy"] = "default-src 'none'; style-src 'unsafe-inline'; sandbox"
    return Response(media.data, media_type=media.content_type, headers=headers)
