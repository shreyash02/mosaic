"""Create workspaces and workspace_members tables.

Formalizes workspace as a first-class entity. Personal workspaces
(org_id is null) and organization workspaces both live here.

Revision ID: create_workspaces_tables
Revises: add_auto_analyze_skipped
Create Date: 2026-02-26 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "create_workspaces_tables"
down_revision: Union[str, None] = "add_auto_analyze_skipped"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("type IN ('personal', 'organization')", name="ck_workspaces_type"),
    )

    op.create_table(
        "workspace_members",
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="member"),
        sa.Column("joined_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("workspace_id", "user_id"),
    )

    # Indexes on workspaces
    op.create_index("idx_workspaces_organization_id", "workspaces", ["organization_id"])
    op.create_index("idx_workspaces_owner_id", "workspaces", ["owner_id"])
    op.create_index("idx_workspaces_type", "workspaces", ["type"])

    # Partial unique index: one personal workspace per user
    op.execute(
        "CREATE UNIQUE INDEX uq_one_personal_workspace ON workspaces (owner_id) WHERE type = 'personal'"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_one_personal_workspace")
    op.drop_index("idx_workspaces_type", table_name="workspaces")
    op.drop_index("idx_workspaces_owner_id", table_name="workspaces")
    op.drop_index("idx_workspaces_organization_id", table_name="workspaces")
    op.drop_table("workspace_members")
    op.drop_table("workspaces")
