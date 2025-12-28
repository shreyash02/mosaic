"""Admin schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    """Admin login request schema."""

    username: str
    password: str


class AdminToken(BaseModel):
    """Admin token response."""

    access_token: str
    token_type: str = "bearer"


class AdminUserInfo(BaseModel):
    """Admin user information in list."""

    id: UUID
    email: str
    full_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminConversationInfo(BaseModel):
    """Admin conversation information in list."""

    id: UUID
    title: str
    description: Optional[str] = None
    creator_id: UUID
    state: str
    access_code: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AdminResponseInfo(BaseModel):
    """Admin response information in list."""

    id: UUID
    conversation_id: UUID
    question_id: UUID
    participant_id: Optional[UUID] = None
    response_text: Optional[str] = None
    anonymity_level: str
    submitted_at: datetime

    model_config = {"from_attributes": True}

