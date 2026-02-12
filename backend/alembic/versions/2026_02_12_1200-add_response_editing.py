"""Add response editing support

Revision ID: add_response_editing
Revises: add_recurrence_paused
Create Date: 2026-02-12 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_response_editing'
down_revision = 'add_recurrence_paused'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add editing fields to responses table
    op.add_column('responses', sa.Column('edited_at', sa.DateTime, nullable=True))
    op.add_column('responses', sa.Column('is_edited', sa.Boolean, nullable=False, server_default='false'))

    # Add allow_response_editing to conversations table
    op.add_column(
        'conversations',
        sa.Column('allow_response_editing', sa.Boolean, nullable=False, server_default='false')
    )


def downgrade() -> None:
    op.drop_column('conversations', 'allow_response_editing')
    op.drop_column('responses', 'is_edited')
    op.drop_column('responses', 'edited_at')
