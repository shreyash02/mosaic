"""Add conversation_reminders and conversation_announcements tables.

Revision ID: add_reminders_and_announcements
Revises: add_email_preferences
Create Date: 2026-02-13 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'add_reminders_and_announcements'
down_revision: Union[str, None] = 'add_email_preferences'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create conversation_reminders table
    op.create_table(
        'conversation_reminders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('reminder_type', sa.String(50), nullable=False),
        sa.Column('scheduled_at', sa.DateTime, nullable=True),
        sa.Column('status', sa.String(50), default='pending', nullable=False),
        sa.Column('sent_at', sa.DateTime, nullable=True),
        sa.Column('recipients_count', sa.Integer, default=0),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )

    # Create indexes for conversation_reminders
    op.create_index('idx_conversation_reminders_conversation', 'conversation_reminders', ['conversation_id'])
    op.create_index('idx_conversation_reminders_status_scheduled', 'conversation_reminders', ['status', 'scheduled_at'])

    # Create conversation_announcements table
    op.create_table(
        'conversation_announcements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('sent_at', sa.DateTime, nullable=True),
        sa.Column('recipients_count', sa.Integer, default=0),
        sa.Column('created_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False),
    )

    # Create indexes for conversation_announcements
    op.create_index('idx_conversation_announcements_conversation', 'conversation_announcements', ['conversation_id'])
    op.create_index('idx_conversation_announcements_sent_at', 'conversation_announcements', ['sent_at'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_conversation_announcements_sent_at', table_name='conversation_announcements')
    op.drop_index('idx_conversation_announcements_conversation', table_name='conversation_announcements')
    op.drop_index('idx_conversation_reminders_status_scheduled', table_name='conversation_reminders')
    op.drop_index('idx_conversation_reminders_conversation', table_name='conversation_reminders')

    # Drop tables
    op.drop_table('conversation_announcements')
    op.drop_table('conversation_reminders')
