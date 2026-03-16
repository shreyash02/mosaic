"""Add space_artifacts table.

Revision ID: f8a6b9c1d2e3
Revises: e7f5a8b9c0d1
Create Date: 2026-03-15 11:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "f8a6b9c1d2e3"
down_revision = "e7f5a8b9c0d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "space_artifacts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("space_id", UUID(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("synthesis_id", UUID(as_uuid=True), sa.ForeignKey("space_syntheses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("artifact_type", sa.String(30), nullable=False),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("content", JSONB(), nullable=True, server_default="{}"),
        sa.Column("user_context", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="generating"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_space_artifacts_space", "space_artifacts", ["space_id"])
    op.create_index("idx_space_artifacts_synthesis", "space_artifacts", ["synthesis_id"])


def downgrade() -> None:
    op.drop_index("idx_space_artifacts_synthesis")
    op.drop_index("idx_space_artifacts_space")
    op.drop_table("space_artifacts")
