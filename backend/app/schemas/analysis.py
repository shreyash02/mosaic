"""Analysis schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


# Perspective within a theme
class Perspective(BaseModel):
    """A perspective or viewpoint within a theme."""

    name: str = Field(..., min_length=1)
    summary: str
    count: int = Field(..., ge=0)


# Surprising insight
class SurprisingInsight(BaseModel):
    """A surprising insight from the analysis."""

    title: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)


# Theme extracted from responses
class Theme(BaseModel):
    """Theme extracted from analysis."""

    theme: str = Field(..., min_length=1)
    summary: str = Field(..., min_length=1)
    frequency: int = Field(..., ge=0)
    perspectives: List[Perspective] = []
    key_points: Optional[List[str]] = None


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
    surprising_insights: Optional[List["SurprisingInsight"]] = None  # AI-generated "What Surprised Us" section

    # Per-question analysis
    question_analyses: Optional[List["QuestionAnalysis"]] = []

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
    
    @field_validator('surprising_insights', mode='before')
    @classmethod
    def validate_surprising_insights(cls, v):
        """Validate and convert surprising_insights field.
        
        Handles:
        - None -> None (keep as None since it's Optional)
        - String (JSON string from DB) -> Parse and validate
        - String (old markdown format) -> None (discard old markdown text)
        - List -> Validate each item
        - Invalid data -> None
        """
        import json
        
        if v is None:
            return None
        
        # If it's a string, try to parse it as JSON first
        # (JSONB from PostgreSQL might be serialized as a string)
        if isinstance(v, str):
            try:
                parsed = json.loads(v)
                # Recursively call validation on parsed data
                return cls.validate_surprising_insights(parsed)
            except (json.JSONDecodeError, ValueError):
                # Not valid JSON - likely old markdown format, discard it
                return None
        
        # If it's already a list, validate each item
        if isinstance(v, list):
            validated = []
            for item in v:
                if isinstance(item, dict):
                    # Validate required fields - be lenient with types
                    title = item.get("title")
                    description = item.get("description")
                    
                    if title and description:
                        # Convert to string if needed and strip
                        title_str = str(title).strip() if title else ""
                        desc_str = str(description).strip() if description else ""
                        
                        if title_str and desc_str:
                            validated.append({
                                "title": title_str,
                                "description": desc_str
                            })
            
            # Return validated list if we have items, otherwise None
            return validated if validated else None
        
        # Invalid format, return None
        return None


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
