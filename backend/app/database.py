from collections.abc import Generator
import re

from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import DATABASE_SCHEMA, DATABASE_URL, SEED_DEMO_DATA


class Base(DeclarativeBase):
    pass


IS_SQLITE = DATABASE_URL.startswith("sqlite")

if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", DATABASE_SCHEMA):
    raise RuntimeError("DATABASE_SCHEMA must be a valid PostgreSQL identifier")


def _sqlalchemy_url(database_url: str) -> str:
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    return database_url


connect_args = (
    {"check_same_thread": False}
    if IS_SQLITE
    else {"options": f"-csearch_path={DATABASE_SCHEMA}"}
)
engine = create_engine(
    _sqlalchemy_url(DATABASE_URL),
    connect_args=connect_args,
    pool_pre_ping=not IS_SQLITE,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    database = SessionLocal()
    try:
        yield database
    finally:
        database.close()


def initialize_database() -> None:
    from . import models  # noqa: F401

    if IS_SQLITE:
        Base.metadata.create_all(bind=engine)
    else:
        with engine.begin() as connection:
            connection.exec_driver_sql(
                f'CREATE SCHEMA IF NOT EXISTS "{DATABASE_SCHEMA}"'
            )
            connection.exec_driver_sql(f'SET search_path TO "{DATABASE_SCHEMA}"')
            Base.metadata.create_all(bind=connection)

    _ensure_catalog_columns()
    _seed_catalog_categories()

    if SEED_DEMO_DATA:
        from .seed import seed_database

        with SessionLocal() as database:
            seed_database(database)


def _ensure_catalog_columns() -> None:
    """Apply the small additive schema evolution used by this standalone app."""
    columns = {column["name"] for column in inspect(engine).get_columns("products", schema=None if IS_SQLITE else DATABASE_SCHEMA)}
    statements: list[str] = []
    if "fulfillment_type" not in columns:
        statements.append(
            "ALTER TABLE products ADD COLUMN fulfillment_type VARCHAR(30)"
        )
    if "active" not in columns:
        statements.append(
            "ALTER TABLE products ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE"
        )
    if "images" not in columns:
        statements.append("ALTER TABLE products ADD COLUMN images JSON")
    if "category_id" not in columns:
        statements.append("ALTER TABLE products ADD COLUMN category_id VARCHAR(100)")
    if "variant_label" not in columns:
        statements.append("ALTER TABLE products ADD COLUMN variant_label VARCHAR(100)")
    if "variants" not in columns:
        statements.append("ALTER TABLE products ADD COLUMN variants JSON")

    with engine.begin() as connection:
        if not IS_SQLITE:
            connection.exec_driver_sql(f'SET search_path TO "{DATABASE_SCHEMA}"')
        for statement in statements:
            connection.exec_driver_sql(statement)
        connection.exec_driver_sql(
            """
            UPDATE products
            SET fulfillment_type = CASE
                WHEN product_type = 'physical' THEN 'physical_pickup'
                WHEN download_url IS NOT NULL AND download_url <> '' THEN 'digital_delivery'
                ELSE 'digital_activation'
            END
            WHERE fulfillment_type IS NULL OR fulfillment_type = ''
            """
        )
        connection.exec_driver_sql(
            """
            UPDATE products
            SET images = CASE
                WHEN image IS NOT NULL AND image <> '' THEN json_array(image)
                ELSE json_array()
            END
            WHERE images IS NULL
            """
            if IS_SQLITE
            else """
            UPDATE products
            SET images = CASE
                WHEN image IS NOT NULL AND image <> '' THEN json_build_array(image)
                ELSE '[]'::json
            END
            WHERE images IS NULL
            """
        )
        connection.exec_driver_sql(
            """
            UPDATE products
            SET category_id = CASE
                WHEN course IS NOT NULL THEN 'study'
                WHEN id IN ('tg-gift-25', 'tg-gift-50', 'tg-gift-150', 'tg-premium-3m', 'tg-premium-6m', 'tg-premium-12m') THEN 'rewards'
                WHEN product_type = 'digital' THEN 'digital'
                ELSE 'merch'
            END
            WHERE category_id IS NULL OR category_id = ''
            """
        )
        connection.exec_driver_sql(
            """
            UPDATE products
            SET carousel = TRUE
            WHERE carousel IS NULL
              AND id IN ('student-sticker-pack', 'student-keychain', 'student-phone-grip', 'student-notebook-set', 'msi-bottle', 'msi-tote', 'tshirt-1', 'msi-hoodie')
            """
        )


def _seed_catalog_categories() -> None:
    from sqlalchemy import func, select

    from .models import CatalogCategory

    with SessionLocal() as database:
        if database.scalar(select(func.count()).select_from(CatalogCategory)):
            return
        database.add_all([
            CatalogCategory(id="study", position=0, name_ru="Учёба", name_uz="O‘qish", name_en="Study", active=True),
            CatalogCategory(id="merch", position=1, name_ru="Мерч", name_uz="Merch", name_en="Merch", active=True),
            CatalogCategory(id="digital", position=2, name_ru="Цифровые", name_uz="Raqamli", name_en="Digital", active=True),
            CatalogCategory(id="rewards", position=3, name_ru="Награды", name_uz="Mukofotlar", name_en="Rewards", active=True),
        ])
        database.commit()
