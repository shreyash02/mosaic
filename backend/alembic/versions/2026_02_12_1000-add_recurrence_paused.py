"""Add recurrence_paused to conversations

Revision ID: add_recurrence_paused
Revises: add_slack_integration
Create Date: 2026-02-12 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_recurrence_paused'
down_revision = 'add_slack_integration'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add recurrence_paused column to conversations table
    op.add_column(
        'conversations',
        sa.Column('recurrence_paused', sa.Boolean, nullable=False, server_default='false')
    )


def downgrade() -> None:
    op.drop_column('conversations', 'recurrence_paused')
