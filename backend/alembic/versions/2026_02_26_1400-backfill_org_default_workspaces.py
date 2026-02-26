"""Backfill default organization workspaces and their members.

Creates one default workspace per organization, then copies all
organization members into those workspaces with matching roles.

Revision ID: backfill_org_default_workspaces
Revises: backfill_personal_workspaces
Create Date: 2026-02-26 14:00:00.000000
"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "backfill_org_default_workspaces"
down_revision: Union[str, None] = "backfill_personal_workspaces"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Create one default workspace per organization
    # ------------------------------------------------------------------
    op.execute(
        """
        INSERT INTO workspaces (id, type, name, owner_id, organization_id, is_default, created_at, updated_at)
        SELECT
            gen_random_uuid(),
            'organization',
            o.name,
            o.created_by,
            o.id,
            true,
            now(),
            now()
        FROM organizations o
        WHERE NOT EXISTS (
            SELECT 1 FROM workspaces w
            WHERE w.organization_id = o.id
              AND w.type = 'organization'
        )
        """
    )

    # ------------------------------------------------------------------
    # 2. Copy all org members into the default workspace, preserving roles
    # ------------------------------------------------------------------
    op.execute(
        """
        INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
        SELECT w.id, om.user_id, om.role, om.joined_at
        FROM workspaces w
        JOIN organization_members om ON om.organization_id = w.organization_id
        WHERE w.type = 'organization'
          AND w.is_default = true
          AND NOT EXISTS (
              SELECT 1 FROM workspace_members wm
              WHERE wm.workspace_id = w.id
                AND wm.user_id = om.user_id
          )
        """
    )


def downgrade() -> None:
    # Remove workspace members for org workspaces first (FK constraint)
    op.execute(
        """
        DELETE FROM workspace_members
        WHERE workspace_id IN (
            SELECT id FROM workspaces
            WHERE type = 'organization'
        )
        """
    )

    # Then remove the org workspaces themselves
    op.execute(
        "DELETE FROM workspaces WHERE type = 'organization'"
    )
