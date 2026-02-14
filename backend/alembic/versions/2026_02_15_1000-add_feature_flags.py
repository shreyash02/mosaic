"""Add feature flags system

Revision ID: add_feature_flags
Revises: add_slack_channel_notifications
Create Date: 2026-02-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = 'add_feature_flags'
down_revision: Union[str, None] = 'add_slack_channel_notifications'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create feature_flags table
    op.create_table(
        'feature_flags',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False, unique=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('config', JSONB, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index('idx_feature_flags_slug', 'feature_flags', ['slug'])

    # Create feature_flag_overrides table
    op.create_table(
        'feature_flag_overrides',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('flag_id', UUID(as_uuid=True),
                  sa.ForeignKey('feature_flags.id', ondelete='CASCADE'), nullable=False),
        sa.Column('organization_id', UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True),
        sa.Column('user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('enabled', sa.Boolean(), nullable=True),
        sa.Column('config_override', JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'))
    )

    # Constraint: at least one of organization_id or user_id must be set
    op.create_check_constraint(
        'ck_override_has_scope',
        'feature_flag_overrides',
        '(organization_id IS NOT NULL) OR (user_id IS NOT NULL)'
    )

    # Unique constraint for flag/scope combination
    op.create_unique_constraint(
        'uq_flag_override_scope',
        'feature_flag_overrides',
        ['flag_id', 'organization_id', 'user_id']
    )

    # Indexes for efficient lookups
    op.create_index('idx_override_flag_org', 'feature_flag_overrides', ['flag_id', 'organization_id'])
    op.create_index('idx_override_flag_user', 'feature_flag_overrides', ['flag_id', 'user_id'])


def downgrade() -> None:
    op.drop_index('idx_override_flag_user', 'feature_flag_overrides')
    op.drop_index('idx_override_flag_org', 'feature_flag_overrides')
    op.drop_constraint('uq_flag_override_scope', 'feature_flag_overrides')
    op.drop_constraint('ck_override_has_scope', 'feature_flag_overrides')
    op.drop_table('feature_flag_overrides')

    op.drop_index('idx_feature_flags_slug', 'feature_flags')
    op.drop_table('feature_flags')
