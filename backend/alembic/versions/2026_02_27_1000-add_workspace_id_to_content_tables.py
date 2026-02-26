"""Add workspace_id column to content tables.

Adds a nullable workspace_id FK to conversations, series,
conversation_presets, and spaces. The column coexists with
organization_id during the migration window — organization_id
will be dropped in a later step once all reads/writes use
workspace_id.

Revision ID: add_workspace_id_to_content
Revises: backfill_org_default_workspaces
Create Date: 2026-02-27 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = "add_workspace_id_to_content"
down_revision: Union[str, None] = "backfill_org_default_workspaces"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = ["conversations", "series", "conversation_presets", "spaces"]


def upgrade() -> None:
    for table in TABLES:
        op.add_column(
            table,
            sa.Column("workspace_id", UUID(as_uuid=True), nullable=True),
        )
        op.create_foreign_key(
            f"fk_{table}_workspace_id",
            table,
            "workspaces",
            ["workspace_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index(f"ix_{table}_workspace_id", table, ["workspace_id"])


def downgrade() -> None:
    for table in TABLES:
        op.drop_index(f"ix_{table}_workspace_id", table_name=table)
        op.drop_constraint(f"fk_{table}_workspace_id", table, type_="foreignkey")
        op.drop_column(table, "workspace_id")
