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
    themes: List[Theme] = []

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


# Question-specific analysis (for multi-question conversations)
class QuestionAnalysis(BaseModel):
    """Analysis for a specific question."""

    question_id: UUID
    question_text: str
    themes: List[Theme] = []
    response_count: int


# Detailed analysis with per-question breakdown
class DetailedAnalysis(Analysis):
    """Detailed analysis with per-question breakdown."""

    question_analyses: List[QuestionAnalysis] = []

    model_config = {"from_attributes": True}


# Analysis status
class AnalysisStatus(BaseModel):
    """Analysis status for a conversation."""

    conversation_id: UUID
    state: str  # 'not_started', 'in_progress', 'completed', 'failed'
    analysis_id: Optional[UUID] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
