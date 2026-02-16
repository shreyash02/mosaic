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


class ActionSource(str, Enum):
    user_requested = "user_requested"
    auto_generated = "auto_generated"
    manual = "manual"


class ActionStatus(str, Enum):
    suggested = "suggested"
    accepted = "accepted"
    deferred = "deferred"
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
    source: ActionSource = ActionSource.user_requested
    status: ActionStatus = ActionStatus.suggested
    dismissed_reason: Optional[str] = None
    created_at: datetime
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None
    deferred_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    created_by_id: Optional[UUID] = None

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


class UpdateActionStatusRequest(BaseModel):
    """Request to update an action's status (accept, dismiss, complete, undo)."""
    status: ActionStatus
    dismissed_reason: Optional[str] = Field(None, max_length=500)


class EditActionRequest(BaseModel):
    """Request to edit an action's title/description."""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, min_length=1)


class CreateActionRequest(BaseModel):
    """Request to create a manual action."""
    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1)
    action_type: ActionType = ActionType.change
    priority: ActionPriority = ActionPriority.medium
