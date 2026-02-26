"""Conversation preset routes."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.conversation_preset import ConversationPreset
from app.schemas.preset import (
    PresetCreate,
    PresetUpdate,
    Preset as PresetSchema,
)
from app.services.workspace_service import (
    resolve_workspace_id,
    check_workspace_membership,
    require_workspace_membership,
    get_user_workspace_ids,
)

router = APIRouter()


def get_preset_or_404(db: Session, preset_id: UUID) -> ConversationPreset:
    """Get preset by ID or raise 404."""
    preset = db.query(ConversationPreset).filter(
        ConversationPreset.id == preset_id,
        ConversationPreset.is_archived == False
    ).first()
    if not preset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preset not found"
        )
    return preset


def require_preset_access(db: Session, preset_id: UUID, current_user: User) -> ConversationPreset:
    """Check user has access to preset (creator or workspace member)."""
    preset = get_preset_or_404(db, preset_id)

    # Creator always has access
    if preset.creator_id == current_user.id:
        return preset

    # Check workspace membership
    if check_workspace_membership(db, preset.workspace_id, current_user.id):
        return preset

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have access to this preset"
    )


def require_preset_edit_access(db: Session, preset_id: UUID, current_user: User) -> ConversationPreset:
    """Check user can edit preset (creator or workspace admin)."""
    preset = get_preset_or_404(db, preset_id)

    # Creator always has edit access
    if preset.creator_id == current_user.id:
        return preset

    # Check workspace admin role
    membership = check_workspace_membership(db, preset.workspace_id, current_user.id)
    if membership and membership.role == "admin":
        return preset

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You don't have permission to edit this preset"
    )


@router.post("", response_model=PresetSchema, status_code=status.HTTP_201_CREATED)
async def create_preset(
    preset_data: PresetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new conversation preset.

    If organization_id is provided, the preset will be shared with org members.
    Otherwise, it's a personal preset visible only to the creator.
    """
    # Resolve workspace (supports workspace_id, organization_id, or personal fallback)
    workspace_id = resolve_workspace_id(
        db,
        workspace_id=preset_data.workspace_id,
        organization_id=preset_data.organization_id,
        user_id=current_user.id,
    )
    require_workspace_membership(db, workspace_id, current_user)

    # Create preset
    preset = ConversationPreset(
        name=preset_data.name,
        description=preset_data.description,
        icon=preset_data.icon,
        creator_id=current_user.id,
        organization_id=preset_data.organization_id,
        workspace_id=workspace_id,
        anonymity_level=preset_data.anonymity_level.value,
        results_access=preset_data.results_access.value,
        show_verbatim_responses=preset_data.show_verbatim_responses,
        invite_only=preset_data.invite_only,
        skip_steps=preset_data.skip_steps,
    )
    db.add(preset)
    db.commit()
    db.refresh(preset)

    return preset


@router.get("", response_model=List[PresetSchema])
async def list_presets(
    workspace_id: Optional[UUID] = Query(None, description="Filter by workspace"),
    organization_id: Optional[UUID] = Query(None, description="Filter by organization (backward compat)"),
    include_personal: bool = Query(True, description="Include personal presets"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List presets accessible to the user.

    Returns presets from workspaces the user is a member of.
    """
    # Get user's workspace IDs
    user_ws_ids = get_user_workspace_ids(db, current_user.id)

    # Build query
    query = db.query(ConversationPreset).filter(
        ConversationPreset.is_archived == False
    )

    if workspace_id:
        # Filter to specific workspace (user must be member)
        require_workspace_membership(db, workspace_id, current_user)
        query = query.filter(ConversationPreset.workspace_id == workspace_id)
    elif organization_id:
        # Backward compat: resolve org to default workspace
        resolved_ws_id = resolve_workspace_id(db, organization_id=organization_id)
        require_workspace_membership(db, resolved_ws_id, current_user)
        query = query.filter(ConversationPreset.workspace_id == resolved_ws_id)
    else:
        # Show presets from all user's workspaces
        query = query.filter(ConversationPreset.workspace_id.in_(user_ws_ids))

    presets = query.order_by(ConversationPreset.created_at.desc()).all()
    return presets


@router.get("/{preset_id}", response_model=PresetSchema)
async def get_preset(
    preset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific preset by ID."""
    preset = require_preset_access(db, preset_id, current_user)
    return preset


@router.put("/{preset_id}", response_model=PresetSchema)
async def update_preset(
    preset_id: UUID,
    preset_data: PresetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a preset. Only creator or org admin can update."""
    preset = require_preset_edit_access(db, preset_id, current_user)

    # Update fields if provided
    if preset_data.name is not None:
        preset.name = preset_data.name
    if preset_data.description is not None:
        preset.description = preset_data.description
    if preset_data.icon is not None:
        preset.icon = preset_data.icon
    if preset_data.anonymity_level is not None:
        preset.anonymity_level = preset_data.anonymity_level.value
    if preset_data.results_access is not None:
        preset.results_access = preset_data.results_access.value
    if preset_data.show_verbatim_responses is not None:
        preset.show_verbatim_responses = preset_data.show_verbatim_responses
    if preset_data.invite_only is not None:
        preset.invite_only = preset_data.invite_only
    if preset_data.skip_steps is not None:
        preset.skip_steps = preset_data.skip_steps

    db.commit()
    db.refresh(preset)

    return preset


@router.delete("/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_preset(
    preset_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Archive a preset (soft delete).

    Only creator or org admin can delete.
    """
    preset = require_preset_edit_access(db, preset_id, current_user)

    # Soft delete
    from datetime import datetime
    preset.is_archived = True
    preset.archived_at = datetime.utcnow()
    db.commit()

    return None
