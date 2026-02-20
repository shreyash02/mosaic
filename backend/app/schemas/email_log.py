"""Pydantic schemas for the admin email logs endpoint."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class EmailLogSummary(BaseModel):
    total_sent: int
    total_failed: int
    success_rate: float
    period_days: int


class EmailDailyVolume(BaseModel):
    date: str
    sent: int
    failed: int


class EmailTypeBreakdown(BaseModel):
    email_type: str
    sent: int
    failed: int


class EmailLogEntry(BaseModel):
    id: str
    recipient_email: str
    email_type: str
    subject: Optional[str]
    status: str
    error_message: Optional[str]
    conversation_id: Optional[str]
    organization_id: Optional[str]
    user_id: Optional[str]
    created_at: datetime


class RecentFailure(BaseModel):
    recipient_email: str
    email_type: str
    error_message: Optional[str]
    created_at: datetime


class AdminEmailLogsResponse(BaseModel):
    summary: EmailLogSummary
    daily_volumes: List[EmailDailyVolume]
    by_type: List[EmailTypeBreakdown]
    logs: List[EmailLogEntry]
    total_logs: int
    page: int
    page_size: int
    total_pages: int
    recent_failures: List[RecentFailure]
