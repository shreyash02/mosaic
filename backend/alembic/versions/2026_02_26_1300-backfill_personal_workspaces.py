"""Backfill global personal workspaces for all existing users.

Replaces the overly-restrictive partial unique index from Step 1
(one personal workspace per user, period) with two narrower indexes
that allow one *global* personal workspace (org_id IS NULL) and one
*org-personal* workspace per org.

Then inserts a global personal workspace + admin membership for every
user who doesn't already have one.

Revision ID: backfill_personal_workspaces
Revises: create_workspaces_tables
Create Date: 2026-02-26 13:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "backfill_personal_workspaces"
down_revision: Union[str, None] = "create_workspaces_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Replace the single partial unique index with two narrower ones
    # ------------------------------------------------------------------
    op.execute("DROP INDEX IF EXISTS uq_one_personal_workspace")

    # One global personal workspace per user (org_id IS NULL)
    op.execute(
        "CREATE UNIQUE INDEX uq_one_global_personal_workspace "
        "ON workspaces (owner_id) "
        "WHERE type = 'personal' AND organization_id IS NULL"
    )

    # One org-personal workspace per user per org
    op.execute(
        "CREATE UNIQUE INDEX uq_one_org_personal_workspace "
        "ON workspaces (owner_id, organization_id) "
        "WHERE type = 'personal' AND organization_id IS NOT NULL"
    )

    # ------------------------------------------------------------------
    # 2. Backfill: create a global personal workspace for every user
    #    that doesn't already have one
    # ------------------------------------------------------------------
    op.execute(
        """
        INSERT INTO workspaces (id, type, name, owner_id, organization_id, is_default, created_at, updated_at)
        SELECT
            gen_random_uuid(),
            'personal',
            'Personal',
            u.id,
            NULL,
            true,
            now(),
            now()
        FROM users u
        WHERE NOT EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.owner_id = u.id
              AND w.type = 'personal'
              AND w.organization_id IS NULL
        )
        """
    )

    # ------------------------------------------------------------------
    # 3. Backfill: add an admin workspace_member row for each new workspace
    # ------------------------------------------------------------------
    op.execute(
        """
        INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
        SELECT w.id, w.owner_id, 'admin', now()
        FROM workspaces w
        WHERE w.type = 'personal'
          AND w.organization_id IS NULL
          AND NOT EXISTS (
              SELECT 1 FROM workspace_members wm
              WHERE wm.workspace_id = w.id
                AND wm.user_id = w.owner_id
          )
        """
    )


def downgrade() -> None:
    # Remove backfilled data
    op.execute(
        """
        DELETE FROM workspace_members
        WHERE workspace_id IN (
            SELECT id FROM workspaces
            WHERE type = 'personal' AND organization_id IS NULL
        )
        """
    )
    op.execute(
        "DELETE FROM workspaces WHERE type = 'personal' AND organization_id IS NULL"
    )

    # Restore the original single partial unique index
    op.execute("DROP INDEX IF EXISTS uq_one_org_personal_workspace")
    op.execute("DROP INDEX IF EXISTS uq_one_global_personal_workspace")
    op.execute(
        "CREATE UNIQUE INDEX uq_one_personal_workspace "
        "ON workspaces (owner_id) WHERE type = 'personal'"
    )
