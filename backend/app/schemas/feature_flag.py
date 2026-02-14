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

class FeatureFlagOverrideBase(BaseModel):
    """Base override schema."""

    enabled: Optional[bool] = None  # null = inherit
    config_override: Optional[Dict[str, Any]] = None  # partial config to merge


class FeatureFlagOverrideCreate(FeatureFlagOverrideBase):
    """Schema for creating an override."""

    organization_id: Optional[UUID] = None
    user_id: Optional[UUID] = None

    @field_validator('user_id')
    @classmethod
    def validate_scope(cls, v, info):
        """Ensure at least one scope is provided."""
        org_id = info.data.get('organization_id')
        if org_id is None and v is None:
            raise ValueError('At least one of organization_id or user_id must be provided')
        return v


class FeatureFlagOverrideUpdate(FeatureFlagOverrideBase):
    """Schema for updating an override."""

    pass


class FeatureFlagOverride(FeatureFlagOverrideBase):
    """Override response schema."""

    id: UUID
    flag_id: UUID
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
