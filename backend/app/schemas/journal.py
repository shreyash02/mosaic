"""Journal-specific schemas for individual mode.

Journals are user-facing entities backed by the Conversation model internally.
The API uses /journals/ and these schemas — never exposing conversation internals.
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum


# --- Enums ---

class AnalysisInterval(str, Enum):
    """How often to run periodic analysis."""

    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"


# --- Prompt schemas ---

class JournalPromptCreate(BaseModel):
    """A prompt in a journal creation request."""

    text: str = Field(..., min_length=1, max_length=2000)
    type: str = Field("text", pattern="^(text|rating|single_choice)$")
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


class JournalUpdate(BaseModel):
    """Update journal settings. All fields optional."""

    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=500)
    prompts: Optional[List[JournalPromptCreate]] = Field(None, min_length=1, max_length=10)
    analysis_interval: Optional[AnalysisInterval] = None


class Journal(BaseModel):
    """Full journal detail response."""

    id: UUID
    title: str
    description: Optional[str] = None
    prompts: List[JournalPrompt] = []
    analysis_interval: Optional[str] = None
    total_entries: int = 0
    streak: "JournalStreak"
    has_analysis: bool = False
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
    created_at: datetime


# --- Entry schemas ---

class PromptResponse(BaseModel):
    """A single prompt's response within an entry."""

    prompt_id: UUID
    text: Optional[str] = Field(None, max_length=50000)
    rating_value: Optional[int] = None
    choice_value: Optional[str] = None


class JournalEntryCreate(BaseModel):
    """Create a journal entry with per-prompt responses."""

    responses: List[PromptResponse] = Field(..., min_length=1)


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


class JournalEntry(BaseModel):
    """A single journal entry (one Response record with structured response_data)."""

    id: UUID
    entry_number: int
    responses: List[EntryPromptResponse] = []
    created_at: datetime
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    word_count: int = 0

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
