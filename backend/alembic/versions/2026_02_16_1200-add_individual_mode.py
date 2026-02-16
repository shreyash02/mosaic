"""Add individual mode (journals) support

Adds is_individual, journal_owner_id, journal_prompt columns to conversations table.
Creates journal_analyses table for cumulative temporal analysis.
Adds optimized indexes for journal queries.

Revision ID: add_individual_mode
Revises: seed_feature_flags
Create Date: 2026-02-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = 'add_individual_mode'
down_revision: Union[str, None] = 'seed_feature_flags'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add journal columns to conversations table
    op.add_column('conversations', sa.Column('is_individual', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('conversations', sa.Column('journal_owner_id', UUID(as_uuid=True), nullable=True))
    op.add_column('conversations', sa.Column('journal_prompt', sa.Text(), nullable=True))

    # Add foreign key for journal_owner_id
    op.create_foreign_key(
        'fk_conversations_journal_owner',
        'conversations', 'users',
        ['journal_owner_id'], ['id'],
        ondelete='SET NULL'
    )

    # Partial index for fast "list my journals" queries
    op.create_index(
        'idx_conversations_journal_owner',
        'conversations',
        ['journal_owner_id'],
        postgresql_where=sa.text("is_individual = true")
    )

    # Create journal_analyses table
    op.create_table(
        'journal_analyses',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('conversation_id', UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('theme_timeline', JSONB, nullable=True),
        sa.Column('mood_trajectory', JSONB, nullable=True),
        sa.Column('patterns', JSONB, nullable=True),
        sa.Column('overall_summary', sa.Text(), nullable=True),
        sa.Column('total_entries_analyzed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('date_range_start', sa.DateTime(), nullable=True),
        sa.Column('date_range_end', sa.DateTime(), nullable=True),
        sa.Column('llm_provider', sa.String(50), nullable=True),
        sa.Column('llm_model', sa.String(100), nullable=True),
        sa.Column('analysis_duration_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_index('idx_journal_analyses_conversation', 'journal_analyses', ['conversation_id'])

    # Index for paginated journal entry timeline queries
    op.create_index(
        'idx_responses_journal_timeline',
        'responses',
        ['conversation_id', sa.text('submitted_at DESC')],
        postgresql_where=sa.text("status = 'submitted'")
    )


def downgrade() -> None:
    op.drop_index('idx_responses_journal_timeline', 'responses')
    op.drop_index('idx_journal_analyses_conversation', 'journal_analyses')
    op.drop_table('journal_analyses')
    op.drop_index('idx_conversations_journal_owner', 'conversations')
    op.drop_constraint('fk_conversations_journal_owner', 'conversations', type_='foreignkey')
    op.drop_column('conversations', 'journal_prompt')
    op.drop_column('conversations', 'journal_owner_id')
    op.drop_column('conversations', 'is_individual')
