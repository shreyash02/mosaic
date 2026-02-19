"""Subscription schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


from app.core.tiers import VALID_TIERS


class SubscriptionBase(BaseModel):
    """Base subscription schema."""

    tier: str = Field(default='free', description="Subscription tier: free, basic, pro, enterprise")

    @field_validator('tier')
    @classmethod
    def validate_tier(cls, v):
        if v not in VALID_TIERS:
            raise ValueError(f'Tier must be one of: {", ".join(sorted(VALID_TIERS))}')
        return v


class SubscriptionCreate(SubscriptionBase):
    """Schema for creating a subscription."""

    user_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None

    @field_validator('organization_id')
    @classmethod
    def validate_scope(cls, v, info):
        """Ensure exactly one of user_id or organization_id is set."""
        user_id = info.data.get('user_id')
        if user_id is None and v is None:
            raise ValueError('Either user_id or organization_id must be provided')
        if user_id is not None and v is not None:
            raise ValueError('Cannot set both user_id and organization_id')
        return v


class SubscriptionUpdate(BaseModel):
    """Schema for updating a subscription."""

    tier: Optional[str] = None
    status: Optional[str] = None
    expires_at: Optional[datetime] = None

    @field_validator('tier')
    @classmethod
    def validate_tier(cls, v):
        if v is not None and v not in VALID_TIERS:
            raise ValueError(f'Tier must be one of: {", ".join(sorted(VALID_TIERS))}')
        return v

    @field_validator('status')
    @classmethod
    def validate_status(cls, v):
        valid_statuses = {'active', 'cancelled', 'expired'}
        if v is not None and v not in valid_statuses:
            raise ValueError(f'Status must be one of: {", ".join(sorted(valid_statuses))}')
        return v


class Subscription(SubscriptionBase):
    """Subscription response schema."""

    id: UUID
    user_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None
    status: str
    started_at: datetime
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SubscriptionInfo(BaseModel):
    """Simplified subscription info for API responses."""

    tier: str
    status: str
    expires_at: Optional[datetime] = None
