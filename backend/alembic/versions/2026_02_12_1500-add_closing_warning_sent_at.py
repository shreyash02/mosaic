"""Add closing_warning_sent_at to conversation_invitations.

Revision ID: add_closing_warning_sent_at
Revises: add_conversation_archiving
Create Date: 2026-02-12 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_closing_warning_sent_at'
down_revision = 'add_conversation_archiving'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add closing_warning_sent_at column to track when closing warning emails were sent
    op.add_column(
        'conversation_invitations',
        sa.Column('closing_warning_sent_at', sa.DateTime, nullable=True)
    )


def downgrade() -> None:
    op.drop_column('conversation_invitations', 'closing_warning_sent_at')
