import os
from pathlib import Path
from urllib.parse import urlsplit

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text


def test_delivery_form_migration_is_additive_repeatable_and_reversible(tmp_path, monkeypatch):
    url = os.getenv("MSI_SHOP_TEST_DATABASE_URL")
    if url:
        parsed = urlsplit(url)
        assert parsed.hostname in {"127.0.0.1", "localhost", "::1"}
        assert parsed.path.startswith("/msi_") and parsed.path.endswith("_test")
    engine = create_engine(url or f"sqlite:///{tmp_path / 'migration.db'}")
    postgres = engine.dialect.name == "postgresql"
    schema = "msi_shop_migration_test" if postgres else None
    monkeypatch.setenv("DATABASE_SCHEMA", schema or "msi_shop")
    prefix = f'"{schema}".' if schema else ""
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    with engine.begin() as connection:
        if postgres:
            assert schema not in inspect(connection).get_schema_names()
            connection.exec_driver_sql(f'CREATE SCHEMA "{schema}"')
        connection.exec_driver_sql(f"CREATE TABLE {prefix}products (id VARCHAR(100) PRIMARY KEY, name VARCHAR(100))")
        connection.execute(text(f"INSERT INTO {prefix}products (id, name) VALUES (:id, :name)"), {"id": "kept", "name": "Unchanged"})
    try:
        for _ in range(2):
            with engine.begin() as connection:
                config.attributes["connection"] = connection
                command.upgrade(config, "head")
        with engine.connect() as connection:
            columns = {item["name"] for item in inspect(connection).get_columns("products", schema=schema)}
            assert columns == {"id", "name", "delivery_form"}
            assert connection.exec_driver_sql(f"SELECT id, name, delivery_form FROM {prefix}products").one() == ("kept", "Unchanged", None)
            assert connection.exec_driver_sql(f"SELECT version_num FROM {prefix}alembic_version").scalar_one() == "20260924_delivery_forms"
        with engine.begin() as connection:
            config.attributes["connection"] = connection
            command.downgrade(config, "base")
        with engine.connect() as connection:
            assert {item["name"] for item in inspect(connection).get_columns("products", schema=schema)} == {"id", "name"}
            assert connection.exec_driver_sql(f"SELECT name FROM {prefix}products").scalar_one() == "Unchanged"
        with engine.begin() as connection:
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
    finally:
        if postgres:
            with engine.begin() as connection:
                connection.exec_driver_sql(f'DROP SCHEMA "{schema}" CASCADE')
        engine.dispose()
