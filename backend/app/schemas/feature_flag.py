"""Feature flag schemas."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


# --- Feature Flag Schemas ---

class FeatureFlagBase(BaseModel):
    """Base feature flag schema."""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    enabled: bool = False
    config: Dict[str, Any] = Field(default_factory=dict)


class FeatureFlagCreate(FeatureFlagBase):
    """Schema for creating a feature flag."""

    pass


class FeatureFlagUpdate(BaseModel):
    """Schema for updating a feature flag."""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    enabled: Optional[bool] = None
    config: Optional[Dict[str, Any]] = None


class FeatureFlag(FeatureFlagBase):
    """Feature flag response schema."""

    id: UUID
    slug: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Feature Flag Override Schemas ---

# Valid tier values for overrides
VALID_TIERS = {'free', 'basic', 'pro', 'enterprise'}


class FeatureFlagOverrideBase(BaseModel):
    """Base override schema."""

    enabled: Optional[bool] = None  # null = inherit
    config_override: Optional[Dict[str, Any]] = None  # partial config to merge


class FeatureFlagOverrideCreate(FeatureFlagOverrideBase):
    """Schema for creating an override."""

    tier: Optional[str] = None  # 'free', 'basic', 'pro', 'enterprise'
    organization_id: Optional[UUID] = None
    user_id: Optional[UUID] = None

    @field_validator('tier')
    @classmethod
    def validate_tier(cls, v):
        """Validate tier value."""
        if v is not None and v not in VALID_TIERS:
            raise ValueError(f'Tier must be one of: {", ".join(sorted(VALID_TIERS))}')
        return v

    @field_validator('user_id')
    @classmethod
    def validate_scope(cls, v, info):
        """Ensure at least one scope is provided (tier, org_id, or user_id)."""
        tier = info.data.get('tier')
        org_id = info.data.get('organization_id')
        if tier is None and org_id is None and v is None:
            raise ValueError('At least one of tier, organization_id, or user_id must be provided')
        return v


class FeatureFlagOverrideUpdate(FeatureFlagOverrideBase):
    """Schema for updating an override."""

    pass


class FeatureFlagOverride(FeatureFlagOverrideBase):
    """Override response schema."""

    id: UUID
    flag_id: UUID
    tier: Optional[str] = None
    organization_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Effective Flag Value Schema ---

class EffectiveFeatureFlag(BaseModel):
    """The resolved/effective value of a feature flag for a given context."""

    name: str
    slug: str
    enabled: bool
    config: Dict[str, Any]

    # Resolution metadata (useful for debugging)
    resolution_chain: Optional[List[str]] = None  # e.g., ["global", "org:uuid", "user:uuid"]


class FeatureFlagList(BaseModel):
    """List of feature flags."""

    flags: List[FeatureFlag]


class EffectiveFeatureFlagList(BaseModel):
    """List of effective feature flags."""

    flags: List[EffectiveFeatureFlag]


# --- Usage Tracking Schemas ---

class FeatureUsageInfo(BaseModel):
    """Usage information for a feature."""

    feature_slug: str
    usage_count: int
    period: str  # 'YYYY-MM'


class EffectiveFeatureFlagWithUsage(EffectiveFeatureFlag):
    """Effective flag value with usage tracking."""

    usage: Dict[str, int] = Field(default_factory=dict)  # config_key -> current usage


class UserFeaturesResponse(BaseModel):
    """Response for /me/features endpoint."""

    features: Dict[str, Dict[str, Any]]  # slug -> {enabled, config, usage}
    tier: str
