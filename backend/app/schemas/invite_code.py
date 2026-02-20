"""Schemas for invite code system."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


# Platform settings
class PlatformSettingResponse(BaseModel):
    key: str
    value: str
    description: Optional[str] = None
    updated_at: datetime
    updated_by_id: Optional[UUID] = None

    model_config = {"from_attributes": True}


class PlatformSettingUpdate(BaseModel):
    value: str
    description: Optional[str] = None


# Invite codes
class InviteCodeResponse(BaseModel):
    id: UUID
    code: str
    code_type: str
    status: str
    created_by_admin_id: Optional[UUID] = None
    created_by_user_id: Optional[UUID] = None
    used_by_user_id: Optional[UUID] = None
    used_at: Optional[datetime] = None
    label: Optional[str] = None
    waitlist_request_id: Optional[UUID] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    # Denormalized fields
    used_by_email: Optional[str] = None
    created_by_name: Optional[str] = None

    model_config = {"from_attributes": True}


class InviteCodeGenerateRequest(BaseModel):
    count: int = Field(..., ge=1, le=100)
    label: Optional[str] = Field(None, max_length=255)
    expires_in_days: Optional[int] = Field(None, ge=1, le=365)


class InviteCodeValidateRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=20)


class InviteCodeValidateResponse(BaseModel):
    valid: bool
    message: str


class InviteCodeStatsResponse(BaseModel):
    total_codes: int
    available_codes: int
    used_codes: int
    revoked_codes: int
    waitlist_pending: int
    waitlist_approved: int
    waitlist_rejected: int


class ReferralCodeResponse(BaseModel):
    id: UUID
    code: str
    status: str
    used_by_email: Optional[str] = None
    used_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# Waitlist
class WaitlistRequestCreate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=255)
    message: Optional[str] = Field(None, max_length=1000)


class WaitlistRequestResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str] = None
    message: Optional[str] = None
    status: str
    processed_by_admin_id: Optional[UUID] = None
    processed_at: Optional[datetime] = None
    admin_note: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class WaitlistApproveRequest(BaseModel):
    note: Optional[str] = Field(None, max_length=500)


class WaitlistRejectRequest(BaseModel):
    note: Optional[str] = Field(None, max_length=500)


class InviteCodeRequiredResponse(BaseModel):
    required: bool
