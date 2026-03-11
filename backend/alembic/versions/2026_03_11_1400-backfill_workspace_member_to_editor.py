"""Backfill workspace member role from 'member' to 'editor'.

Revision ID: c5d3e4f6a7b8
Revises: b4e2c3d5f6a7
Create Date: 2026-03-11 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "c5d3e4f6a7b8"
down_revision: Union[str, None] = "b4e2c3d5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename 'member' role to 'editor' for all workspace members
    op.execute(
        "UPDATE workspace_members SET role = 'editor' WHERE role = 'member'"
    )


def downgrade() -> None:
    # Revert 'editor' back to 'member'
    op.execute(
        "UPDATE workspace_members SET role = 'member' WHERE role = 'editor'"
    )
