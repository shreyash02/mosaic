"""add_timezone_to_conversations

Revision ID: i0j1k2l3m4n5
Revises: h9i0j1k2l3m4
Create Date: 2025-12-28 09:06:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'i0j1k2l3m4n5'
down_revision = 'h9i0j1k2l3m4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add timezone column to conversations table
    op.add_column('conversations', sa.Column('timezone', sa.String(length=100), nullable=True, server_default='UTC'))


def downgrade() -> None:
    # Remove timezone column from conversations table
    op.drop_column('conversations', 'timezone')

