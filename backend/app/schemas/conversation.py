"""Conversation schemas."""

from datetime import datetime
from typing import Optional, List, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator
from enum import Enum


# Enums
class AnonymityLevel(str, Enum):
    """Anonymity level options."""

    OPEN = "open"  # Anyone can respond, identity recorded if logged in
    FULLY_ANONYMOUS = "fully_anonymous"  # No identity tracking, requires secret codes
    PLATFORM_TRACKED = "platform_tracked"  # Login required, platform tracks
    REVEALABLE = "revealable"  # Login required, can reveal identities


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


class AnalysisInterval(str, Enum):
    """Analysis interval options for continuous conversations."""

    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


# Question schemas (nested within conversation)
class QuestionBase(BaseModel):
    """Base question schema."""

    question_text: str = Field(..., min_length=1)
    question_type: str = Field(default="text", pattern="^(text|rating|single_choice|multiple_choice)$")
    question_order: int = Field(..., ge=0)
    options: Optional[dict] = None
    is_required: bool = Field(default=False)
    question_image_url: Optional[str] = Field(None, max_length=500, description="Optional image URL displayed with the question")


class QuestionCreate(QuestionBase):
    """Schema for creating a question."""

    pass


class QuestionUpdate(BaseModel):
    """Schema for updating a question."""

    question_text: Optional[str] = Field(None, min_length=1)
    question_type: Optional[str] = Field(None, pattern="^(text|rating|single_choice|multiple_choice)$")
    question_order: Optional[int] = Field(None, ge=0)
    options: Optional[dict] = None
    is_required: Optional[bool] = None
    question_image_url: Optional[str] = Field(None, max_length=500, description="Optional image URL displayed with the question")


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
    allow_response_editing: bool = False
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
    recurrence_paused: bool = Field(False, description="If True, automatic instance creation is paused (only set on template)")

    # Continuous conversation fields
    is_continuous: bool = Field(False, description="True if this conversation stays open indefinitely for ongoing feedback collection")
    analysis_interval: Optional[AnalysisInterval] = Field(None, description="How often to run periodic analysis (daily, weekly, biweekly, monthly)")
    analysis_timezone: Optional[str] = Field(None, description="Timezone for analysis window boundaries")

    # Branding (overrides organization branding if set)
    brand_logo_url: Optional[str] = Field(None, max_length=500, description="Brand logo URL (overrides organization branding)")
    brand_name: Optional[str] = Field(None, max_length=255, description="Brand name (overrides organization branding)")

    # Slack channel notifications
    slack_channel_id: Optional[str] = Field(None, max_length=50, description="Slack channel ID to post notifications to")
    slack_channel_name: Optional[str] = Field(None, max_length=255, description="Display name of the Slack channel")
    slack_notify_on_activate: bool = Field(False, description="Post to channel when conversation is activated")
    slack_notify_on_close: bool = Field(False, description="Post to channel when conversation is closed")
    slack_notify_on_analysis: bool = Field(False, description="Post to channel when analysis is complete")

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
    allow_response_editing: Optional[bool] = None
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
    recurrence_paused: Optional[bool] = None

    # Continuous conversation fields
    is_continuous: Optional[bool] = None
    analysis_interval: Optional[AnalysisInterval] = None
    analysis_timezone: Optional[str] = None

    # Branding (overrides organization branding if set)
    brand_logo_url: Optional[str] = Field(None, max_length=500, description="Brand logo URL (overrides organization branding)")
    brand_name: Optional[str] = Field(None, max_length=255, description="Brand name (overrides organization branding)")

    # Slack channel notifications
    slack_channel_id: Optional[str] = Field(None, max_length=50, description="Slack channel ID to post notifications to")
    slack_channel_name: Optional[str] = Field(None, max_length=255, description="Display name of the Slack channel")
    slack_notify_on_activate: Optional[bool] = Field(None, description="Post to channel when conversation is activated")
    slack_notify_on_close: Optional[bool] = Field(None, description="Post to channel when conversation is closed")
    slack_notify_on_analysis: Optional[bool] = Field(None, description="Post to channel when analysis is complete")

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
    recurrence_paused: bool = False

    # Continuous conversation fields
    is_continuous: bool = False
    analysis_interval: Optional[AnalysisInterval] = None
    next_analysis_at: Optional[datetime] = None
    analysis_timezone: Optional[str] = None

    # Archiving
    is_archived: bool = False
    archived_at: Optional[datetime] = None

    # Slack channel notifications
    slack_channel_id: Optional[str] = None
    slack_channel_name: Optional[str] = None
    slack_notify_on_activate: bool = False
    slack_notify_on_close: bool = False
    slack_notify_on_analysis: bool = False

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
    unique_participants: Optional[int] = 0
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
    recurrence_paused: bool = False

    # Continuous conversation fields
    is_continuous: bool = False

    # Archiving
    is_archived: bool = False

    model_config = {"from_attributes": True}


# Bulk operation schemas
class BulkOperationType(str, Enum):
    """Bulk operation types."""

    CLOSE = "close"
    DELETE = "delete"
    ARCHIVE = "archive"
    UNARCHIVE = "unarchive"


class BulkOperationRequest(BaseModel):
    """Request schema for bulk conversation operations."""

    conversation_ids: List[UUID] = Field(..., min_length=1, max_length=100)
    operation: BulkOperationType


class BulkOperationResultItem(BaseModel):
    """Result for a single conversation in a bulk operation."""

    conversation_id: str
    success: bool
    error: Optional[str] = None


class BulkOperationResponse(BaseModel):
    """Response schema for bulk operations."""

    operation: BulkOperationType
    total_requested: int
    succeeded: int
    failed: int
    results: List[BulkOperationResultItem]


# Question Suggestion schemas
class QuestionSuggestionRequest(BaseModel):
    """Request schema for AI question suggestions."""

    title: str = Field(..., min_length=1, max_length=500)
    description: str = Field(default="", max_length=5000)
    existing_questions: List[str] = Field(default_factory=list)
    count: int = Field(default=5, ge=3, le=5)


class QuestionSuggestionItem(BaseModel):
    """A single question suggestion."""

    text: str
    question_type: str  # text, rating, single_choice, multiple_choice
    rationale: str
    options: Optional[dict] = None


class QuestionSuggestionResponse(BaseModel):
    """Response schema for AI question suggestions."""

    suggestions: List[QuestionSuggestionItem]
    needs_more_context: bool = False
    context_hint: Optional[str] = None
