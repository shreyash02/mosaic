"""Add organize_run_id to space_artifacts.

Revision ID: i1d9e4f5g6h7
Revises: h0c8d3e4f5g6
Create Date: 2026-03-16 22:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "i1d9e4f5g6h7"
down_revision = "h0c8d3e4f5g6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("space_artifacts", sa.Column("organize_run_id", sa.String(50), nullable=True))
    op.create_index("idx_space_artifacts_run", "space_artifacts", ["organize_run_id"])


def downgrade() -> None:
    op.drop_index("idx_space_artifacts_run")
    op.drop_column("space_artifacts", "organize_run_id")
