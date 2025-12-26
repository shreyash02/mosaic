"""InviteCode schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


# Invite code in database
class InviteCode(BaseModel):
    """InviteCode schema returned in responses."""

    id: UUID
    conversation_id: UUID
    code: str
    is_used: bool
    used_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# List of invite codes with usage stats
class InviteCodeList(BaseModel):
    """List of invite codes for a conversation."""

    conversation_id: UUID
    total_codes: int
    used_codes: int
    unused_codes: int
    codes: List[InviteCode]


# Invite code validation response
class InviteCodeValidation(BaseModel):
    """Response for invite code validation."""

    valid: bool
    conversation_id: Optional[UUID] = None
    message: Optional[str] = None


# Bulk code generation response
class GeneratedInviteCodes(BaseModel):
    """Response after generating invite codes."""

    conversation_id: UUID
    codes_generated: int
    codes: List[str]  # Just the code strings for distribution
