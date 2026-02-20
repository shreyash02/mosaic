"""Feature flag admin routes."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
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
    PlanTiersResponse,
    FlagExportData,
    FlagImportRequest,
    FlagImportResult,
)
from app.services.feature_flag_service import feature_flag_service
from app.services.audit_log_service import log_audit


class ReorderRequest(BaseModel):
    """Request body for reordering feature flags."""
    slugs: List[str]

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
    flag = feature_flag_service.create_flag(
        db,
        name=flag_data.name,
        description=flag_data.description,
        enabled=flag_data.enabled,
        config=flag_data.config
    )
    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="create_feature_flag",
        entity_type="feature_flag",
        entity_id=flag.slug,
        details={"name": flag_data.name, "enabled": flag_data.enabled},
    )
    return flag


@router.put("/reorder", response_model=FeatureFlagList)
async def reorder_flags(
    body: ReorderRequest,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Reorder feature flags by providing an ordered list of slugs."""
    # Look up all flags by slug
    flags_by_slug = {}
    for slug in body.slugs:
        flag = db.query(FeatureFlagModel).filter(FeatureFlagModel.slug == slug).first()
        if not flag:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Feature flag '{slug}' not found"
            )
        flags_by_slug[slug] = flag

    # Assign display_order based on position in the list
    for idx, slug in enumerate(body.slugs):
        flags_by_slug[slug].display_order = idx

    db.commit()

    # Invalidate cache since ordering metadata changed
    feature_flag_service.invalidate_cache()

    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="reorder_feature_flags",
        entity_type="feature_flag",
        details={"slugs": body.slugs},
    )

    # Return updated list
    flags = feature_flag_service.list_all_flags(db)
    return FeatureFlagList(flags=flags)


@router.get("/export", response_model=FlagExportData)
async def export_flags(
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Export all feature flags with tier-level overrides as JSON."""
    return feature_flag_service.export_flags(db)


@router.post("/import", response_model=FlagImportResult)
async def import_flags(
    body: FlagImportRequest,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Import feature flags with tier-level overrides."""
    flags_data = [entry.model_dump() for entry in body.flags]
    result = feature_flag_service.import_flags(db, flags_data, full_sync=body.full_sync)
    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="import_feature_flags",
        entity_type="feature_flag",
        details={"count": len(flags_data), "full_sync": body.full_sync},
    )
    return result


@router.get("/plan-tiers", response_model=PlanTiersResponse)
async def get_plan_tiers(
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Get all feature flags resolved per plan tier for comparison."""
    return feature_flag_service.get_plan_tiers(db)


@router.get("/{flag_slug}", response_model=FeatureFlag)
async def get_flag(
    flag_slug: str,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Get a specific feature flag by slug."""
    flag = feature_flag_service.get_flag_by_slug(db, flag_slug)
    if not flag:
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
    flag = feature_flag_service.update_flag(
        db,
        flag_slug=flag_slug,
        name=flag_data.name,
        description=flag_data.description,
        enabled=flag_data.enabled,
        config=flag_data.config
    )
    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="update_feature_flag",
        entity_type="feature_flag",
        entity_id=flag_slug,
        details={"changes": flag_data.model_dump(exclude_unset=True)},
    )
    return flag


@router.delete("/{flag_slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flag(
    flag_slug: str,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Delete a feature flag."""
    feature_flag_service.delete_flag(db, flag_slug)
    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="delete_feature_flag",
        entity_type="feature_flag",
        entity_id=flag_slug,
    )


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
    override = feature_flag_service.set_override(
        db,
        flag_slug=flag_slug,
        tier=override_data.tier,
        org_id=override_data.organization_id,
        user_id=override_data.user_id,
        enabled=override_data.enabled,
        config_override=override_data.config_override
    )
    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="set_flag_override",
        entity_type="feature_flag",
        entity_id=flag_slug,
        details={"tier": override_data.tier, "org_id": str(override_data.organization_id) if override_data.organization_id else None, "user_id": str(override_data.user_id) if override_data.user_id else None, "enabled": override_data.enabled},
    )
    return override


@router.delete("/{flag_slug}/overrides", status_code=status.HTTP_204_NO_CONTENT)
async def delete_override(
    flag_slug: str,
    tier: Optional[str] = Query(None),
    organization_id: Optional[UUID] = Query(None),
    user_id: Optional[UUID] = Query(None),
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """Remove an override for a feature flag."""
    if tier is None and organization_id is None and user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide tier, organization_id, or user_id"
        )
    feature_flag_service.remove_override(db, flag_slug, tier=tier, org_id=organization_id, user_id=user_id)
    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="delete_flag_override",
        entity_type="feature_flag",
        entity_id=flag_slug,
        details={"tier": tier, "org_id": str(organization_id) if organization_id else None, "user_id": str(user_id) if user_id else None},
    )


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
