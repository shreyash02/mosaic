"""Add profile_image_url to users table.

Revision ID: add_profile_image_url
Revises: add_notifications
Create Date: 2026-02-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_profile_image_url'
down_revision: Union[str, None] = 'add_notifications'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('profile_image_url', sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'profile_image_url')
