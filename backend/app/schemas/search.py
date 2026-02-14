"""Search schemas."""

from datetime import datetime
from typing import Optional, List, Literal, Union
from uuid import UUID
from pydantic import BaseModel, Field
from enum import Enum


class SearchEntityType(str, Enum):
    """Searchable entity types."""
    CONVERSATION = "conversation"
    SERIES = "series"
    ANALYSIS = "analysis"


class SearchRequest(BaseModel):
    """Request schema for search."""

    query: str = Field(..., min_length=1, max_length=500, description="Search query string")
    entity_types: Optional[List[SearchEntityType]] = Field(
        default=None,
        description="Entity types to search. If None, searches all types."
    )
    page: int = Field(default=1, ge=1, description="Page number")
    page_size: int = Field(default=20, ge=1, le=100, description="Results per page")

    # Optional filters
    organization_id: Optional[UUID] = Field(
        default=None,
        description="Filter to specific organization"
    )
    include_archived: bool = Field(
        default=False,
        description="Include archived conversations"
    )


class SearchResultBase(BaseModel):
    """Base search result."""

    id: UUID
    entity_type: SearchEntityType
    rank: float = Field(..., description="Search relevance rank (higher is better)")
    headline: Optional[str] = Field(
        default=None,
        description="Text snippet with search terms highlighted"
    )


class ConversationSearchResult(SearchResultBase):
    """Search result for a conversation."""

    entity_type: Literal[SearchEntityType.CONVERSATION] = SearchEntityType.CONVERSATION
    title: str
    description: Optional[str] = None
    state: str
    access_code: str
    created_at: datetime
    is_archived: bool = False
    organization_id: Optional[UUID] = None

    model_config = {"from_attributes": True}


class SeriesSearchResult(SearchResultBase):
    """Search result for a series."""

    entity_type: Literal[SearchEntityType.SERIES] = SearchEntityType.SERIES
    name: str
    description: Optional[str] = None
    created_at: datetime
    conversation_count: int = 0
    organization_id: Optional[UUID] = None

    model_config = {"from_attributes": True}


class AnalysisSearchResult(SearchResultBase):
    """Search result for an analysis."""

    entity_type: Literal[SearchEntityType.ANALYSIS] = SearchEntityType.ANALYSIS
    conversation_id: UUID
    conversation_title: str
    overall_summary: Optional[str] = None
    created_at: datetime
    total_responses_analyzed: Optional[int] = None
    organization_id: Optional[UUID] = None

    model_config = {"from_attributes": True}


# Union type for all search results
SearchResult = Union[ConversationSearchResult, SeriesSearchResult, AnalysisSearchResult]


class SearchResponse(BaseModel):
    """Response schema for search."""

    query: str
    results: List[SearchResult]
    total: int
    page: int
    page_size: int
    total_pages: int
    entity_counts: dict = Field(
        default_factory=dict,
        description="Count of results by entity type"
    )


class SearchSuggestionsResponse(BaseModel):
    """Response schema for search suggestions."""

    suggestions: List[str]
