"""Add password reset fields to users

Revision ID: add_password_reset_fields
Revises: add_scheduler_job_logs
Create Date: 2026-02-13 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_password_reset_fields'
down_revision: Union[str, None] = 'add_scheduler_job_logs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('password_reset_token', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('password_reset_expires', sa.DateTime(), nullable=True))
    op.create_index('ix_users_password_reset_token', 'users', ['password_reset_token'])


def downgrade() -> None:
    op.drop_index('ix_users_password_reset_token', table_name='users')
    op.drop_column('users', 'password_reset_expires')
    op.drop_column('users', 'password_reset_token')
