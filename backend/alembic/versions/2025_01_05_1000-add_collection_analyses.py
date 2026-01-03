"""Add collection_analyses table

Revision ID: 2025_01_05_1000
Revises: 2025_01_04_1000
Create Date: 2025-01-05 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB


revision = '2025_01_05_1000'
down_revision = '2025_01_04_1000'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'collection_analyses',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('series_id', UUID(as_uuid=True), sa.ForeignKey('series.id', ondelete='CASCADE'), nullable=False),
        sa.Column('overall_summary', sa.Text(), nullable=True),
        sa.Column('surprising_insights', JSONB, nullable=True),
        sa.Column('question_insights', JSONB, nullable=True),
        sa.Column('trends', JSONB, nullable=True),
        sa.Column('total_conversations', sa.Integer(), nullable=False),
        sa.Column('total_responses', sa.Integer(), nullable=False),
        sa.Column('conversations_analyzed', sa.Integer(), nullable=False),
        sa.Column('conversation_ids', JSONB, nullable=False),
        sa.Column('computed_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('computation_duration_ms', sa.Integer(), nullable=True),
        sa.UniqueConstraint('series_id', name='uq_collection_analyses_series')
    )
    op.create_index('idx_collection_analyses_series', 'collection_analyses', ['series_id'])


def downgrade():
    op.drop_index('idx_collection_analyses_series', 'collection_analyses')
    op.drop_table('collection_analyses')

