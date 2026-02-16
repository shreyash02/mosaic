"""Suggested action schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum
from pydantic import BaseModel, Field


class ActionType(str, Enum):
    investigate = "investigate"
    communicate = "communicate"
    change = "change"
    celebrate = "celebrate"
    monitor = "monitor"


class ActionPriority(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class ActionSentiment(str, Enum):
    positive = "positive"
    negative = "negative"
    neutral = "neutral"
    mixed = "mixed"


class ActionStatus(str, Enum):
    suggested = "suggested"
    accepted = "accepted"
    dismissed = "dismissed"
    completed = "completed"
    converted_to_goal = "converted_to_goal"


class SuggestedAction(BaseModel):
    """Suggested action returned in API responses."""
    id: UUID
    analysis_id: UUID
    conversation_id: UUID
    title: str
    description: str
    action_type: ActionType
    priority: ActionPriority
    sentiment: ActionSentiment
    related_cluster_ids: Optional[List[str]] = None
    response_percentage: Optional[float] = None
    status: ActionStatus = ActionStatus.suggested
    dismissed_reason: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SuggestedActionsResponse(BaseModel):
    """Response containing list of suggested actions."""
    analysis_id: UUID
    conversation_id: UUID
    actions: List[SuggestedAction]
    total: int


class GenerateActionsRequest(BaseModel):
    """Request to generate suggested actions."""
    regenerate: bool = Field(default=False, description="Delete existing actions and regenerate")
