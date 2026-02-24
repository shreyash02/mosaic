"""Add reviewed_by and reviewed_at columns to ideas for suggestion review.

Revision ID: add_suggester_role_review
Revises: add_space_activity_logs
Create Date: 2026-02-25 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_suggester_role_review"
down_revision = "add_space_activity_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "ideas",
        sa.Column(
            "reviewed_by",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "ideas",
        sa.Column("reviewed_at", sa.DateTime, nullable=True),
    )
    # Partial index for efficiently querying pending suggestions per space
    op.create_index(
        "idx_ideas_suggested",
        "ideas",
        ["space_id", "status"],
        postgresql_where=sa.text("status = 'suggested'"),
    )


def downgrade() -> None:
    op.drop_index("idx_ideas_suggested", table_name="ideas")
    op.drop_column("ideas", "reviewed_at")
    op.drop_column("ideas", "reviewed_by")
