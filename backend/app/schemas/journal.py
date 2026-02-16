"""Journal-specific schemas for individual mode."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


# --- Entry schemas ---

class JournalEntryCreate(BaseModel):
    """Create a journal entry."""

    text: str = Field(..., min_length=1, max_length=50000)


class JournalEntry(BaseModel):
    """A single journal entry (backed by Response model)."""

    id: UUID
    text: str
    created_at: datetime
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    word_count: int

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

    conversation_id: UUID
    total_entries: int
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
    conversation_id: UUID
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
