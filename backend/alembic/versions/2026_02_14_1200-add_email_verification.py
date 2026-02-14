"""Add email verification fields to users

Revision ID: add_email_verification
Revises: add_onboarding_progress
Create Date: 2026-02-14 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_email_verification'
down_revision: Union[str, None] = 'add_onboarding_progress'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add email verification columns
    op.add_column('users', sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('users', sa.Column('email_verification_token', sa.String(64), nullable=True))
    op.add_column('users', sa.Column('email_verification_expires', sa.DateTime(timezone=True), nullable=True))

    # Create index for token lookups
    op.create_index('ix_users_email_verification_token', 'users', ['email_verification_token'])

    # Backfill: Mark existing users as verified (they've been using the system)
    op.execute("UPDATE users SET email_verified = true")

    # Remove the server default now that existing rows are backfilled
    op.alter_column('users', 'email_verified', server_default=None)


def downgrade() -> None:
    op.drop_index('ix_users_email_verification_token', table_name='users')
    op.drop_column('users', 'email_verification_expires')
    op.drop_column('users', 'email_verification_token')
    op.drop_column('users', 'email_verified')
