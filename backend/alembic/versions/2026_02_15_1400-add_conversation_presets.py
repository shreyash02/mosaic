"""Add conversation presets table

Revision ID: add_conversation_presets
Revises: seed_tier_limits
Create Date: 2026-02-15 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY


# revision identifiers, used by Alembic.
revision: str = 'add_conversation_presets'
down_revision: Union[str, None] = 'seed_tier_limits'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'conversation_presets',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('creator_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='SET NULL'), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('emoji', sa.String(10), nullable=False, server_default='📋'),
        sa.Column('anonymity_level', sa.String(50), nullable=False),
        sa.Column('results_access', sa.String(50), nullable=False),
        sa.Column('show_verbatim_responses', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('invite_only', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('default_questions', JSONB, nullable=True),
        sa.Column('skip_steps', ARRAY(sa.String), nullable=True),
        sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('archived_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'))
    )

    # Indexes for efficient lookups
    op.create_index('idx_presets_creator', 'conversation_presets', ['creator_id'])
    op.create_index('idx_presets_organization', 'conversation_presets', ['organization_id'])
    op.create_index('idx_presets_not_archived', 'conversation_presets',
                    ['is_archived'], postgresql_where=sa.text('is_archived = false'))


def downgrade() -> None:
    op.drop_index('idx_presets_not_archived', 'conversation_presets')
    op.drop_index('idx_presets_organization', 'conversation_presets')
    op.drop_index('idx_presets_creator', 'conversation_presets')
    op.drop_table('conversation_presets')
