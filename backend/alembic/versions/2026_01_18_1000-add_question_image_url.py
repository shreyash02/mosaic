"""Add question_image_url field to questions table.

Revision ID: add_question_image
Revises:
Create Date: 2026-01-18 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_question_image'
down_revision: Union[str, None] = 'add_continuous_conversations'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add question_image_url column to questions table
    op.add_column(
        'questions',
        sa.Column('question_image_url', sa.String(500), nullable=True)
    )


def downgrade() -> None:
    # Remove question_image_url column
    op.drop_column('questions', 'question_image_url')
