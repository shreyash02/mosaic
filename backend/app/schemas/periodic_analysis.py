"""Periodic analysis schemas for continuous conversations."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator

from app.schemas.analysis import Theme, SurprisingInsight, QuestionAnalysis


class PeriodicAnalysisBase(BaseModel):
    """Base periodic analysis schema."""

    period_label: str
    period_type: str
    period_start: datetime
    period_end: datetime
    trigger_type: str = 'scheduled'  # 'scheduled', 'manual', 'manual_incremental'


class PeriodicAnalysis(PeriodicAnalysisBase):
    """Full periodic analysis schema."""

    id: UUID
    conversation_id: UUID
    overall_summary: Optional[str] = None
    themes: List[Theme] = []
    surprising_insights: Optional[List[SurprisingInsight]] = None
    question_analyses: Optional[List[QuestionAnalysis]] = []

    # Metadata
    embedding_provider: Optional[str] = None
    embedding_model: Optional[str] = None
    clustering_algorithm: Optional[str] = None
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    total_responses_analyzed: Optional[int] = None
    num_clusters_found: Optional[int] = None
    analysis_duration_ms: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator('question_analyses', 'themes', mode='before')
    @classmethod
    def ensure_list(cls, v):
        """Convert None to empty list."""
        return v if v is not None else []


class PeriodicAnalysisList(BaseModel):
    """List of periodic analyses with metadata."""

    conversation_id: UUID
    total_periods: int
    analyses: List[PeriodicAnalysis]


class TriggerPeriodicAnalysisRequest(BaseModel):
    """Request to trigger periodic analysis."""

    period_start: Optional[datetime] = Field(None, description="Start of analysis window. If not provided, uses end of last analysis or activation time.")
    period_end: Optional[datetime] = Field(None, description="End of analysis window. If not provided, uses current time.")
    force_replace: bool = Field(False, description="If True, delete existing analysis for this period and create a fresh one.")
    incremental: bool = Field(False, description="If True, create an incremental analysis from last analysis end to now with suffix (e.g., '2026-W07-a').")


class TrendDataPoint(BaseModel):
    """A single data point in a trend."""

    period: str
    period_start: str
    period_end: str
    normalized_score: float
    frequency: int
    response_count: int


class ThemeTrend(BaseModel):
    """Trend data for a single theme across periods."""

    theme_id: str
    theme_name: str
    question_text: str
    data_points: List[TrendDataPoint]


class ContinuousTrendsData(BaseModel):
    """Structure of the trends JSONB field."""

    period_type: str
    themes: List[ThemeTrend]


class ContinuousTrends(BaseModel):
    """Trends across periodic analyses."""

    id: UUID
    conversation_id: UUID
    periods_analyzed: int
    trends: Optional[ContinuousTrendsData] = None
    last_computed_at: datetime
    computation_duration_ms: Optional[int] = None

    model_config = {"from_attributes": True}

    @field_validator('trends', mode='before')
    @classmethod
    def parse_trends(cls, v):
        """Parse trends from JSONB."""
        if v is None:
            return None
        if isinstance(v, dict):
            return ContinuousTrendsData(**v)
        return v


class EnableContinuousRequest(BaseModel):
    """Request to enable continuous mode for a conversation."""

    analysis_interval: str = Field(..., pattern="^(daily|weekly|biweekly|monthly)$", description="How often to run periodic analysis")
    start_analysis_at: Optional[datetime] = Field(None, description="When to run the first analysis. If not provided, will be calculated based on activation time.")
