"""Analysis schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field


# Sentiment cluster within a theme
class SentimentCluster(BaseModel):
    """Sentiment cluster within a theme."""

    sentiment: str = Field(..., pattern="^(positive|negative|neutral)$")
    summary: str
    count: int = Field(..., ge=0)


# Theme extracted from responses
class Theme(BaseModel):
    """Theme extracted from analysis."""

    theme: str = Field(..., min_length=1)
    frequency: int = Field(..., ge=0)
    clusters: List[SentimentCluster] = []


# Request to trigger analysis
class AnalyzeRequest(BaseModel):
    """Request schema for triggering analysis."""

    # Optional parameters for future customization
    include_quotes: bool = False  # Future: include example quotes
    custom_prompt: Optional[str] = None  # Future: custom analysis prompt


# Analysis result
class Analysis(BaseModel):
    """Analysis schema returned in responses."""

    id: UUID
    conversation_id: UUID
    overall_summary: Optional[str] = None
    themes: List[Theme] = []  # Deprecated: kept for backwards compatibility

    # Per-question analysis
    question_analyses: List["QuestionAnalysis"] = []

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


# Rating statistics for rating questions
class RatingStatistics(BaseModel):
    """Statistics for rating question responses."""

    average: float
    min_value: int
    max_value: int
    distribution: dict  # {0: 5, 1: 3, 2: 8, ...}
    total_responses: int


# Poll choice result
class PollChoiceResult(BaseModel):
    """Result for a single poll choice."""

    choice_id: str
    label: str
    count: int
    percentage: float


# Poll statistics for poll questions
class PollStatistics(BaseModel):
    """Statistics for poll question responses."""

    total_responses: int
    choices: List[PollChoiceResult]


# Question-specific analysis (for multi-question conversations)
class QuestionAnalysis(BaseModel):
    """Analysis for a specific question."""

    question_id: UUID
    question_text: str
    question_type: str
    response_count: int

    # For text questions
    themes: List[Theme] = []

    # For rating questions
    rating_stats: Optional[RatingStatistics] = None

    # For poll questions
    poll_stats: Optional[PollStatistics] = None


# Analysis status
class AnalysisStatus(BaseModel):
    """Analysis status for a conversation."""

    conversation_id: UUID
    state: str  # 'not_started', 'in_progress', 'completed', 'failed'
    analysis_id: Optional[UUID] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
