"""Add clustering_mode column to spaces.

Revision ID: add_clustering_mode
Revises: add_auto_organize_columns
Create Date: 2026-02-21 14:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision: str = "add_clustering_mode"
down_revision: Union[str, None] = "add_auto_organize_columns"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("spaces", sa.Column("clustering_mode", sa.String(20), nullable=False, server_default=sa.text("'llm'")))


def downgrade() -> None:
    op.drop_column("spaces", "clustering_mode")
