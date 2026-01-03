"""Conversation schemas."""

from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from enum import Enum


# Enums
class AnonymityLevel(str, Enum):
    """Anonymity level options."""

    FULLY_ANONYMOUS = "fully_anonymous"
    PLATFORM_TRACKED = "platform_tracked"
    REVEALABLE = "revealable"


class ResultsAccess(str, Enum):
    """Results access options."""

    CREATOR_ONLY = "creator_only"
    PARTICIPANTS = "participants"
    PUBLIC_LINK = "public_link"


class ConversationState(str, Enum):
    """Conversation state options."""

    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    DELETED = "deleted"


class RecurrencePattern(str, Enum):
    """Recurrence pattern options."""

    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


# Question schemas (nested within conversation)
class QuestionBase(BaseModel):
    """Base question schema."""

    question_text: str = Field(..., min_length=1)
    question_type: str = Field(default="text", pattern="^(text|rating|single_choice|multiple_choice)$")
    question_order: int = Field(..., ge=0)
    options: Optional[dict] = None


class QuestionCreate(QuestionBase):
    """Schema for creating a question."""

    pass


class QuestionUpdate(BaseModel):
    """Schema for updating a question."""

    question_text: Optional[str] = Field(None, min_length=1)
    question_type: Optional[str] = Field(None, pattern="^(text|rating|single_choice|multiple_choice)$")
    question_order: Optional[int] = Field(None, ge=0)
    options: Optional[dict] = None


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
    participant_title: Optional[str] = Field(None, max_length=500, description="Optional participant-facing title. If not set, title will be used when participants view the conversation")
    description: Optional[str] = None
    header_image_url: Optional[str] = Field(None, max_length=500, description="Optional header image URL displayed when users are responding")
    anonymity_level: AnonymityLevel
    results_access: ResultsAccess
    show_verbatim_responses: bool = False
    invite_only: bool = False
    auto_analyze: bool = False
    max_response_length: int = Field(default=10000, ge=100, le=50000)
    duration_minutes: Optional[int] = Field(None, ge=1, le=2880)  # Max 48 hours (2880 minutes)
    scheduled_activate_at: Optional[datetime] = Field(None, description="Scheduled activation time - conversation will be activated automatically at this time")
    auto_close_at: Optional[datetime] = None
    manual_close_enabled: bool = True
    time_extension_enabled: bool = True
    timezone: Optional[str] = Field(default="UTC", description="IANA timezone name (e.g., 'UTC', 'America/New_York', 'Asia/Kolkata')")
    parent_conversation_id: Optional[UUID] = None

    # Template fields
    is_template: Optional[bool] = Field(False, description="True if this conversation is a template")
    template_series_id: Optional[UUID] = Field(None, description="Series ID for template (instances created from this template will join this series)")

    # Series relationship
    series_id: Optional[UUID] = Field(None, description="Series ID this conversation belongs to")

    # Recurring conversation fields
    recurrence_pattern: Optional[RecurrencePattern] = Field(None, description="Pattern for recurring conversations (only set on template)")
    next_instance_date: Optional[datetime] = Field(None, description="When to create the next instance (only set on template)")
    recurrence_end_date: Optional[datetime] = Field(None, description="When to stop creating instances (only set on template)")

    @field_validator('timezone')
    @classmethod
    def normalize_timezone(cls, v: Optional[str]) -> Optional[str]:
        """Normalize timezone, converting legacy names to current names."""
        if v is None:
            return v
        from app.utils.timezone_utils import normalize_timezone
        try:
            return normalize_timezone(v)
        except ValueError as e:
            raise ValueError(f"Invalid timezone: {v}") from e


class ConversationCreate(ConversationBase):
    """Schema for creating a conversation."""

    organization_id: Optional[UUID] = None
    questions: List[QuestionCreate] = Field(..., min_items=1)
    series_id: Optional[UUID] = None  # Set when creating an instance from a template


class ConversationUpdate(BaseModel):
    """Schema for updating a conversation (draft state only)."""

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    participant_title: Optional[str] = Field(None, max_length=500, description="Optional participant-facing title. If not set, title will be used when participants view the conversation")
    description: Optional[str] = None
    header_image_url: Optional[str] = Field(None, max_length=500, description="Optional header image URL displayed when users are responding")
    anonymity_level: Optional[AnonymityLevel] = None
    results_access: Optional[ResultsAccess] = None
    show_verbatim_responses: Optional[bool] = None
    invite_only: Optional[bool] = None
    auto_analyze: Optional[bool] = None
    max_response_length: Optional[int] = Field(None, ge=100, le=50000)
    duration_minutes: Optional[int] = Field(None, ge=1, le=2880)  # Max 48 hours (2880 minutes)
    scheduled_activate_at: Optional[datetime] = Field(None, description="Scheduled activation time - conversation will be activated automatically at this time")
    auto_close_at: Optional[datetime] = None
    manual_close_enabled: Optional[bool] = None
    time_extension_enabled: Optional[bool] = None
    timezone: Optional[str] = Field(None, description="IANA timezone name (e.g., 'UTC', 'America/New_York', 'Asia/Kolkata')")
    questions: Optional[List[QuestionCreate]] = None
    # Series relationship
    series_id: Optional[UUID] = Field(None, description="Series ID to add this conversation to. Set to None to remove from series.")
    # Recurring template fields
    recurrence_pattern: Optional[RecurrencePattern] = None
    next_instance_date: Optional[datetime] = None
    recurrence_end_date: Optional[datetime] = None

    @field_validator('timezone')
    @classmethod
    def normalize_timezone(cls, v: Optional[str]) -> Optional[str]:
        """Normalize timezone, converting legacy names to current names."""
        if v is None:
            return v
        from app.utils.timezone_utils import normalize_timezone
        try:
            return normalize_timezone(v)
        except ValueError as e:
            raise ValueError(f"Invalid timezone: {v}") from e


class ConversationSummary(BaseModel):
    """Simplified conversation summary for parent/child references."""

    id: UUID
    title: str
    state: ConversationState
    created_at: datetime
    is_template: bool = False

    model_config = {"from_attributes": True}


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
    timezone: Optional[str] = Field(default="UTC", description="IANA timezone name for datetime fields")

    # Follow-up conversation fields
    parent_conversation: Optional[ConversationSummary] = None
    follow_up_conversations: List[ConversationSummary] = []
    is_follow_up: bool = False

    # Recurring conversation fields
    series_id: Optional[UUID] = None
    is_recurring_instance: bool = False
    recurrence_pattern: Optional[RecurrencePattern] = None
    next_instance_date: Optional[datetime] = None
    recurrence_end_date: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ConversationWithQuestions(Conversation):
    """Conversation schema with questions included."""

    questions: List[Question] = []

    model_config = {"from_attributes": True}


# Conversation actions
class ActivateConversation(BaseModel):
    """Schema for activating a conversation."""

    auto_close_at: Optional[datetime] = None
    scheduled_activate_at: Optional[datetime] = Field(None, description="Schedule activation for a future time instead of activating immediately")


class ExtendConversation(BaseModel):
    """Schema for extending conversation time."""

    additional_hours: int = Field(..., ge=1, le=168)  # Max 1 week


class GenerateParticipantCodes(BaseModel):
    """Schema for generating participant codes (fully_anonymous mode)."""

    count: int = Field(..., ge=1, le=1000)


class CreateFollowUpRequest(BaseModel):
    """Schema for creating a follow-up conversation."""

    copy_invitations: bool = False
    copy_settings: bool = True
    copy_questions: bool = False
    add_to_series: bool = False  # If True, add follow-up to parent's series (or create new series)


class ConversationLineage(BaseModel):
    """Schema for conversation lineage (ancestors and descendants)."""

    current: Conversation
    ancestors: List[ConversationSummary] = []
    descendants: List[ConversationSummary] = []


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
    timezone: Optional[str] = Field(default="UTC", description="IANA timezone name for datetime fields")
    is_follow_up: bool = False
    parent_conversation_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None

    # Template fields
    is_template: bool = False
    template_series_id: Optional[UUID] = None

    # Series relationship
    series_id: Optional[UUID] = None

    # Recurring conversation fields
    is_recurring_instance: bool = False
    recurrence_pattern: Optional[RecurrencePattern] = None

    model_config = {"from_attributes": True}
