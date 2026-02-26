"""Workspace service for creating and managing workspaces."""

from uuid import UUID
from typing import Optional
from sqlalchemy.orm import Session

from app.models.workspace import Workspace, WorkspaceMember


def create_personal_workspace(
    db: Session,
    user_id: UUID,
    organization_id: Optional[UUID] = None,
) -> Workspace:
    """
    Create a personal workspace for a user.

    Works for both global personal (org_id=None) and org-personal
    (org_id=X) workspaces. Caller controls the transaction — this
    function only flushes.

    Args:
        db: Database session
        user_id: Owner user ID
        organization_id: Optional org ID for org-personal workspaces

    Returns:
        The created Workspace
    """
    workspace = Workspace(
        type="personal",
        name="Personal",
        owner_id=user_id,
        organization_id=organization_id,
        is_default=True,
    )
    db.add(workspace)
    db.flush()

    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user_id,
        role="admin",
    )
    db.add(member)
    db.flush()

    return workspace
