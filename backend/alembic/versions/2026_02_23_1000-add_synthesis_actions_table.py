"""Add synthesis_actions table for persisting completed/dismissed notes.

Revision ID: add_synthesis_actions
Revises: add_clustering_mode
Create Date: 2026-02-23 10:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "add_synthesis_actions"
down_revision: Union[str, None] = "add_clustering_mode"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "synthesis_actions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("space_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("theme_name", sa.String(200), nullable=False),
        sa.Column("note_text", sa.Text, nullable=False),
        sa.Column("action", sa.String(20), nullable=False),
        sa.Column("detail", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_synthesis_actions_space_created", "synthesis_actions", ["space_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_synthesis_actions_space_created", table_name="synthesis_actions")
    op.drop_table("synthesis_actions")
