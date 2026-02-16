"""Analysis schemas."""

from datetime import datetime
from typing import Optional, List, Any, Dict
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator


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

    @model_validator(mode='before')
    @classmethod
    def normalize_theme_data(cls, data: Any) -> Dict[str, Any]:
        """Normalize theme data to handle old formats and missing fields."""
        if not isinstance(data, dict):
            return data

        result = dict(data)

        # Convert old clusters format to perspectives
        if 'clusters' in result and 'perspectives' not in result:
            clusters = result.get('clusters', [])
            if isinstance(clusters, list):
                perspectives = []
                for cluster in clusters:
                    if isinstance(cluster, dict):
                        perspective = {
                            "name": cluster.get('sentiment', 'General').title(),
                            "summary": cluster.get('summary', ''),
                            "count": cluster.get('count', 0)
                        }
                        if perspective['summary']:  # Only add if has summary
                            perspectives.append(perspective)
                if perspectives:
                    result['perspectives'] = perspectives

        # Generate summary if missing
        if 'summary' not in result or not result.get('summary'):
            # Try to get summary from clusters
            if 'clusters' in result and isinstance(result['clusters'], list):
                clusters = result['clusters']
                if clusters:
                    first_cluster = clusters[0]
                    if isinstance(first_cluster, dict) and 'summary' in first_cluster:
                        result['summary'] = first_cluster['summary']

            # Try to get summary from perspectives
            if 'summary' not in result and 'perspectives' in result:
                perspectives = result['perspectives']
                if isinstance(perspectives, list) and perspectives:
                    summaries = []
                    for p in perspectives:
                        if isinstance(p, dict) and 'summary' in p:
                            summaries.append(p['summary'])
                    if summaries:
                        result['summary'] = " ".join(summaries[:2])  # Use first 2

            # Fallback summary
            if 'summary' not in result or not result.get('summary'):
                theme_name = result.get('theme', 'Unknown Theme')
                result['summary'] = f"Responses related to {theme_name}"

        return result


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

    # Context snapshot (what the AI saw when this analysis was run)
    context_notes_snapshot: Optional[str] = None

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

    # Conversation metadata (for participant access)
    conversation_title: Optional[str] = None
    conversation_timezone: Optional[str] = None
    show_verbatim_responses: Optional[bool] = None
    organization_id: Optional[UUID] = None
    # Additional conversation metadata for PDF export
    unique_participants: Optional[int] = None
    conversation_activated_at: Optional[datetime] = None
    conversation_closed_at: Optional[datetime] = None

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
    question_image_url: Optional[str] = None  # Image attached to the question

    # For text questions
    themes: List[Theme] = []
    summary: Optional[str] = None  # Summary when themes aren't available or as additional context

    # For rating questions
    rating_stats: Optional[RatingStatistics] = None

    # For poll questions
    poll_stats: Optional[PollStatistics] = None


# Lightweight analysis summary for list views
class AnalysisSummary(BaseModel):
    """Lightweight analysis summary for list views."""

    id: UUID
    conversation_id: UUID
    created_at: datetime
    total_responses_analyzed: Optional[int] = None
    context_notes_snapshot: Optional[str] = None
    llm_model: Optional[str] = None
    analysis_duration_ms: Optional[int] = None

    model_config = {"from_attributes": True}


class AnalysisListResponse(BaseModel):
    """Response for listing analyses."""

    conversation_id: UUID
    total: int
    analyses: List[AnalysisSummary]


# Analysis status
class AnalysisStatus(BaseModel):
    """Analysis status for a conversation."""

    conversation_id: UUID
    state: str  # 'not_started', 'in_progress', 'completed', 'failed'
    analysis_id: Optional[UUID] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
