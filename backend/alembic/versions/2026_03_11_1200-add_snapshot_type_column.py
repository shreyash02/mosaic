"""Add snapshot_type column to space_snapshots

Revision ID: b4e2c3d5f6a7
Revises: a3f1b2c4d5e6
Create Date: 2026-03-11 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = "b4e2c3d5f6a7"
down_revision = "a3f1b2c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "space_snapshots",
        sa.Column("snapshot_type", sa.String(20), nullable=False, server_default="manual"),
    )


def downgrade() -> None:
    op.drop_column("space_snapshots", "snapshot_type")
