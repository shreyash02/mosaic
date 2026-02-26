"""Backfill workspace_id on content tables.

For each row:
- organization_id is set → use the org's default workspace
- organization_id is null → use the creator's personal workspace

After backfill, make workspace_id NOT NULL.

Revision ID: backfill_workspace_id
Revises: add_workspace_id_to_content
Create Date: 2026-02-27 11:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "backfill_workspace_id"
down_revision: Union[str, None] = "add_workspace_id_to_content"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (table_name, creator_column)
TABLES = [
    ("conversations", "creator_id"),
    ("series", "creator_id"),
    ("conversation_presets", "creator_id"),
    ("spaces", "owner_id"),
]


def upgrade() -> None:
    for table, creator_col in TABLES:
        # Rows with organization_id → org's default workspace
        op.execute(
            f"""
            UPDATE {table} t
            SET workspace_id = w.id
            FROM workspaces w
            WHERE t.organization_id IS NOT NULL
              AND t.workspace_id IS NULL
              AND w.organization_id = t.organization_id
              AND w.type = 'organization'
              AND w.is_default = true
            """
        )

        # Rows without organization_id → creator's personal workspace
        op.execute(
            f"""
            UPDATE {table} t
            SET workspace_id = w.id
            FROM workspaces w
            WHERE t.organization_id IS NULL
              AND t.workspace_id IS NULL
              AND w.owner_id = t.{creator_col}
              AND w.type = 'personal'
              AND w.organization_id IS NULL
            """
        )

    # Make workspace_id NOT NULL on all tables
    for table, _ in TABLES:
        op.alter_column(table, "workspace_id", nullable=False)


def downgrade() -> None:
    # Make workspace_id nullable again
    for table, _ in TABLES:
        op.alter_column(table, "workspace_id", nullable=True)

    # Clear all workspace_id values
    for table, _ in TABLES:
        op.execute(f"UPDATE {table} SET workspace_id = NULL")
