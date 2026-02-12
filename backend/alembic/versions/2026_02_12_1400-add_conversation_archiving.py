"""Add conversation archiving support.

Revision ID: add_conversation_archiving
Revises: add_response_editing
Create Date: 2026-02-12 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_conversation_archiving'
down_revision = 'add_response_editing'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_archived field to conversations table
    op.add_column('conversations', sa.Column('is_archived', sa.Boolean, nullable=False, server_default='false'))
    op.add_column('conversations', sa.Column('archived_at', sa.DateTime, nullable=True))


def downgrade() -> None:
    op.drop_column('conversations', 'archived_at')
    op.drop_column('conversations', 'is_archived')
