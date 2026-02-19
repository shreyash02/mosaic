"""Journal-specific schemas for individual mode.

Journals are user-facing entities backed by the Conversation model internally.
The API uses /journals/ and these schemas — never exposing conversation internals.
"""

import re
from datetime import datetime, date
from typing import Optional, List, Dict
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator
from enum import Enum


# --- Frequency validation ---

FREQUENCY_ORDER = {"every_minute": 0.0007, "daily": 1, "weekly": 7, "biweekly": 14, "monthly": 30}


def _validate_frequency_pair(entry_freq: str | None, analysis_interval: str | None):
    """Validate that analysis_interval is not more frequent than entry_frequency.

    Rule: analysis interval (in days) must be >= entry frequency (in days).
    E.g. monthly entries cannot have daily analysis.
    """
    if not entry_freq or entry_freq == "unlimited":
        return
    entry_days = FREQUENCY_ORDER.get(entry_freq)
    analysis_days = FREQUENCY_ORDER.get(analysis_interval) if analysis_interval else None
    if entry_days and analysis_days and analysis_days < entry_days:
        raise ValueError(
            f"Analysis interval '{analysis_interval}' cannot be more frequent "
            f"than entry frequency '{entry_freq}'"
        )


# --- Enums ---

class AnalysisInterval(str, Enum):
    """How often to run periodic analysis."""

    EVERY_10_MINUTES = "every_10_minutes"  # dev/testing only
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


class EntryFrequency(str, Enum):
    """How often the user should write entries."""

    EVERY_MINUTE = "every_minute"  # dev/testing only
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    UNLIMITED = "unlimited"


# --- Prompt schemas ---

class JournalPromptCreate(BaseModel):
    """A prompt in a journal creation request."""

    text: str = Field(..., min_length=1, max_length=2000)
    type: str = Field("text", pattern="^(text|rating|single_choice|checkbox)$")
    order_index: int = Field(..., ge=0)
    rating_min: Optional[int] = None
    rating_max: Optional[int] = None
    choices: Optional[List[str]] = None


class JournalPrompt(BaseModel):
    """A prompt in a journal (backed by Question model)."""

    id: UUID
    text: str
    type: str
    order_index: int
    rating_min: Optional[int] = None
    rating_max: Optional[int] = None
    choices: Optional[List[str]] = None

    model_config = {"from_attributes": True}


# --- Journal CRUD schemas ---

class JournalCreate(BaseModel):
    """Create a new journal."""

    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    prompts: List[JournalPromptCreate] = Field(..., min_length=1, max_length=10)
    analysis_interval: AnalysisInterval = Field(AnalysisInterval.WEEKLY)
    entry_frequency: Optional[EntryFrequency] = None
    strict_frequency: bool = False
    # Schedule fields
    analysis_time_of_day: Optional[str] = Field(None, description="HH:MM 24h format")
    analysis_day_of_week: Optional[int] = Field(None, ge=0, le=6, description="0=Mon..6=Sun")
    analysis_day_of_month: Optional[int] = Field(None, ge=1, le=28)
    timezone: Optional[str] = None

    @field_validator("analysis_time_of_day")
    @classmethod
    def validate_time_of_day(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", v):
            raise ValueError("analysis_time_of_day must be HH:MM in 24h format")
        return v

    @model_validator(mode="after")
    def validate_frequency(self):
        entry_freq = self.entry_frequency.value if self.entry_frequency else None
        _validate_frequency_pair(entry_freq, self.analysis_interval.value)
        return self


class JournalUpdate(BaseModel):
    """Update journal settings. All fields optional."""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    prompts: Optional[List[JournalPromptCreate]] = Field(None, min_length=1, max_length=10)
    analysis_interval: Optional[AnalysisInterval] = None
    entry_frequency: Optional[EntryFrequency] = None
    strict_frequency: Optional[bool] = None
    # Schedule fields
    analysis_time_of_day: Optional[str] = Field(None, description="HH:MM 24h format")
    analysis_day_of_week: Optional[int] = Field(None, ge=0, le=6, description="0=Mon..6=Sun")
    analysis_day_of_month: Optional[int] = Field(None, ge=1, le=28)
    timezone: Optional[str] = None

    @field_validator("analysis_time_of_day")
    @classmethod
    def validate_time_of_day(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(r"^([01]\d|2[0-3]):[0-5]\d$", v):
            raise ValueError("analysis_time_of_day must be HH:MM in 24h format")
        return v

    @model_validator(mode="after")
    def validate_frequency(self):
        if self.entry_frequency is not None and self.analysis_interval is not None:
            entry_freq = self.entry_frequency.value if self.entry_frequency else None
            _validate_frequency_pair(entry_freq, self.analysis_interval.value)
        return self


class Journal(BaseModel):
    """Full journal detail response."""

    id: UUID
    title: str
    description: Optional[str] = None
    prompts: List[JournalPrompt] = []
    analysis_interval: Optional[str] = None
    entry_frequency: Optional[str] = None
    strict_frequency: bool = False
    total_entries: int = 0
    streak: "JournalStreak"
    has_analysis: bool = False
    # Schedule fields
    analysis_time_of_day: Optional[str] = None
    analysis_day_of_week: Optional[int] = None
    analysis_day_of_month: Optional[int] = None
    next_analysis_at: Optional[datetime] = None
    timezone: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JournalListItem(BaseModel):
    """Journal summary for list views."""

    id: UUID
    title: str
    description: Optional[str] = None
    prompt_count: int = 0
    total_entries: int = 0
    current_streak: int = 0
    last_entry_at: Optional[datetime] = None
    has_analysis: bool = False
    analysis_interval: Optional[str] = None
    entry_frequency: Optional[str] = None
    strict_frequency: bool = False
    created_at: datetime


# --- Entry schemas ---

class PromptResponse(BaseModel):
    """A single prompt's response within an entry."""

    prompt_id: UUID
    text: Optional[str] = Field(None, max_length=50000)
    rating_value: Optional[int] = None
    choice_value: Optional[str] = None
    choice_values: Optional[List[str]] = None


class JournalEntryCreate(BaseModel):
    """Create a journal entry with per-prompt responses."""

    responses: List[PromptResponse] = Field(..., min_length=1)
    entry_date: Optional[date] = None


class JournalEntryUpdate(BaseModel):
    """Update a journal entry."""

    responses: List[PromptResponse] = Field(..., min_length=1)


class EntryPromptResponse(BaseModel):
    """A prompt response within an entry (read model)."""

    prompt_id: UUID
    prompt_text: str
    type: str = "text"
    text: Optional[str] = None
    rating_value: Optional[int] = None
    choice_value: Optional[str] = None
    choice_values: Optional[List[str]] = None


class JournalEntryAnalysisResponse(BaseModel):
    """Per-entry AI analysis results."""

    id: UUID
    themes: List[str] = []
    mood_score: float = 0.0
    mood_label: str = ""
    key_takeaway: str = ""
    connections: str = ""
    suggested_followups: List[str] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class JournalEntry(BaseModel):
    """A single journal entry (one Response record with structured response_data)."""

    id: UUID
    entry_number: int
    responses: List[EntryPromptResponse] = []
    created_at: datetime
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    word_count: int = 0
    analysis: Optional[JournalEntryAnalysisResponse] = None

    model_config = {"from_attributes": True}


class JournalStreak(BaseModel):
    """Journal writing streak information."""

    current_streak: int = 0
    longest_streak: int = 0
    total_entries: int = 0
    entries_this_week: int = 0
    entries_this_month: int = 0
    last_entry_at: Optional[datetime] = None


class JournalEntryList(BaseModel):
    """Paginated list of journal entries."""

    journal_id: UUID
    total_entries: int
    has_more: bool = False
    entries: List[JournalEntry]
    streak: JournalStreak


# --- Analysis schemas ---

class ThemeTimelineEntry(BaseModel):
    """A single theme tracked over time."""

    theme: str
    first_seen: Optional[datetime] = None
    last_seen: Optional[datetime] = None
    entry_count: int = 0
    trajectory: str = "stable"  # growing, stable, declining, resolved
    summary: str = ""


class MoodDataPoint(BaseModel):
    """A single mood data point."""

    date: str
    sentiment_score: float = 0.0  # -1 to 1
    dominant_mood: str = ""
    entry_id: Optional[UUID] = None


class MoodTrajectory(BaseModel):
    """Mood trajectory over time."""

    data_points: List[MoodDataPoint] = []
    overall_trend: str = "stable"  # improving, stable, declining
    summary: str = ""


class PatternInsight(BaseModel):
    """A detected pattern in journal entries."""

    pattern_type: str  # recurring_concern, positive_shift, correlation, cyclical
    title: str
    description: str
    confidence: float = 0.0


class JournalAnalysisResponse(BaseModel):
    """Journal-specific analysis results."""

    id: UUID
    journal_id: UUID
    overall_summary: Optional[str] = None
    theme_timeline: Optional[List[ThemeTimelineEntry]] = None
    mood_trajectory: Optional[MoodTrajectory] = None
    patterns: Optional[List[PatternInsight]] = None
    total_entries_analyzed: int = 0
    date_range_start: Optional[datetime] = None
    date_range_end: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JournalAnalysisStatus(BaseModel):
    """Status of journal analysis availability."""

    available: bool = False
    needs_more_entries: bool = False
    entries_until_analysis: int = 0
    total_entries: int = 0
    latest_analysis: Optional[JournalAnalysisResponse] = None


# --- Template schemas ---

class JournalTemplatePrompt(BaseModel):
    """A prompt definition within a journal template."""

    text: str
    type: str  # text, rating, single_choice, checkbox
    choices: Optional[List[str]] = None


class JournalTemplateResponse(BaseModel):
    """Full journal template response."""

    id: UUID
    title: str
    emoji: str
    description: Optional[str] = None
    prompts: List[JournalTemplatePrompt]
    entry_frequency: Optional[str] = None
    analysis_interval: str = "weekly"
    strict_frequency: bool = False
    display_order: int = 0
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class JournalTemplateCreate(BaseModel):
    """Create a new journal template (admin only)."""

    title: str = Field(..., min_length=1, max_length=200)
    emoji: str = Field(..., min_length=1, max_length=10)
    description: Optional[str] = Field(None, max_length=500)
    prompts: List[JournalTemplatePrompt] = Field(..., min_length=1, max_length=10)
    entry_frequency: Optional[str] = None
    analysis_interval: str = "weekly"
    strict_frequency: bool = False
    display_order: int = 0
    is_active: bool = True

    @model_validator(mode="after")
    def validate_frequency(self):
        _validate_frequency_pair(self.entry_frequency, self.analysis_interval)
        return self


class JournalTemplateUpdate(BaseModel):
    """Update a journal template (admin only). All fields optional."""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    emoji: Optional[str] = Field(None, min_length=1, max_length=10)
    description: Optional[str] = None
    prompts: Optional[List[JournalTemplatePrompt]] = None
    entry_frequency: Optional[str] = None
    analysis_interval: Optional[str] = None
    strict_frequency: Optional[bool] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

    @model_validator(mode="after")
    def validate_frequency(self):
        if self.entry_frequency is not None and self.analysis_interval is not None:
            _validate_frequency_pair(self.entry_frequency, self.analysis_interval)
        return self


# --- Draft schemas ---

class JournalDraftSave(BaseModel):
    """Save a journal entry draft."""

    responses: Dict[str, str] = Field(default_factory=dict)
    rating_responses: Dict[str, int] = Field(default_factory=dict)
    choice_responses: Dict[str, str] = Field(default_factory=dict)
    checkbox_responses: Dict[str, List[str]] = Field(default_factory=dict)


class JournalDraftLoad(BaseModel):
    """Loaded journal draft data."""

    has_draft: bool = False
    last_saved_at: Optional[datetime] = None
    responses: Dict[str, str] = Field(default_factory=dict)
    rating_responses: Dict[str, int] = Field(default_factory=dict)
    choice_responses: Dict[str, str] = Field(default_factory=dict)
    checkbox_responses: Dict[str, List[str]] = Field(default_factory=dict)


class JournalDraftSaveResponse(BaseModel):
    """Response after saving a draft."""

    success: bool = True
    last_saved_at: datetime
    message: str = "Draft saved"


# --- Sharing schemas ---

class JournalShareCreate(BaseModel):
    """Create a journal share invitation."""

    email: str = Field(..., min_length=1, max_length=255)
    share_type: str = Field("analysis_only", pattern="^(analysis_only|full)$")
    expires_at: Optional[datetime] = None


class JournalShareResponse(BaseModel):
    """A single journal share."""

    id: UUID
    journal_id: UUID
    email: str
    shared_by_id: UUID
    shared_user_id: Optional[UUID] = None
    shared_user_name: Optional[str] = None
    share_type: str
    invitation_token: str
    is_accepted: bool = False
    accepted_at: Optional[datetime] = None
    is_revoked: bool = False
    revoked_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class JournalShareListResponse(BaseModel):
    """List of shares for a journal."""

    journal_id: UUID
    total_shares: int = 0
    active_shares: int = 0
    shares: List[JournalShareResponse] = []


class SharedJournalListItem(BaseModel):
    """A journal shared with the current user."""

    journal_id: UUID
    title: str
    description: Optional[str] = None
    share_type: str
    owner_name: str
    total_entries: int = 0
    has_analysis: bool = False
    shared_at: datetime
    expires_at: Optional[datetime] = None
