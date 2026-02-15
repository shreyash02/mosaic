"""Conversation preset schemas."""

from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.conversation import AnonymityLevel, ResultsAccess


class QuestionConfig(BaseModel):
    """Schema for question configuration in presets."""

    question_text: str = ""
    question_type: str = "text"  # text, rating, single_choice, multiple_choice
    options: Optional[Any] = None  # For choice types: { mode, max_selections, choices }
    is_required: bool = False
    question_order: int = 0


class PresetBase(BaseModel):
    """Base preset schema."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    emoji: str = Field(default='📋', max_length=10)

    # Privacy/access settings
    anonymity_level: AnonymityLevel
    results_access: ResultsAccess
    show_verbatim_responses: bool = False
    invite_only: bool = True

    # Optional default questions
    default_questions: Optional[List[QuestionConfig]] = None

    # Steps to skip
    skip_steps: Optional[List[str]] = None


class PresetCreate(PresetBase):
    """Schema for creating a preset."""

    organization_id: Optional[UUID] = None


class PresetUpdate(BaseModel):
    """Schema for updating a preset."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    emoji: Optional[str] = Field(None, max_length=10)

    anonymity_level: Optional[AnonymityLevel] = None
    results_access: Optional[ResultsAccess] = None
    show_verbatim_responses: Optional[bool] = None
    invite_only: Optional[bool] = None

    default_questions: Optional[List[QuestionConfig]] = None
    skip_steps: Optional[List[str]] = None


class Preset(PresetBase):
    """Preset schema returned in responses."""

    id: UUID
    creator_id: UUID
    organization_id: Optional[UUID]
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
