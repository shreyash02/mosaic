"""Add display_order column to feature_flags.

Allows admins to arrange flags in a custom order (basic to advanced).
Backfills existing flags with sequential order based on alphabetical sort.

Revision ID: add_feature_flag_display_order
Revises: seed_question_suggestions_limits
Create Date: 2026-02-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


# revision identifiers, used by Alembic.
revision: str = 'add_feature_flag_display_order'
down_revision: Union[str, None] = 'seed_question_suggestions_limits'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add column with default 0
    op.add_column('feature_flags', sa.Column('display_order', sa.Integer(), nullable=False, server_default='0'))

    # Backfill: assign sequential order based on current alphabetical name sort
    conn = op.get_bind()
    rows = conn.execute(
        text("SELECT id FROM feature_flags ORDER BY name ASC")
    ).fetchall()

    for idx, row in enumerate(rows):
        conn.execute(
            text("UPDATE feature_flags SET display_order = :order WHERE id = :id"),
            {"order": idx, "id": row[0]}
        )


def downgrade() -> None:
    op.drop_column('feature_flags', 'display_order')
