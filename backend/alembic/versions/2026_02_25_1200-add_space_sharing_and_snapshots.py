"""Add share_access to spaces and create space_snapshots table.

Revision ID: add_space_sharing_snapshots
Revises: add_idea_image_url
Create Date: 2026-02-25 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

# revision identifiers, used by Alembic.
revision = "add_space_sharing_snapshots"
down_revision = "add_idea_image_url"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add share_access column to spaces
    op.add_column(
        "spaces",
        sa.Column("share_access", sa.String(20), nullable=True, default=None),
    )

    # Create space_snapshots table
    op.create_table(
        "space_snapshots",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "space_id",
            UUID(as_uuid=True),
            sa.ForeignKey("spaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_by_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("snapshot_data", JSONB, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime,
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    op.create_index("idx_space_snapshots_space", "space_snapshots", ["space_id"])


def downgrade() -> None:
    op.drop_index("idx_space_snapshots_space", table_name="space_snapshots")
    op.drop_table("space_snapshots")
    op.drop_column("spaces", "share_access")
