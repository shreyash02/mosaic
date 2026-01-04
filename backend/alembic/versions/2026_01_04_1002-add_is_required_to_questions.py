"""Add is_required to questions

Revision ID: add_is_required_to_questions
Revises: 2fbe0482dc6b
Create Date: 2026-01-04 10:02:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'add_is_required_to_questions'
down_revision = '2fbe0482dc6b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('questions', sa.Column('is_required', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    op.drop_column('questions', 'is_required')

