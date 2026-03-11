"""Add space_shared_viewers table

Revision ID: a3f1b2c4d5e6
Revises:
Create Date: 2026-03-11 10:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "a3f1b2c4d5e6"
down_revision = "gate_progressive_launch"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "space_shared_viewers",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("space_id", UUID(as_uuid=True), sa.ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("shared_by_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("shared_user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("access_level", sa.String(20), nullable=False, server_default="snapshots"),
        sa.Column("can_export", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("space_id", "email", name="uq_space_shared_viewers_space_email"),
        sa.Index("idx_space_shared_viewers_space", "space_id"),
        sa.Index("idx_space_shared_viewers_email", "email"),
        sa.Index("idx_space_shared_viewers_user", "shared_user_id"),
    )


def downgrade() -> None:
    op.drop_table("space_shared_viewers")
