"""add_question_analyses_to_analyses

Revision ID: j1k2l3m4n5o6
Revises: 5d290bfa2a20
Create Date: 2025-12-29 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision = 'j1k2l3m4n5o6'
down_revision = '5d290bfa2a20'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add question_analyses column to analyses table
    op.add_column('analyses', sa.Column('question_analyses', JSONB, nullable=True))


def downgrade() -> None:
    # Remove question_analyses column from analyses table
    op.drop_column('analyses', 'question_analyses')
