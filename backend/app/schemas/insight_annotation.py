"""Insight annotation schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


class AnnotationTargetType(str, Enum):
    theme = "theme"
    surprising_insight = "surprising_insight"
    question = "question"
    overall_summary = "overall_summary"


class UpsertAnnotationRequest(BaseModel):
    """Create or update an annotation. Upsert by (target_type, target_key)."""
    target_type: AnnotationTargetType
    target_key: dict
    starred: Optional[bool] = None  # None = don't change
    note: Optional[str] = Field(None, max_length=2000)


class AnnotationResponse(BaseModel):
    """Annotation returned in API responses."""
    id: UUID
    analysis_id: UUID
    target_type: AnnotationTargetType
    target_key: dict
    starred: bool
    note: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AnnotationsListResponse(BaseModel):
    """Response containing list of annotations for an analysis."""
    analysis_id: UUID
    annotations: list[AnnotationResponse]
    total: int
