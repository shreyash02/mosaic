"""Search routes."""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.series import Series
from app.models.analysis import Analysis
from app.models.organization import OrganizationMember
from app.schemas.search import (
    SearchRequest,
    SearchResponse,
    SearchEntityType,
    ConversationSearchResult,
    SeriesSearchResult,
    AnalysisSearchResult,
    SearchSuggestionsResponse,
)
from app.schemas.conversation import ConversationState

router = APIRouter()


def get_user_accessible_org_ids(db: Session, user_id: UUID) -> List[UUID]:
    """Get list of organization IDs the user has access to."""
    memberships = db.query(OrganizationMember.organization_id).filter(
        OrganizationMember.user_id == user_id
    ).all()
    return [m.organization_id for m in memberships]


def build_access_filter(table, user_id: UUID, org_ids: List[UUID]):
    """Build access control filter for a table with creator_id and organization_id."""
    conditions = [table.creator_id == user_id]
    if org_ids:
        conditions.append(table.organization_id.in_(org_ids))
    return or_(*conditions)


def build_prefix_tsquery(query_text: str) -> str:
    """
    Build a tsquery string with prefix matching support.

    Converts "sprint retr" to "sprint:* & retr:*" so partial words match.
    """
    import re
    # Split on whitespace and filter empty strings
    words = [w.strip() for w in query_text.split() if w.strip()]
    if not words:
        return ""

    # Remove special characters that could break tsquery, keep alphanumeric
    sanitized = []
    for word in words:
        # Keep only alphanumeric characters
        clean = re.sub(r'[^\w]', '', word)
        if clean:
            sanitized.append(f"{clean}:*")

    if not sanitized:
        return ""

    # Join with AND operator
    return " & ".join(sanitized)


@router.post("", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search across conversations, series, and analyses.

    Results are filtered to only include content the user has access to:
    - Content created by the user
    - Content in organizations the user is a member of

    Args:
        request: Search request with query, filters, and pagination
        current_user: Current authenticated user
        db: Database session

    Returns:
        SearchResponse with ranked results and pagination info
    """
    query_text = request.query.strip()

    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query cannot be empty"
        )

    # Get user's accessible organizations
    user_org_ids = get_user_accessible_org_ids(db, current_user.id)

    # Determine which entity types to search
    entity_types = request.entity_types or list(SearchEntityType)

    # Build search query with prefix matching support
    prefix_query = build_prefix_tsquery(query_text)
    if not prefix_query:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must contain valid search terms"
        )
    ts_query = func.to_tsquery('english', prefix_query)

    results = []
    entity_counts = {}

    # Search Conversations
    if SearchEntityType.CONVERSATION in entity_types:
        conv_results = _search_conversations(
            db, current_user.id, user_org_ids, ts_query, query_text,
            request.organization_id, request.include_archived
        )
        results.extend(conv_results)
        entity_counts[SearchEntityType.CONVERSATION.value] = len(conv_results)

    # Search Series
    if SearchEntityType.SERIES in entity_types:
        series_results = _search_series(
            db, current_user.id, user_org_ids, ts_query, query_text,
            request.organization_id
        )
        results.extend(series_results)
        entity_counts[SearchEntityType.SERIES.value] = len(series_results)

    # Search Analyses
    if SearchEntityType.ANALYSIS in entity_types:
        analysis_results = _search_analyses(
            db, current_user.id, user_org_ids, ts_query, query_text,
            request.organization_id
        )
        results.extend(analysis_results)
        entity_counts[SearchEntityType.ANALYSIS.value] = len(analysis_results)

    # Sort all results by rank (descending)
    results.sort(key=lambda x: x.rank, reverse=True)

    # Calculate pagination
    total = len(results)
    total_pages = (total + request.page_size - 1) // request.page_size if total > 0 else 0

    # Apply pagination
    start_idx = (request.page - 1) * request.page_size
    end_idx = start_idx + request.page_size
    paginated_results = results[start_idx:end_idx]

    return SearchResponse(
        query=query_text,
        results=paginated_results,
        total=total,
        page=request.page,
        page_size=request.page_size,
        total_pages=total_pages,
        entity_counts=entity_counts
    )


def _search_conversations(
    db: Session,
    user_id: UUID,
    org_ids: List[UUID],
    ts_query,
    query_text: str,
    organization_filter: Optional[UUID],
    include_archived: bool
) -> List[ConversationSearchResult]:
    """Search conversations with FTS."""

    # Build base query with rank and headline
    rank_expr = func.ts_rank(Conversation.search_vector, ts_query)
    headline_expr = func.ts_headline(
        'english',
        func.coalesce(Conversation.title, '') + ' ' + func.coalesce(Conversation.description, ''),
        ts_query,
        'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25'
    )

    query = db.query(
        Conversation,
        rank_expr.label('rank'),
        headline_expr.label('headline')
    ).filter(
        Conversation.search_vector.op('@@')(ts_query),
        Conversation.state != ConversationState.DELETED.value,
        build_access_filter(Conversation, user_id, org_ids)
    )

    # Apply filters
    if organization_filter:
        query = query.filter(Conversation.organization_id == organization_filter)

    if not include_archived:
        query = query.filter(Conversation.is_archived == False)

    # Execute and transform results
    results = []
    for conv, rank, headline in query.all():
        results.append(ConversationSearchResult(
            id=conv.id,
            rank=float(rank) if rank else 0.0,
            headline=headline,
            title=conv.title,
            description=conv.description,
            state=conv.state,
            access_code=conv.access_code,
            created_at=conv.created_at,
            is_archived=conv.is_archived,
            organization_id=conv.organization_id
        ))

    return results


def _search_series(
    db: Session,
    user_id: UUID,
    org_ids: List[UUID],
    ts_query,
    query_text: str,
    organization_filter: Optional[UUID]
) -> List[SeriesSearchResult]:
    """Search series with FTS."""

    rank_expr = func.ts_rank(Series.search_vector, ts_query)
    headline_expr = func.ts_headline(
        'english',
        func.coalesce(Series.name, '') + ' ' + func.coalesce(Series.description, ''),
        ts_query,
        'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25'
    )

    # Count conversations in each series
    conv_count_subquery = db.query(
        Conversation.series_id,
        func.count(Conversation.id).label('count')
    ).filter(
        Conversation.state != ConversationState.DELETED.value
    ).group_by(Conversation.series_id).subquery()

    query = db.query(
        Series,
        rank_expr.label('rank'),
        headline_expr.label('headline'),
        func.coalesce(conv_count_subquery.c.count, 0).label('conversation_count')
    ).outerjoin(
        conv_count_subquery, Series.id == conv_count_subquery.c.series_id
    ).filter(
        Series.search_vector.op('@@')(ts_query),
        build_access_filter(Series, user_id, org_ids)
    )

    if organization_filter:
        query = query.filter(Series.organization_id == organization_filter)

    results = []
    for series, rank, headline, conv_count in query.all():
        results.append(SeriesSearchResult(
            id=series.id,
            rank=float(rank) if rank else 0.0,
            headline=headline,
            name=series.name,
            description=series.description,
            created_at=series.created_at,
            conversation_count=conv_count,
            organization_id=series.organization_id
        ))

    return results


def _search_analyses(
    db: Session,
    user_id: UUID,
    org_ids: List[UUID],
    ts_query,
    query_text: str,
    organization_filter: Optional[UUID]
) -> List[AnalysisSearchResult]:
    """Search analyses with FTS."""

    rank_expr = func.ts_rank(Analysis.search_vector, ts_query)
    headline_expr = func.ts_headline(
        'english',
        func.coalesce(Analysis.overall_summary, ''),
        ts_query,
        'StartSel=<mark>, StopSel=</mark>, MaxWords=50, MinWords=25'
    )

    # Join with conversations for access control and title
    query = db.query(
        Analysis,
        Conversation.title.label('conversation_title'),
        Conversation.organization_id.label('organization_id'),
        rank_expr.label('rank'),
        headline_expr.label('headline')
    ).join(
        Conversation, Analysis.conversation_id == Conversation.id
    ).filter(
        Analysis.search_vector.op('@@')(ts_query),
        Conversation.state != ConversationState.DELETED.value,
        build_access_filter(Conversation, user_id, org_ids)
    )

    if organization_filter:
        query = query.filter(Conversation.organization_id == organization_filter)

    results = []
    for analysis, conv_title, org_id, rank, headline in query.all():
        results.append(AnalysisSearchResult(
            id=analysis.id,
            rank=float(rank) if rank else 0.0,
            headline=headline,
            conversation_id=analysis.conversation_id,
            conversation_title=conv_title,
            overall_summary=analysis.overall_summary,
            created_at=analysis.created_at,
            total_responses_analyzed=analysis.total_responses_analyzed,
            organization_id=org_id
        ))

    return results


@router.get("/suggestions", response_model=SearchSuggestionsResponse)
async def search_suggestions(
    q: str = Query(..., min_length=1, max_length=100),
    limit: int = Query(default=5, ge=1, le=10),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get search suggestions based on partial query.

    Returns top matching conversation titles and series names.
    """
    user_org_ids = get_user_accessible_org_ids(db, current_user.id)

    # Search conversation titles with ILIKE for prefix matching
    conv_suggestions = db.query(Conversation.title).filter(
        Conversation.title.ilike(f"{q}%"),
        Conversation.state != ConversationState.DELETED.value,
        build_access_filter(Conversation, current_user.id, user_org_ids)
    ).limit(limit).all()

    # Search series names
    series_suggestions = db.query(Series.name).filter(
        Series.name.ilike(f"{q}%"),
        build_access_filter(Series, current_user.id, user_org_ids)
    ).limit(limit).all()

    suggestions = list(set(
        [c.title for c in conv_suggestions] +
        [s.name for s in series_suggestions]
    ))[:limit]

    return SearchSuggestionsResponse(suggestions=suggestions)
