"""Admin schemas."""

from datetime import datetime
from typing import Optional, List, Dict, Any
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

