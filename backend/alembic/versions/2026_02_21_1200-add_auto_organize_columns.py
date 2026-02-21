"""Add auto-organize tracking columns to spaces.

Revision ID: add_auto_organize_columns
Revises: add_theme_events
Create Date: 2026-02-21 12:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "add_auto_organize_columns"
down_revision: Union[str, None] = "add_theme_events"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("spaces", sa.Column("auto_organize", sa.Boolean(), nullable=False, server_default=sa.text("true")))
    op.add_column("spaces", sa.Column("last_organized_at", sa.DateTime(), nullable=True))
    op.add_column("spaces", sa.Column("ideas_at_last_organize", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("spaces", "ideas_at_last_organize")
    op.drop_column("spaces", "last_organized_at")
    op.drop_column("spaces", "auto_organize")
