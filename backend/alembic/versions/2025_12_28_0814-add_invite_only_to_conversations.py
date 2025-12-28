"""add_invite_only_to_conversations

Revision ID: h9i0j1k2l3m4
Revises: g8h9i0j1k2l3
Create Date: 2025-12-28 08:14:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'h9i0j1k2l3m4'
down_revision = 'g8h9i0j1k2l3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add invite_only column to conversations table
    op.add_column('conversations', sa.Column('invite_only', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    # Remove invite_only column from conversations table
    op.drop_column('conversations', 'invite_only')

