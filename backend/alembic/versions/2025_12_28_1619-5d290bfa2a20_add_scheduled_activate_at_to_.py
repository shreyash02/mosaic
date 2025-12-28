"""add_scheduled_activate_at_to_conversations

Revision ID: 5d290bfa2a20
Revises: bc90aac0779d
Create Date: 2025-12-28 16:19:24.720366

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '5d290bfa2a20'
down_revision = 'bc90aac0779d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add scheduled_activate_at column to conversations table
    op.add_column('conversations', sa.Column('scheduled_activate_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove scheduled_activate_at column from conversations table
    op.drop_column('conversations', 'scheduled_activate_at')
