"""Workspace routes."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, WORKSPACE_ROLES
from app.models.organization import OrganizationMember
from app.schemas.workspace import WorkspaceResponse, WorkspaceCreate, WorkspaceUpdate
from app.services.workspace_service import check_workspace_membership, require_workspace_role, check_workspace_access
from app.services.workspace_activity_service import log_activity
from app.models.workspace_activity_log import WorkspaceActivityLog

router = APIRouter()


class AddMemberRequest(BaseModel):
    user_id: UUID
    role: str = "editor"


class UpdateMemberRoleRequest(BaseModel):
    role: str


class WorkspaceMemberResponse(BaseModel):
    user_id: UUID
    display_name: Optional[str] = None
    email: Optional[str] = None
    role: str
    joined_at: Optional[str] = None

    class Config:
        from_attributes = True


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

    require_workspace_role(db, workspace_id, current_user, "admin")

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

    require_workspace_role(db, workspace_id, current_user, "admin")

    db.delete(workspace)
    db.commit()


@router.get("/{workspace_id}/members", response_model=List[WorkspaceMemberResponse])
async def list_workspace_members(
    workspace_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List members of a workspace. Any workspace member can view."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    require_workspace_role(db, workspace_id, current_user, "viewer")

    members = (
        db.query(WorkspaceMember, User)
        .join(User, WorkspaceMember.user_id == User.id)
        .filter(WorkspaceMember.workspace_id == workspace_id)
        .order_by(WorkspaceMember.joined_at)
        .all()
    )

    return [
        WorkspaceMemberResponse(
            user_id=member.user_id,
            display_name=user.display_name if hasattr(user, "display_name") else user.email,
            email=user.email,
            role=member.role,
            joined_at=member.joined_at.isoformat() if member.joined_at else None,
        )
        for member, user in members
    ]


@router.post("/{workspace_id}/members", status_code=status.HTTP_201_CREATED)
async def add_workspace_member(
    workspace_id: UUID,
    data: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a member to a workspace. Requires workspace admin or org admin."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    require_workspace_role(db, workspace_id, current_user, "admin")

    # Validate role
    if data.role not in WORKSPACE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(WORKSPACE_ROLES)}",
        )

    # Target user must be an org member
    if workspace.organization_id:
        org_member = (
            db.query(OrganizationMember)
            .filter(
                OrganizationMember.organization_id == workspace.organization_id,
                OrganizationMember.user_id == data.user_id,
            )
            .first()
        )
        if not org_member:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User must be a member of the organization",
            )

    # Check if already a member
    existing = check_workspace_membership(db, workspace_id, data.user_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a workspace member",
        )

    member = WorkspaceMember(
        workspace_id=workspace_id,
        user_id=data.user_id,
        role=data.role,
    )
    db.add(member)

    # Look up added user's name for the activity log
    added_user = db.query(User).filter(User.id == data.user_id).first()
    added_user_name = added_user.full_name or added_user.email if added_user else None
    log_activity(
        db,
        workspace_id=workspace_id,
        event_type="member_joined",
        user_id=current_user.id,
        user_name=current_user.full_name or current_user.email,
        entity_type="member",
        entity_id=data.user_id,
        entity_name=added_user_name,
        detail=f"Added as {data.role}",
    )

    db.commit()

    return {"status": "added", "role": data.role}


@router.patch("/{workspace_id}/members/{user_id}")
async def update_member_role(
    workspace_id: UUID,
    user_id: UUID,
    data: UpdateMemberRoleRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a workspace member's role. Requires admin."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")

    require_workspace_role(db, workspace_id, current_user, "admin")

    # Validate role
    if data.role not in WORKSPACE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(WORKSPACE_ROLES)}",
        )

    member = check_workspace_membership(db, workspace_id, user_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # Prevent demoting self if last admin
    if user_id == current_user.id and member.role == "admin" and data.role != "admin":
        admin_count = (
            db.query(func.count(WorkspaceMember.user_id))
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.role == "admin",
            )
            .scalar()
        )
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot demote the last admin. Promote another member first.",
            )

    member.role = data.role
    db.commit()

    return {"status": "updated", "role": data.role}


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
        require_workspace_role(db, workspace_id, current_user, "admin")

    member = check_workspace_membership(db, workspace_id, user_id)
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")

    # Prevent removing the last admin
    if member.role == "admin":
        admin_count = (
            db.query(func.count(WorkspaceMember.user_id))
            .filter(
                WorkspaceMember.workspace_id == workspace_id,
                WorkspaceMember.role == "admin",
            )
            .scalar()
        )
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin. Promote another member first.",
            )

    # Log before delete so we can reference the member
    removed_user = db.query(User).filter(User.id == user_id).first()
    removed_user_name = removed_user.full_name or removed_user.email if removed_user else None
    log_activity(
        db,
        workspace_id=workspace_id,
        event_type="member_left",
        user_id=current_user.id,
        user_name=current_user.full_name or current_user.email,
        entity_type="member",
        entity_id=user_id,
        entity_name=removed_user_name,
    )

    db.delete(member)
    db.commit()


@router.get("/{workspace_id}/activity")
async def get_workspace_activity(
    workspace_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return paginated workspace activity feed. Requires workspace access."""
    if not check_workspace_access(db, workspace_id, current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this workspace",
        )

    total = (
        db.query(func.count(WorkspaceActivityLog.id))
        .filter(WorkspaceActivityLog.workspace_id == workspace_id)
        .scalar()
    )

    items = (
        db.query(WorkspaceActivityLog)
        .filter(WorkspaceActivityLog.workspace_id == workspace_id)
        .order_by(WorkspaceActivityLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    return {
        "items": [
            {
                "id": str(item.id),
                "workspace_id": str(item.workspace_id),
                "user_id": str(item.user_id) if item.user_id else None,
                "user_name": item.user_name,
                "event_type": item.event_type,
                "entity_type": item.entity_type,
                "entity_id": str(item.entity_id) if item.entity_id else None,
                "entity_name": item.entity_name,
                "detail": item.detail,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ],
        "total": total,
        "has_more": skip + limit < total,
    }
