"""Add feature tiers support

Revision ID: add_feature_tiers
Revises: add_feature_flags
Create Date: 2026-02-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = 'add_feature_tiers'
down_revision: Union[str, None] = 'add_feature_flags'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create subscriptions table
    op.create_table(
        'subscriptions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('organization_id', UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True),
        sa.Column('tier', sa.String(20), nullable=False, server_default='free'),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('started_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('expires_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'))
    )

    # Constraint: either user_id OR organization_id, not both
    op.create_check_constraint(
        'ck_subscription_scope',
        'subscriptions',
        '(user_id IS NOT NULL AND organization_id IS NULL) OR (user_id IS NULL AND organization_id IS NOT NULL)'
    )

    # Partial unique indexes for one subscription per user/org
    op.execute(
        'CREATE UNIQUE INDEX uq_subscription_user ON subscriptions(user_id) WHERE user_id IS NOT NULL'
    )
    op.execute(
        'CREATE UNIQUE INDEX uq_subscription_org ON subscriptions(organization_id) WHERE organization_id IS NOT NULL'
    )

    # Regular indexes for lookups
    op.execute(
        'CREATE INDEX idx_subscription_user ON subscriptions(user_id) WHERE user_id IS NOT NULL'
    )
    op.execute(
        'CREATE INDEX idx_subscription_org ON subscriptions(organization_id) WHERE organization_id IS NOT NULL'
    )

    # Add tier column to feature_flag_overrides
    op.add_column('feature_flag_overrides', sa.Column('tier', sa.String(20), nullable=True))

    # Drop old constraint and add new one that includes tier
    op.drop_constraint('ck_override_has_scope', 'feature_flag_overrides')
    op.create_check_constraint(
        'ck_override_has_scope',
        'feature_flag_overrides',
        '(tier IS NOT NULL) OR (organization_id IS NOT NULL) OR (user_id IS NOT NULL)'
    )

    # Add index for tier lookups
    op.create_index('idx_override_flag_tier', 'feature_flag_overrides', ['flag_id', 'tier'])

    # Create feature_usage table
    op.create_table(
        'feature_usage',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True),
        sa.Column('organization_id', UUID(as_uuid=True),
                  sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=True),
        sa.Column('feature_slug', sa.String(100), nullable=False),
        sa.Column('period', sa.String(7), nullable=False),  # 'YYYY-MM' format
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'))
    )

    # Constraint: either user_id OR organization_id, not both
    op.create_check_constraint(
        'ck_usage_scope',
        'feature_usage',
        '(user_id IS NOT NULL AND organization_id IS NULL) OR (user_id IS NULL AND organization_id IS NOT NULL)'
    )

    # Unique constraints for user and org usage separately
    op.execute(
        'CREATE UNIQUE INDEX uq_usage_user ON feature_usage(user_id, feature_slug, period) WHERE user_id IS NOT NULL'
    )
    op.execute(
        'CREATE UNIQUE INDEX uq_usage_org ON feature_usage(organization_id, feature_slug, period) WHERE organization_id IS NOT NULL'
    )

    # Indexes for efficient lookups
    op.execute(
        'CREATE INDEX idx_usage_user ON feature_usage(feature_slug, user_id, period) WHERE user_id IS NOT NULL'
    )
    op.execute(
        'CREATE INDEX idx_usage_org ON feature_usage(feature_slug, organization_id, period) WHERE organization_id IS NOT NULL'
    )


def downgrade() -> None:
    # Drop feature_usage table
    op.drop_index('idx_usage_org', 'feature_usage')
    op.drop_index('idx_usage_user', 'feature_usage')
    op.drop_index('uq_usage_org', 'feature_usage')
    op.drop_index('uq_usage_user', 'feature_usage')
    op.drop_constraint('ck_usage_scope', 'feature_usage')
    op.drop_table('feature_usage')

    # Remove tier from feature_flag_overrides
    op.drop_index('idx_override_flag_tier', 'feature_flag_overrides')
    op.drop_constraint('ck_override_has_scope', 'feature_flag_overrides')
    op.create_check_constraint(
        'ck_override_has_scope',
        'feature_flag_overrides',
        '(organization_id IS NOT NULL) OR (user_id IS NOT NULL)'
    )
    op.drop_column('feature_flag_overrides', 'tier')

    # Drop subscriptions table
    op.drop_index('idx_subscription_org', 'subscriptions')
    op.drop_index('idx_subscription_user', 'subscriptions')
    op.drop_index('uq_subscription_org', 'subscriptions')
    op.drop_index('uq_subscription_user', 'subscriptions')
    op.drop_constraint('ck_subscription_scope', 'subscriptions')
    op.drop_table('subscriptions')
