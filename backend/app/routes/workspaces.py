"""Workspace routes."""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember
from app.models.organization import OrganizationMember
from app.schemas.workspace import WorkspaceResponse, WorkspaceCreate, WorkspaceUpdate
from app.services.workspace_service import check_workspace_membership

router = APIRouter()


@router.get("/me", response_model=List[WorkspaceResponse])
async def list_my_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all workspaces the current user can access.

    This includes:
    1. Workspaces where the user is an explicit member
    2. Open org workspaces where the user is an org member
    """
    # Explicit memberships
    explicit_ids = (
        db.query(WorkspaceMember.workspace_id)
        .filter(WorkspaceMember.user_id == current_user.id)
    )

    # Open org workspaces via org membership
    open_org_ids = (
        db.query(Workspace.id)
        .join(OrganizationMember, OrganizationMember.organization_id == Workspace.organization_id)
        .filter(
            Workspace.visibility == "open",
            OrganizationMember.user_id == current_user.id,
        )
    )

    all_ids = explicit_ids.union(open_org_ids).subquery()

    workspaces = (
        db.query(Workspace)
        .filter(Workspace.id.in_(db.query(all_ids)))
        .all()
    )
    return workspaces


@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new workspace. Can be personal (no org) or organizational."""
    # Validate visibility
    if data.visibility not in ("open", "private"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Visibility must be 'open' or 'private'",
        )

    if data.organization_id:
        # Org workspace — verify user is an org member
        org_member = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == data.organization_id,
                OrganizationMember.user_id == current_user.id,
            )
            .first()
        )
        if not org_member:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a member of this organization",
            )
        ws_type = "organization"
    else:
        # Personal workspace — always allowed, visibility forced to private
        ws_type = "personal"
        data.visibility = "private"

    workspace = Workspace(
        type=ws_type,
        name=data.name,
        description=data.description,
        organization_id=data.organization_id,
        owner_id=current_user.id,
        is_default=False,
        visibility=data.visibility,
    )
    db.add(workspace)
    db.flush()

    # Add creator as admin member
    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=current_user.id,
        role="admin",
    )
    db.add(member)
    db.commit()
    db.refresh(workspace)

    return workspace


@router.get("/org/{org_id}", response_model=List[WorkspaceResponse])
async def list_org_workspaces(
    org_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List workspaces in an org visible to the current user."""
    # Verify user is an org member
    org_member = (
        db.query(OrganizationMember)
        .filter(
            OrganizationMember.organization_id == org_id,
            OrganizationMember.user_id == current_user.id,
        )
        .first()
    )
    if not org_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this organization",
        )

    # Open workspaces + private workspaces where user is a member
    open_ws = (
        db.query(Workspace)
        .filter(
            Workspace.organization_id == org_id,
            Workspace.visibility == "open",
        )
    )

    private_ws = (
        db.query(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .filter(
            Workspace.organization_id == org_id,
            Workspace.visibility == "private",
            WorkspaceMember.user_id == current_user.id,
        )
    )

    workspaces = open_ws.union(private_ws).all()
    return workspaces


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: UUID,
    data: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a workspace. Requires workspace admin or org admin role."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    # Check permission: workspace admin or org admin
    _require_workspace_admin(db, workspace, current_user)

    # Validate visibility if provided
    if data.visibility is not None and data.visibility not in ("open", "private"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Visibility must be 'open' or 'private'",
        )

    # Default workspaces must stay open
    if workspace.is_default and data.visibility == "private":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Default workspace cannot be made private",
        )

    if data.name is not None:
        workspace.name = data.name
    if data.description is not None:
        workspace.description = data.description
    if data.visibility is not None:
        workspace.visibility = data.visibility

    db.commit()
    db.refresh(workspace)
    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a workspace. Cannot delete default workspaces."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    if workspace.is_default:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the default workspace",
        )

    # Check permission: workspace creator or org admin
    _require_workspace_admin(db, workspace, current_user)

    db.delete(workspace)
    db.commit()


@router.post("/{workspace_id}/members", status_code=status.HTTP_201_CREATED)
async def add_workspace_member(
    workspace_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a member to a workspace. Requires workspace admin or org admin."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    _require_workspace_admin(db, workspace, current_user)

    # Target user must be an org member
    if workspace.organization_id:
        org_member = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == workspace.organization_id,
                OrganizationMember.user_id == user_id,
            )
            .first()
        )
        if not org_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be a member of the organization",
            )

    # Check if already a member
    existing = check_workspace_membership(db, workspace_id, user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a workspace member",
        )

    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=user_id,
        role="member",
    )
    db.add(member)
    db.commit()

    return {"status": "added"}


@router.delete("/{workspace_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_workspace_member(
    workspace_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a member from a workspace. Admin or self can remove."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    # Allow self-removal or admin removal
    if user_id != current_user.id:
        _require_workspace_admin(db, workspace, current_user)

    member = check_workspace_membership(db, workspace_id, user_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    db.delete(member)
    db.commit()


def _require_workspace_admin(db: Session, workspace: Workspace, user: User) -> None:
    """Require the user to be a workspace admin or org admin. Raises 403 otherwise."""
    # Check workspace-level admin
    ws_member = check_workspace_membership(db, workspace.id, user.id)
    if ws_member and ws_member.role == "admin":
        return

    # Check org-level admin
    if workspace.organization_id:
        org_member = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == workspace.organization_id,
                OrganizationMember.user_id == user.id,
                OrganizationMember.role == "admin",
            )
            .first()
        )
        if org_member:
            return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You must be a workspace admin or organization admin",
    )
