"""Add visibility column to workspaces table.

All existing workspaces default to 'open'.

Revision ID: add_workspace_visibility
Revises: backfill_workspace_id
Create Date: 2026-02-27 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_workspace_visibility"
down_revision: Union[str, None] = "backfill_workspace_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "workspaces",
        sa.Column("visibility", sa.String(20), server_default="open", nullable=False),
    )
    op.create_check_constraint(
        "ck_workspace_visibility",
        "workspaces",
        "visibility IN ('open', 'private')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_workspace_visibility", "workspaces", type_="check")
    op.drop_column("workspaces", "visibility")
