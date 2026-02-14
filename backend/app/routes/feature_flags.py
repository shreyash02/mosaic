"""Feature flag admin routes."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.routes.admin import get_admin
from app.models.admin import Admin
from app.models.feature_flag import FeatureFlag as FeatureFlagModel
from app.schemas.feature_flag import (
    FeatureFlag,
    FeatureFlagCreate,
    FeatureFlagUpdate,
    FeatureFlagOverride,
    FeatureFlagOverrideCreate,
    EffectiveFeatureFlag,
    FeatureFlagList,
)
from app.services.feature_flag_service import feature_flag_service

router = APIRouter()


# --- Flag CRUD (Admin only) ---

@router.get("", response_model=FeatureFlagList)
async def list_flags(
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """List all feature flags."""
    flags = feature_flag_service.list_all_flags(db)
    return FeatureFlagList(flags=flags)


@router.post("", response_model=FeatureFlag, status_code=status.HTTP_201_CREATED)
async def create_flag(
    flag_data: FeatureFlagCreate,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Create a new feature flag."""
    return feature_flag_service.create_flag(
        db,
        name=flag_data.name,
        description=flag_data.description,
        enabled=flag_data.enabled,
        config=flag_data.config
    )


@router.get("/{flag_slug}", response_model=FeatureFlag)
async def get_flag(
    flag_slug: str,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Get a specific feature flag by slug."""
    flag = feature_flag_service.get_flag_by_slug(db, flag_slug)
    if not flag:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Feature flag '{flag_slug}' not found")
    return flag


@router.patch("/{flag_slug}", response_model=FeatureFlag)
async def update_flag(
    flag_slug: str,
    flag_data: FeatureFlagUpdate,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Update a feature flag."""
    return feature_flag_service.update_flag(
        db,
        flag_slug=flag_slug,
        name=flag_data.name,
        description=flag_data.description,
        enabled=flag_data.enabled,
        config=flag_data.config
    )


@router.delete("/{flag_slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flag(
    flag_slug: str,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Delete a feature flag."""
    feature_flag_service.delete_flag(db, flag_slug)


# --- Override Management (Admin only) ---

@router.get("/{flag_slug}/overrides", response_model=List[FeatureFlagOverride])
async def list_overrides(
    flag_slug: str,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """List all overrides for a feature flag."""
    return feature_flag_service.list_overrides(db, flag_slug)


@router.post("/{flag_slug}/overrides", response_model=FeatureFlagOverride, status_code=status.HTTP_201_CREATED)
async def create_override(
    flag_slug: str,
    override_data: FeatureFlagOverrideCreate,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Create or update an override for a feature flag."""
    return feature_flag_service.set_override(
        db,
        flag_slug=flag_slug,
        org_id=override_data.organization_id,
        user_id=override_data.user_id,
        enabled=override_data.enabled,
        config_override=override_data.config_override
    )


@router.delete("/{flag_slug}/overrides", status_code=status.HTTP_204_NO_CONTENT)
async def delete_override(
    flag_slug: str,
    organization_id: Optional[UUID] = Query(None),
    user_id: Optional[UUID] = Query(None),
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Remove an override for a feature flag."""
    from fastapi import HTTPException
    if organization_id is None and user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide organization_id or user_id"
        )
    feature_flag_service.remove_override(db, flag_slug, organization_id, user_id)


# --- Preview (Admin only) ---

@router.get("/{flag_slug}/preview", response_model=EffectiveFeatureFlag)
async def preview_flag(
    flag_slug: str,
    organization_id: Optional[UUID] = Query(None),
    user_id: Optional[UUID] = Query(None),
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Preview the effective flag value for a given context."""
    return feature_flag_service.get_flag(db, flag_slug, organization_id, user_id)
