"""Explicit Shop migrations; never connect to an implicit application fallback."""

import os
import re

from alembic import context
from sqlalchemy import create_engine


def migrate(connection):
    schema = None
    if connection.dialect.name == "postgresql":
        schema = os.environ.get("DATABASE_SCHEMA", "msi_shop")
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", schema):
            raise ValueError("Invalid DATABASE_SCHEMA")
        connection.exec_driver_sql(f'SET LOCAL search_path TO "{schema}"')
        connection.exec_driver_sql("SET LOCAL lock_timeout = '5s'")
    context.configure(connection=connection, version_table_schema=schema)
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    raise RuntimeError("Inspect the target schema using an online migration connection")
elif context.config.attributes.get("connection") is not None:
    migrate(context.config.attributes["connection"])
else:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("Set DATABASE_URL explicitly before running Shop migrations")
    if url.startswith(("postgresql://", "postgres://")):
        url = "postgresql+psycopg://" + url.split("://", 1)[1]
    engine = create_engine(url)
    try:
        with engine.begin() as connection:
            migrate(connection)
    finally:
        engine.dispose()
