"""Relax personal workspace uniqueness to allow multiple personal workspaces.

The original indexes enforced one personal workspace per user (global and per-org).
Now that users can create additional personal workspaces, narrow the constraint
to only enforce one *default* personal workspace per user.

Revision ID: 2026_02_27_1201
Revises: 2026_02_27_1200
Create Date: 2026-02-27
"""

from alembic import op

revision = "relax_personal_ws_uniqueness"
down_revision = "add_workspace_visibility"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the old indexes that prevent multiple personal workspaces
    op.execute("DROP INDEX IF EXISTS uq_one_global_personal_workspace")
    op.execute("DROP INDEX IF EXISTS uq_one_org_personal_workspace")

    # Re-create with is_default = true condition so only one *default* personal
    # workspace is enforced per user, while allowing additional non-default ones
    op.execute(
        "CREATE UNIQUE INDEX uq_one_global_personal_workspace "
        "ON workspaces (owner_id) "
        "WHERE type = 'personal' AND organization_id IS NULL AND is_default = true"
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_one_org_personal_workspace "
        "ON workspaces (owner_id, organization_id) "
        "WHERE type = 'personal' AND organization_id IS NOT NULL AND is_default = true"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_one_global_personal_workspace")
    op.execute("DROP INDEX IF EXISTS uq_one_org_personal_workspace")

    op.execute(
        "CREATE UNIQUE INDEX uq_one_global_personal_workspace "
        "ON workspaces (owner_id) "
        "WHERE type = 'personal' AND organization_id IS NULL"
    )
    op.execute(
        "CREATE UNIQUE INDEX uq_one_org_personal_workspace "
        "ON workspaces (owner_id, organization_id) "
        "WHERE type = 'personal' AND organization_id IS NOT NULL"
    )
