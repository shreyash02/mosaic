"""Add individual mode (journals) support

Creates journals table for journal-specific settings (backed by Conversation).
Creates journal_analyses table for cumulative temporal analysis.
Adds optimized indexes for journal queries.

Revision ID: add_individual_mode
Revises: add_insight_annotations
Create Date: 2026-02-16 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision: str = 'add_individual_mode'
down_revision: Union[str, None] = 'add_insight_annotations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create journals table
    op.create_table(
        'journals',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('conversation_id', UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('owner_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('entry_frequency', sa.String(50), nullable=True),
        sa.Column('strict_frequency', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )

    op.create_index('idx_journals_owner', 'journals', ['owner_id'])

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
    op.drop_index('idx_journals_owner', 'journals')
    op.drop_table('journals')
