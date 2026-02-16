"""Add suggested_actions table.

Revision ID: add_suggested_actions
Revises: add_context_notes
Create Date: 2026-02-16 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'add_suggested_actions'
down_revision: Union[str, None] = 'add_context_notes'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'suggested_actions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('analysis_id', sa.UUID(), nullable=False),
        sa.Column('conversation_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=500), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('action_type', sa.String(length=50), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('sentiment', sa.String(length=20), nullable=False),
        sa.Column('related_cluster_ids', postgresql.JSONB(), nullable=True),
        sa.Column('response_percentage', sa.Float(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='suggested'),
        sa.Column('dismissed_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['analysis_id'], ['analyses.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_suggested_actions_analysis', 'suggested_actions', ['analysis_id'])
    op.create_index('idx_suggested_actions_conversation', 'suggested_actions', ['conversation_id'])


def downgrade() -> None:
    op.drop_index('idx_suggested_actions_conversation', table_name='suggested_actions')
    op.drop_index('idx_suggested_actions_analysis', table_name='suggested_actions')
    op.drop_table('suggested_actions')
