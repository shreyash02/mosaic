"""Admin schemas."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


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
    # Configuration fields for editing
    show_verbatim_responses: Optional[bool] = None
    results_access: Optional[str] = None
    anonymity_level: Optional[str] = None
    invite_only: Optional[bool] = None
    auto_analyze: Optional[bool] = None
    max_response_length: Optional[int] = None
    duration_minutes: Optional[int] = None

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


class GenerateTestDataRequest(BaseModel):
    """Request to generate test data for a conversation."""

    conversation_id: UUID
    num_respondents: int = Field(..., ge=1, le=100, description="Number of respondents to generate (1-100)")
    start_time: datetime = Field(..., description="Start of time range for responses")
    end_time: datetime = Field(..., description="End of time range for responses")


class GenerateTestDataResponse(BaseModel):
    """Response from test data generation."""

    success: bool
    message: str
    responses_created: int
    respondents_created: int


# Scheduler-related schemas

class SchedulerJobLogInfo(BaseModel):
    """Single scheduler job log entry."""

    id: UUID
    job_name: str
    status: str  # 'started', 'completed', 'failed'
    started_at: datetime
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    items_processed: Optional[int] = None
    items_failed: Optional[int] = None
    error_message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None

    model_config = {"from_attributes": True}


class SchedulerJobSummary(BaseModel):
    """Summary statistics for a single scheduler job type."""

    job_name: str
    display_name: str
    interval_minutes: int
    last_run_at: Optional[datetime] = None
    last_status: Optional[str] = None
    last_duration_ms: Optional[int] = None
    next_run_at: Optional[datetime] = None
    recent_success_count: int = 0
    recent_failure_count: int = 0
    avg_duration_ms: Optional[int] = None
    health_status: str = 'unknown'  # 'healthy', 'warning', 'error', 'unknown'


class SchedulerStatusResponse(BaseModel):
    """Overall scheduler status response."""

    scheduler_running: bool
    jobs: List[SchedulerJobSummary]
    last_checked_at: datetime


class SchedulerLogsResponse(BaseModel):
    """Paginated scheduler job logs response."""

    logs: List[SchedulerJobLogInfo]
    total: int
    page: int
    page_size: int
    total_pages: int


class SchedulerLogsCleanupResponse(BaseModel):
    """Response from scheduler logs cleanup."""

    success: bool
    deleted_count: int
    message: str


# Subscription management schemas

class AdminSetTierRequest(BaseModel):
    """Request to set subscription tier for a user or organization."""

    user_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None
    tier: str
    duration_days: Optional[int] = Field(None, ge=1, description="Duration in days; null means no expiration")


class AdminSubscriptionInfo(BaseModel):
    """Subscription info returned by admin lookup."""

    tier: str
    status: str
    expires_at: Optional[datetime] = None
    user_id: Optional[UUID] = None
    organization_id: Optional[UUID] = None


# Analytics schemas

class DailyCount(BaseModel):
    """A single day's count for time-series data."""
    date: str
    count: int


class ConversationStateCount(BaseModel):
    """Count of conversations by state."""
    state: str
    count: int


class TierDistribution(BaseModel):
    """Count of subscriptions by tier."""
    tier: str
    count: int


class AnonymityDistribution(BaseModel):
    """Count of conversations by anonymity level."""
    anonymity_level: str
    count: int


class AdminAnalyticsResponse(BaseModel):
    """Aggregated platform analytics response."""

    # Totals
    total_users: int
    total_conversations: int
    total_responses: int
    total_analyses: int

    # Period deltas (new in last N days)
    period_users: int
    period_conversations: int
    period_responses: int
    period_analyses: int

    # Time series (daily counts within period)
    daily_signups: List[DailyCount]
    daily_conversations: List[DailyCount]
    daily_responses: List[DailyCount]

    # Operational metrics
    avg_responses_per_conversation: float
    avg_analysis_duration_ms: Optional[float] = None
    completion_rate: float  # fraction of closed/analyzed/analyzing vs all non-draft

    # Distributions
    conversations_by_state: List[ConversationStateCount]
    subscriptions_by_tier: List[TierDistribution]
    conversations_by_anonymity: List[AnonymityDistribution]

