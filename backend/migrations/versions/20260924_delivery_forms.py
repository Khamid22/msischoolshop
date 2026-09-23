"""Add per-product digital delivery configuration without rewriting orders."""

from alembic import op
import sqlalchemy as sa

revision = "20260924_delivery_forms"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    schema = op.get_context().opts.get("version_table_schema")
    columns = sa.inspect(op.get_bind()).get_columns("products", schema=schema)
    if "delivery_form" not in {column["name"] for column in columns}:
        op.add_column("products", sa.Column("delivery_form", sa.JSON(), nullable=True), schema=schema)


def downgrade():
    # Dropping configured forms loses their data; live downgrade requires approval.
    schema = op.get_context().opts.get("version_table_schema")
    op.drop_column("products", "delivery_form", schema=schema)
