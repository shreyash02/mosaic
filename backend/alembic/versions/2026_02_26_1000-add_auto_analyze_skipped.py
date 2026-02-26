"""Add auto_analyze_skipped column to conversations.

Tracks when auto-analysis was skipped due to usage limits so the
frontend can display an informative banner to the creator.

Revision ID: add_auto_analyze_skipped
Revises: add_space_syntheses_table
Create Date: 2026-02-26 10:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "add_auto_analyze_skipped"
down_revision: Union[str, None] = "add_space_syntheses_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "conversations",
        sa.Column("auto_analyze_skipped", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("conversations", "auto_analyze_skipped")
