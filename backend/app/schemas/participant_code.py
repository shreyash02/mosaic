"""ParticipantCode schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


# Participant code in database
class ParticipantCode(BaseModel):
    """ParticipantCode schema returned in responses."""

    id: UUID
    conversation_id: UUID
    participant_code: str
    is_used: bool
    used_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# List of participant codes with usage stats
class ParticipantCodeList(BaseModel):
    """List of participant codes for a conversation."""

    conversation_id: UUID
    total_codes: int
    used_codes: int
    unused_codes: int
    codes: List[ParticipantCode]


# Code validation response (works for both access_code and participant_code)
class CodeValidation(BaseModel):
    """Response for code validation."""

    valid: bool
    conversation_id: Optional[UUID] = None
    message: Optional[str] = None
    requires_participant_code: bool = False  # True if fully_anonymous and needs participant_code
    session_token: Optional[str] = None  # Temporary session token for fully_anonymous after participant code validation
    has_submitted: Optional[bool] = None  # True if participant code has already been used to submit
    conversation_state: Optional[str] = None  # Current state of the conversation


# Bulk code generation response
class GeneratedParticipantCodes(BaseModel):
    """Response after generating participant codes."""

    conversation_id: UUID
    codes_generated: int
    codes: List[str]  # Just the code strings for distribution

