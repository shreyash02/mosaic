"""Add email_preferences to users

Revision ID: add_email_preferences
Revises: add_closing_warning_sent_at
Create Date: 2026-02-13 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'add_email_preferences'
down_revision: Union[str, None] = 'add_closing_warning_sent_at'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email_preferences JSON column to users table
    op.add_column('users', sa.Column('email_preferences', sa.JSON(), nullable=True))


def downgrade() -> None:
    # Remove email_preferences column
    op.drop_column('users', 'email_preferences')
