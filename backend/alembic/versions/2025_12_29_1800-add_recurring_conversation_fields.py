"""add_recurring_conversation_fields

Revision ID: r1s2t3u4v5w6
Revises: p1q2r3s4t5u6
Create Date: 2025-12-29 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = 'r1s2t3u4v5w6'
down_revision = 'p1q2r3s4t5u6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add series_id column to conversations table
    op.add_column(
        'conversations',
        sa.Column('series_id', UUID(as_uuid=True), nullable=True)
    )

    # Create foreign key constraint for series_id
    op.create_foreign_key(
        'fk_conversations_series_id',
        'conversations', 'conversations',
        ['series_id'], ['id'],
        ondelete='CASCADE'
    )

    # Create index for series_id
    op.create_index(
        'idx_conversations_series_id',
        'conversations',
        ['series_id']
    )

    # Add is_recurring_instance column
    op.add_column(
        'conversations',
        sa.Column('is_recurring_instance', sa.Boolean(), nullable=False, server_default='false')
    )

    # Add recurrence_pattern column
    op.add_column(
        'conversations',
        sa.Column('recurrence_pattern', sa.String(50), nullable=True)
    )

    # Add next_instance_date column
    op.add_column(
        'conversations',
        sa.Column('next_instance_date', sa.DateTime(), nullable=True)
    )

    # Add recurrence_end_date column
    op.add_column(
        'conversations',
        sa.Column('recurrence_end_date', sa.DateTime(), nullable=True)
    )


def downgrade() -> None:
    # Drop columns in reverse order
    op.drop_column('conversations', 'recurrence_end_date')
    op.drop_column('conversations', 'next_instance_date')
    op.drop_column('conversations', 'recurrence_pattern')
    op.drop_column('conversations', 'is_recurring_instance')

    # Drop index
    op.drop_index('idx_conversations_series_id', table_name='conversations')

    # Drop foreign key constraint
    op.drop_constraint(
        'fk_conversations_series_id',
        'conversations',
        type_='foreignkey'
    )

    # Drop series_id column
    op.drop_column('conversations', 'series_id')
