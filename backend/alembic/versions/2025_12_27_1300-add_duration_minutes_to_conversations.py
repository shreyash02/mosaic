"""add_duration_minutes_to_conversations

Revision ID: g8h9i0j1k2l3
Revises: f7g8h9i0j1k2
Create Date: 2025-12-27 13:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'g8h9i0j1k2l3'
down_revision = 'f7g8h9i0j1k2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add duration_minutes column to conversations table
    op.add_column('conversations', sa.Column('duration_minutes', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove duration_minutes column from conversations table
    op.drop_column('conversations', 'duration_minutes')

