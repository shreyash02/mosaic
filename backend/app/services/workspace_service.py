"""Workspace service for creating and managing workspaces."""

from uuid import UUID
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from sqlalchemy import union

from app.models.workspace import Workspace, WorkspaceMember
from app.models.organization import OrganizationMember
from app.models.user import User


def resolve_workspace_id(
    db: Session,
    workspace_id: Optional[UUID] = None,
    organization_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
) -> UUID:
    """
    Resolve a workspace ID from the available inputs.

    Priority: workspace_id > org default workspace > personal workspace.
    This is the backward-compat bridge: if only organization_id is provided,
    it looks up the org's default workspace.
    """
    if workspace_id:
        # Verify workspace exists
        ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not ws:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workspace not found",
            )
        return ws.id

    if organization_id:
        ws = (
            db.query(Workspace)
            .filter(
                Workspace.organization_id == organization_id,
                Workspace.type == "organization",
                Workspace.is_default == True,
            )
            .first()
        )
        if not ws:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Default workspace not found for this organization",
            )
        return ws.id

    # Fall back to user's personal workspace (no org)
    if user_id:
        ws = (
            db.query(Workspace)
            .filter(
                Workspace.owner_id == user_id,
                Workspace.type == "personal",
                Workspace.organization_id.is_(None),
                Workspace.is_default == True,
            )
            .first()
        )
        if not ws:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Personal workspace not found",
            )
        return ws.id

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Either workspace_id, organization_id, or user context is required",
    )


def check_workspace_membership(
    db: Session, workspace_id: UUID, user_id: UUID
) -> Optional[WorkspaceMember]:
    """Return WorkspaceMember if user is a member, else None."""
    return (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
        .first()
    )


def check_workspace_access(db: Session, workspace_id: UUID, user_id: UUID) -> bool:
    """Check if user can access a workspace (explicit member or open org member)."""
    member = check_workspace_membership(db, workspace_id, user_id)
    if member:
        return True

    # Check if it's an open org workspace and user is an org member
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if workspace and workspace.visibility == "open" and workspace.organization_id:
        org_member = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == workspace.organization_id,
                OrganizationMember.user_id == user_id,
            )
            .first()
        )
        return org_member is not None
    return False


def require_workspace_membership(
    db: Session, workspace_id: UUID, user: User
) -> WorkspaceMember:
    """Return WorkspaceMember or raise 403 if user is not a workspace member."""
    member = check_workspace_membership(db, workspace_id, user.id)
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this workspace",
        )
    return member


def get_user_workspace_ids(db: Session, user_id: UUID):
    """Return a subquery of workspace IDs the user can access.

    This is the union of:
    1. Workspaces where the user is an explicit WorkspaceMember
    2. Open org workspaces where the user is an org member
    """
    explicit = (
        db.query(WorkspaceMember.workspace_id)
        .filter(WorkspaceMember.user_id == user_id)
    )
    open_org = (
        db.query(Workspace.id)
        .join(OrganizationMember, OrganizationMember.organization_id == Workspace.organization_id)
        .filter(
            Workspace.visibility == "open",
            OrganizationMember.user_id == user_id,
        )
    )
    return explicit.union(open_org).subquery()


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


def create_default_org_workspace(
    db: Session,
    organization_id: UUID,
    org_name: str,
    creator_id: UUID,
) -> Workspace:
    """
    Create the default organization workspace and add the creator as admin.

    Called when a new organization is created. Caller controls the
    transaction — this function only flushes.

    Args:
        db: Database session
        organization_id: The new organization's ID
        org_name: Organization name (used as workspace name)
        creator_id: User ID of the org creator

    Returns:
        The created Workspace
    """
    workspace = Workspace(
        type="organization",
        name=org_name,
        owner_id=creator_id,
        organization_id=organization_id,
        is_default=True,
    )
    db.add(workspace)
    db.flush()

    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=creator_id,
        role="admin",
    )
    db.add(member)
    db.flush()

    return workspace


def add_user_to_default_org_workspace(
    db: Session,
    organization_id: UUID,
    user_id: UUID,
    role: str = "member",
) -> Optional[WorkspaceMember]:
    """
    Add a user to an organization's default workspace.

    Called when a user joins an org (direct add or invite accept).
    Caller controls the transaction — this function only flushes.

    Args:
        db: Database session
        organization_id: The organization's ID
        user_id: User to add
        role: Workspace role (default 'member')

    Returns:
        The created WorkspaceMember, or None if no default workspace found
    """
    workspace = (
        db.query(Workspace)
        .filter(
            Workspace.organization_id == organization_id,
            Workspace.type == "organization",
            Workspace.is_default == True,
        )
        .first()
    )
    if not workspace:
        return None

    # Check if already a member
    existing = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace.id,
            WorkspaceMember.user_id == user_id,
        )
        .first()
    )
    if existing:
        return existing

    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=user_id,
        role=role,
    )
    db.add(member)
    db.flush()

    return member
