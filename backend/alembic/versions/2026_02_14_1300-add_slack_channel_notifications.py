"""Add Slack channel notification fields to conversations

Revision ID: add_slack_channel_notifications
Revises: add_email_verification
Create Date: 2026-02-14 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_slack_channel_notifications'
down_revision: Union[str, None] = 'add_email_verification'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add Slack channel notification columns to conversations table
    op.add_column('conversations', sa.Column('slack_channel_id', sa.String(50), nullable=True))
    op.add_column('conversations', sa.Column('slack_channel_name', sa.String(255), nullable=True))
    op.add_column('conversations', sa.Column('slack_notify_on_activate', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('conversations', sa.Column('slack_notify_on_close', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('conversations', sa.Column('slack_notify_on_analysis', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('conversations', 'slack_notify_on_analysis')
    op.drop_column('conversations', 'slack_notify_on_close')
    op.drop_column('conversations', 'slack_notify_on_activate')
    op.drop_column('conversations', 'slack_channel_name')
    op.drop_column('conversations', 'slack_channel_id')
