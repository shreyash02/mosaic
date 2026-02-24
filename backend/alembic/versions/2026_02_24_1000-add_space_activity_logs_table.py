"""Add space_activity_logs table for general space activity tracking.

Revision ID: add_space_activity_logs
Revises: rename_member_to_editor
Create Date: 2026-02-24 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "add_space_activity_logs"
down_revision = "rename_member_to_editor"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "space_activity_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "space_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("spaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_name", sa.String(255), nullable=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("detail", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_space_activity_logs_space_created",
        "space_activity_logs",
        ["space_id", "created_at"],
    )
    op.create_index(
        "ix_space_activity_logs_event_type",
        "space_activity_logs",
        ["event_type"],
    )


def downgrade() -> None:
    op.drop_index("ix_space_activity_logs_event_type", table_name="space_activity_logs")
    op.drop_index("ix_space_activity_logs_space_created", table_name="space_activity_logs")
    op.drop_table("space_activity_logs")
