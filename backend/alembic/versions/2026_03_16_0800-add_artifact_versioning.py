"""Add versioning columns to space_artifacts.

Revision ID: g9b7c2d3e4f5
Revises: f8a6b9c1d2e3
Create Date: 2026-03-16 08:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "g9b7c2d3e4f5"
down_revision = "f8a6b9c1d2e3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("space_artifacts", sa.Column("parent_id", UUID(as_uuid=True), nullable=True))
    op.add_column("space_artifacts", sa.Column("version", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("space_artifacts", sa.Column("refinement", sa.Text(), nullable=True))
    op.create_foreign_key(
        "fk_space_artifacts_parent_id",
        "space_artifacts",
        "space_artifacts",
        ["parent_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index("idx_space_artifacts_parent", "space_artifacts", ["parent_id"])


def downgrade() -> None:
    op.drop_index("idx_space_artifacts_parent")
    op.drop_constraint("fk_space_artifacts_parent_id", "space_artifacts", type_="foreignkey")
    op.drop_column("space_artifacts", "refinement")
    op.drop_column("space_artifacts", "version")
    op.drop_column("space_artifacts", "parent_id")
