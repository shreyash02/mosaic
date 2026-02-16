"""Add notifications table for in-app notifications.

Revision ID: add_notifications
Revises: seed_tier_limits
Create Date: 2026-02-15 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'add_notifications'
down_revision: Union[str, None] = 'seed_tier_limits'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create notifications table
    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('notification_type', sa.String(50), nullable=False),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=True),
        sa.Column('entity_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('data', postgresql.JSON, nullable=True),
        sa.Column('read', sa.Boolean, default=False, nullable=False),
        sa.Column('read_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )

    # Create indexes for efficient querying
    op.create_index('idx_notifications_user_id', 'notifications', ['user_id'])
    op.create_index('idx_notifications_type', 'notifications', ['notification_type'])
    op.create_index('idx_notifications_read', 'notifications', ['read'])
    op.create_index('idx_notifications_created_at', 'notifications', ['created_at'])
    op.create_index('idx_notifications_user_read', 'notifications', ['user_id', 'read'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_notifications_user_read', table_name='notifications')
    op.drop_index('idx_notifications_created_at', table_name='notifications')
    op.drop_index('idx_notifications_read', table_name='notifications')
    op.drop_index('idx_notifications_type', table_name='notifications')
    op.drop_index('idx_notifications_user_id', table_name='notifications')

    # Drop table
    op.drop_table('notifications')
