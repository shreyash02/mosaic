"""Response schemas."""

from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field


# Single response to a question
class ResponseItemCreate(BaseModel):
    """Schema for a single response to a question."""

    question_id: UUID
    response_text: Optional[str] = Field(None, max_length=10000)
    response_data: Optional[dict] = None  # For ratings, polls, etc.


# Response submission
class ResponseSubmit(BaseModel):
    """Schema for submitting responses to a conversation."""

    responses: List[ResponseItemCreate] = Field(..., min_items=1)
    reveal_consent: bool = False  # Only for 'revealable' anonymity level
    participant_code: Optional[str] = None  # For fully_anonymous mode


# Draft save request
class DraftSaveRequest(BaseModel):
    """Schema for saving draft responses."""

    responses: List[ResponseItemCreate]
    reveal_consent: bool = False
    participant_code: Optional[str] = None  # For fully_anonymous mode


# Draft save response
class DraftSaveResponse(BaseModel):
    """Response from saving a draft."""

    success: bool
    last_saved_at: datetime
    message: str


# Draft load response
class DraftLoadResponse(BaseModel):
    """Response containing draft data."""

    has_draft: bool
    last_saved_at: Optional[datetime] = None
    responses: List[ResponseItemCreate] = []
    reveal_consent: bool = False


# Response in database
class Response(BaseModel):
    """Response schema returned in responses."""

    id: UUID
    conversation_id: UUID
    question_id: UUID
    response_text: Optional[str] = None
    response_data: Optional[dict] = None
    anonymity_level: str
    reveal_consent: bool
    status: str = "submitted"  # 'draft' or 'submitted'
    last_saved_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None  # Nullable for drafts

    # Editing tracking
    edited_at: Optional[datetime] = None
    is_edited: bool = False

    # Only included for owner viewing revealed responses
    participant_id: Optional[UUID] = None
    participant_code_used: Optional[str] = None

    model_config = {"from_attributes": True}


# Response with question text (for analysis view)
class ResponseWithQuestion(Response):
    """Response with question text included."""

    question_text: str

    model_config = {"from_attributes": True}


# Aggregated response stats
class ResponseStats(BaseModel):
    """Statistics about responses for a conversation."""

    total_responses: int
    unique_participants: int
    responses_by_question: dict  # {question_id: count}
    response_rate: Optional[float] = None  # If expected participant count known


# Response list for owner
class ResponseList(BaseModel):
    """List of responses for conversation owner."""

    conversation_id: UUID
    total_count: int
    responses: List[ResponseWithQuestion]


# Response check for authenticated users
class ResponseCheck(BaseModel):
    """Schema for checking if user has already submitted a response."""

    has_submitted: bool
    can_edit: bool = False
    message: Optional[str] = None
    existing_responses: Optional[List[ResponseItemCreate]] = None
