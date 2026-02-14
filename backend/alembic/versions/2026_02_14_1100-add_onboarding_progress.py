"""Add onboarding_progress to users

Revision ID: add_onboarding_progress
Revises: add_full_text_search
Create Date: 2026-02-14 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_onboarding_progress'
down_revision: Union[str, None] = 'add_full_text_search'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add onboarding_progress JSON column to users table
    op.add_column('users', sa.Column('onboarding_progress', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Remove onboarding_progress column
    op.drop_column('users', 'onboarding_progress')
