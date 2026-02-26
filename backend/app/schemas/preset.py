"""Conversation preset schemas."""

from datetime import datetime
from typing import Optional, List, Literal
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.conversation import AnonymityLevel, ResultsAccess


# Valid icon choices
PresetIconType = Literal[
    'clipboard', 'lightning', 'chart', 'chat', 'target',
    'users', 'lock', 'globe', 'inbox'
]


class PresetBase(BaseModel):
    """Base preset schema."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    icon: PresetIconType = Field(default='clipboard')

    # Privacy/access settings
    anonymity_level: AnonymityLevel
    results_access: ResultsAccess
    show_verbatim_responses: bool = False
    invite_only: bool = True

    # Steps to skip
    skip_steps: Optional[List[str]] = None


class PresetCreate(PresetBase):
    """Schema for creating a preset."""

    organization_id: Optional[UUID] = None
    workspace_id: Optional[UUID] = None


class PresetUpdate(BaseModel):
    """Schema for updating a preset."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    icon: Optional[PresetIconType] = None

    anonymity_level: Optional[AnonymityLevel] = None
    results_access: Optional[ResultsAccess] = None
    show_verbatim_responses: Optional[bool] = None
    invite_only: Optional[bool] = None

    skip_steps: Optional[List[str]] = None


class Preset(PresetBase):
    """Preset schema returned in responses."""

    id: UUID
    creator_id: UUID
    organization_id: Optional[UUID]
    workspace_id: UUID
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PresetWithScope(Preset):
    """Preset schema with computed scope field."""

    @property
    def is_personal(self) -> bool:
        """Return True if this is a personal preset (not org-level)."""
        return self.organization_id is None

    model_config = {"from_attributes": True}
