"""Add continuous conversations support

Revision ID: add_continuous_conversations
Revises: add_is_required_to_questions
Create Date: 2026-01-15 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


# revision identifiers, used by Alembic.
revision = 'add_continuous_conversations'
down_revision = 'add_is_required_to_questions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add continuous conversation fields to conversations table
    op.add_column('conversations', sa.Column('is_continuous', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('conversations', sa.Column('analysis_interval', sa.String(50), nullable=True))
    op.add_column('conversations', sa.Column('next_analysis_at', sa.DateTime(), nullable=True))
    op.add_column('conversations', sa.Column('analysis_timezone', sa.String(100), nullable=True))

    # Create periodic_analyses table
    op.create_table(
        'periodic_analyses',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('period_start', sa.DateTime(), nullable=False),
        sa.Column('period_end', sa.DateTime(), nullable=False),
        sa.Column('period_label', sa.String(50), nullable=False),
        sa.Column('period_type', sa.String(20), nullable=False),
        sa.Column('overall_summary', sa.Text(), nullable=True),
        sa.Column('themes', JSONB, nullable=True),
        sa.Column('surprising_insights', JSONB, nullable=True),
        sa.Column('question_analyses', JSONB, nullable=True),
        sa.Column('embedding_provider', sa.String(50), nullable=True),
        sa.Column('embedding_model', sa.String(100), nullable=True),
        sa.Column('clustering_algorithm', sa.String(50), nullable=True),
        sa.Column('llm_provider', sa.String(50), nullable=True),
        sa.Column('llm_model', sa.String(100), nullable=True),
        sa.Column('total_responses_analyzed', sa.Integer(), nullable=True),
        sa.Column('num_clusters_found', sa.Integer(), nullable=True),
        sa.Column('analysis_duration_ms', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'))
    )
    op.create_index('idx_periodic_analyses_conversation', 'periodic_analyses', ['conversation_id'])
    op.create_index('idx_periodic_analyses_period', 'periodic_analyses', ['conversation_id', 'period_start'])
    op.create_unique_constraint('uq_periodic_analyses_label', 'periodic_analyses', ['conversation_id', 'period_label'])

    # Create continuous_trends table
    op.create_table(
        'continuous_trends',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('conversation_id', UUID(as_uuid=True), sa.ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False),
        sa.Column('trends', JSONB, nullable=True),
        sa.Column('periods_analyzed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_computed_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('computation_duration_ms', sa.Integer(), nullable=True)
    )
    op.create_unique_constraint('uq_continuous_trends_conversation', 'continuous_trends', ['conversation_id'])
    op.create_index('idx_continuous_trends_conversation', 'continuous_trends', ['conversation_id'])


def downgrade() -> None:
    # Drop continuous_trends table
    op.drop_index('idx_continuous_trends_conversation', 'continuous_trends')
    op.drop_constraint('uq_continuous_trends_conversation', 'continuous_trends')
    op.drop_table('continuous_trends')

    # Drop periodic_analyses table
    op.drop_index('idx_periodic_analyses_period', 'periodic_analyses')
    op.drop_index('idx_periodic_analyses_conversation', 'periodic_analyses')
    op.drop_constraint('uq_periodic_analyses_label', 'periodic_analyses')
    op.drop_table('periodic_analyses')

    # Remove continuous conversation fields from conversations table
    op.drop_column('conversations', 'analysis_timezone')
    op.drop_column('conversations', 'next_analysis_at')
    op.drop_column('conversations', 'analysis_interval')
    op.drop_column('conversations', 'is_continuous')
