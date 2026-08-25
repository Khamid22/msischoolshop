from collections.abc import Generator
import re

from sqlalchemy import create_engine
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

    if SEED_DEMO_DATA:
        from .seed import seed_database

        with SessionLocal() as database:
            seed_database(database)
