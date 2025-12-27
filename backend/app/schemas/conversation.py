"""Conversation schemas."""

from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum


# Enums
class AnonymityLevel(str, Enum):
    """Anonymity level options."""

    FULLY_ANONYMOUS = "fully_anonymous"
    PLATFORM_TRACKED = "platform_tracked"
    REVEALABLE = "revealable"


class ResultsAccess(str, Enum):
    """Results access options."""

    INVITE_CODE_HOLDERS = "invite_code_holders"
    PUBLIC_LINK = "public_link"


class ConversationState(str, Enum):
    """Conversation state options."""

    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    ANALYZED = "analyzed"
    DELETED = "deleted"


# Question schemas (nested within conversation)
class QuestionBase(BaseModel):
    """Base question schema."""

    question_text: str = Field(..., min_length=1)
    question_type: str = Field(default="text", pattern="^(text|rating|single_choice|multiple_choice)$")
    question_order: int = Field(..., ge=0)
    options: Optional[List[dict]] = None


class QuestionCreate(QuestionBase):
    """Schema for creating a question."""

    pass


class QuestionUpdate(BaseModel):
    """Schema for updating a question."""

    question_text: Optional[str] = Field(None, min_length=1)
    question_type: Optional[str] = Field(None, pattern="^(text|rating|single_choice|multiple_choice)$")
    question_order: Optional[int] = Field(None, ge=0)
    options: Optional[List[dict]] = None


class Question(QuestionBase):
    """Question schema returned in responses."""

    id: UUID
    conversation_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# Conversation schemas
class ConversationBase(BaseModel):
    """Base conversation schema."""

    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    anonymity_level: AnonymityLevel
    results_access: ResultsAccess
    auto_analyze: bool = False
    max_response_length: int = Field(default=10000, ge=100, le=50000)
    auto_close_at: Optional[datetime] = None
    manual_close_enabled: bool = True
    time_extension_enabled: bool = True


class ConversationCreate(ConversationBase):
    """Schema for creating a conversation."""

    organization_id: Optional[UUID] = None
    questions: List[QuestionCreate] = Field(..., min_items=1)


class ConversationUpdate(BaseModel):
    """Schema for updating a conversation (draft state only)."""

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    anonymity_level: Optional[AnonymityLevel] = None
    results_access: Optional[ResultsAccess] = None
    auto_analyze: Optional[bool] = None
    max_response_length: Optional[int] = Field(None, ge=100, le=50000)
    auto_close_at: Optional[datetime] = None
    manual_close_enabled: Optional[bool] = None
    time_extension_enabled: Optional[bool] = None
    questions: Optional[List[QuestionCreate]] = None


class Conversation(ConversationBase):
    """Conversation schema returned in responses."""

    id: UUID
    creator_id: UUID
    organization_id: Optional[UUID] = None
    access_code: str
    state: ConversationState
    activated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    analyzed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationWithQuestions(Conversation):
    """Conversation schema with questions included."""

    questions: List[Question] = []

    model_config = {"from_attributes": True}


# Conversation actions
class ActivateConversation(BaseModel):
    """Schema for activating a conversation."""

    auto_close_at: Optional[datetime] = None


class ExtendConversation(BaseModel):
    """Schema for extending conversation time."""

    additional_hours: int = Field(..., ge=1, le=168)  # Max 1 week


class GenerateParticipantCodes(BaseModel):
    """Schema for generating participant codes (fully_anonymous mode)."""

    count: int = Field(..., ge=1, le=1000)


# Conversation list response
class ConversationListItem(BaseModel):
    """Simplified conversation schema for list views."""

    id: UUID
    title: str
    state: ConversationState
    anonymity_level: AnonymityLevel
    access_code: str
    created_at: datetime
    activated_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    response_count: Optional[int] = 0

    model_config = {"from_attributes": True}
