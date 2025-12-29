"""add_follow_up_conversations

Revision ID: p1q2r3s4t5u6
Revises: j1k2l3m4n5o6
Create Date: 2025-12-29 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = 'p1q2r3s4t5u6'
down_revision = 'j1k2l3m4n5o6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add parent_conversation_id column to conversations table
    op.add_column(
        'conversations',
        sa.Column('parent_conversation_id', UUID(as_uuid=True), nullable=True)
    )

    # Create foreign key constraint
    op.create_foreign_key(
        'fk_conversations_parent_conversation_id',
        'conversations', 'conversations',
        ['parent_conversation_id'], ['id'],
        ondelete='SET NULL'
    )

    # Create index for faster queries
    op.create_index(
        'idx_conversations_parent_id',
        'conversations',
        ['parent_conversation_id']
    )


def downgrade() -> None:
    # Drop index
    op.drop_index('idx_conversations_parent_id', table_name='conversations')

    # Drop foreign key constraint
    op.drop_constraint(
        'fk_conversations_parent_conversation_id',
        'conversations',
        type_='foreignkey'
    )

    # Drop column
    op.drop_column('conversations', 'parent_conversation_id')
