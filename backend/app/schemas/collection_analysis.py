"""Collection analysis schemas."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.analysis import SurprisingInsight


class ThemeDataPoint(BaseModel):
    """Single data point in theme evolution."""
    period: str
    period_start: str  # ISO format datetime
    period_end: str  # ISO format datetime
    normalized_score: float = Field(..., ge=0, le=1)
    frequency: int
    conversation_count: int


class ThemeTrend(BaseModel):
    """Theme evolution trend."""
    theme_id: str
    theme_name: str
    question_text: str
    data_points: List[ThemeDataPoint]


class TrendsData(BaseModel):
    """Trends data structure."""
    period: str  # 'daily', 'weekly', 'monthly'
    themes: List[ThemeTrend]


class QuestionInsight(BaseModel):
    """Aggregated question insight across conversations."""
    question_text: str
    question_type: str
    total_responses: int
    conversation_count: int
    
    # For text questions
    themes: Optional[List[Dict[str, Any]]] = None
    
    # For rating questions
    rating_stats: Optional[Dict[str, Any]] = None
    
    # For poll questions
    poll_stats: Optional[Dict[str, Any]] = None


class CollectionAnalysis(BaseModel):
    """Collection analysis schema."""
    id: UUID
    series_id: UUID
    overall_summary: Optional[str] = None
    surprising_insights: Optional[List[SurprisingInsight]] = None
    question_insights: Optional[List[QuestionInsight]] = None
    trends: Optional[TrendsData] = None
    total_conversations: int
    total_responses: int
    conversations_analyzed: int
    conversation_ids: List[str]
    computed_at: datetime
    computation_duration_ms: Optional[int] = None

    model_config = {"from_attributes": True}

