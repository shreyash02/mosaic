"""Add workspace_activity_logs table for workspace-wide activity tracking.

Revision ID: d6e4f5a7b8c9
Revises: c5d3e4f6a7b8
Create Date: 2026-03-11 15:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = "d6e4f5a7b8c9"
down_revision = "c5d3e4f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workspace_activity_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "workspace_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("workspaces.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("user_name", sa.String(255), nullable=True),
        sa.Column("event_type", sa.String(50), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("entity_name", sa.String(500), nullable=True),
        sa.Column("detail", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime,
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_workspace_activity_logs_ws_created",
        "workspace_activity_logs",
        ["workspace_id", "created_at"],
    )
    op.create_index(
        "ix_workspace_activity_logs_event_type",
        "workspace_activity_logs",
        ["event_type"],
    )


def downgrade() -> None:
    op.drop_index("ix_workspace_activity_logs_event_type", table_name="workspace_activity_logs")
    op.drop_index("ix_workspace_activity_logs_ws_created", table_name="workspace_activity_logs")
    op.drop_table("workspace_activity_logs")
