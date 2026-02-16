"""Add user action columns to suggested_actions.

Revision ID: add_user_action_columns
Revises: add_source_suggested_actions
Create Date: 2026-02-16 17:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'add_user_action_columns'
down_revision: Union[str, None] = 'add_source_suggested_actions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('suggested_actions', sa.Column('accepted_at', sa.DateTime(), nullable=True))
    op.add_column('suggested_actions', sa.Column('completed_at', sa.DateTime(), nullable=True))
    op.add_column('suggested_actions', sa.Column('dismissed_at', sa.DateTime(), nullable=True))
    op.add_column('suggested_actions', sa.Column('deferred_at', sa.DateTime(), nullable=True))
    op.add_column('suggested_actions', sa.Column('updated_at', sa.DateTime(), nullable=True))
    op.add_column('suggested_actions', sa.Column(
        'created_by_id',
        postgresql.UUID(as_uuid=True),
        sa.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
    ))
    op.create_index('idx_suggested_actions_status', 'suggested_actions', ['status'])


def downgrade() -> None:
    op.drop_index('idx_suggested_actions_status', table_name='suggested_actions')
    op.drop_column('suggested_actions', 'created_by_id')
    op.drop_column('suggested_actions', 'updated_at')
    op.drop_column('suggested_actions', 'deferred_at')
    op.drop_column('suggested_actions', 'dismissed_at')
    op.drop_column('suggested_actions', 'completed_at')
    op.drop_column('suggested_actions', 'accepted_at')
