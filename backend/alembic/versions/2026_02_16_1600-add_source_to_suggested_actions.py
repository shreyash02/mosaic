"""Add source column to suggested_actions.

Revision ID: add_source_suggested_actions
Revises: seed_ai_suggested_actions
Create Date: 2026-02-16 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_source_suggested_actions'
down_revision: Union[str, None] = 'seed_ai_suggested_actions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'suggested_actions',
        sa.Column('source', sa.String(20), nullable=False, server_default='user_requested'),
    )


def downgrade() -> None:
    op.drop_column('suggested_actions', 'source')
