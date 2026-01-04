"""Series routes."""

from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.series import Series
from app.models.organization import OrganizationMember
from app.models.conversation import Conversation
from app.models.analysis import Analysis
from app.models.collection_analysis import CollectionAnalysis
from app.schemas.series import (
    SeriesCreate,
    SeriesUpdate,
    Series as SeriesSchema,
    SeriesWithConversations,
)
from app.schemas.conversation import ConversationListItem, ConversationState
from app.schemas.collection_analysis import CollectionAnalysis as CollectionAnalysisSchema
from app.services.organization_service import check_organization_membership
from app.services.collection_analysis_service import CollectionAnalysisService
from datetime import datetime

router = APIRouter()


def get_series_or_404(db: Session, series_id: UUID) -> Series:
    """Get series by ID or raise 404."""
    series = db.query(Series).filter(Series.id == series_id).first()
    if not series:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Series not found"
        )
    return series


def require_series_access(db: Session, series_id: UUID, current_user: User):
    """Check user has access to series (creator or org member)."""
    series = get_series_or_404(db, series_id)
    
    # Creator always has access
    if series.creator_id == current_user.id:
        return series
    
    # If series belongs to organization, check membership
    if series.organization_id:
        membership = check_organization_membership(
            db, series.organization_id, current_user.id
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this series"
            )
    
    return series


@router.post("", response_model=SeriesSchema, status_code=status.HTTP_201_CREATED)
async def create_series(
    series_data: SeriesCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new series.

    Args:
        series_data: Series creation data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created series

    Raises:
        HTTPException: If organization_id provided and user is not a member
    """
    # If organization_id is provided, verify user is member
    if series_data.organization_id:
        membership = check_organization_membership(
            db, series_data.organization_id, current_user.id
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a member of this organization to create series in it"
            )

    # Create series
    series = Series(
        name=series_data.name,
        description=series_data.description,
        creator_id=current_user.id,
        organization_id=series_data.organization_id,
    )
    db.add(series)
    db.commit()
    db.refresh(series)

    return series


@router.get("", response_model=List[SeriesSchema])
async def list_series(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    organization_id: Optional[UUID] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List series accessible to the user.

    Includes:
    - Series created by the user
    - Series in organizations where the user is a member

    Args:
        skip: Number of series to skip
        limit: Maximum number of series to return
        organization_id: Optional filter by organization
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of series
    """
    # Get user's organizations
    user_org_ids = db.query(OrganizationMember.organization_id).filter(
        OrganizationMember.user_id == current_user.id
    ).subquery()

    query = db.query(Series).filter(
        or_(
            Series.creator_id == current_user.id,
            Series.organization_id.in_(user_org_ids)
        )
    )

    if organization_id:
        query = query.filter(Series.organization_id == organization_id)

    query = query.order_by(Series.created_at.desc())
    query = query.offset(skip).limit(limit)

    return query.all()


@router.get("/{series_id}", response_model=SeriesWithConversations)
async def get_series(
    series_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get series details with conversation list.

    Args:
        series_id: Series ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Series with conversations

    Raises:
        HTTPException: If series not found or user doesn't have access
    """
    # Check access
    series = require_series_access(db, series_id, current_user)

    # Get conversations in this series
    conversations_query = db.query(
        Conversation,
        func.count(Conversation.id).label('response_count')
    ).outerjoin(Conversation.responses).filter(
        Conversation.series_id == series_id,
        Conversation.state != ConversationState.DELETED.value
    ).group_by(Conversation.id).order_by(Conversation.created_at.desc())

    conversations = []
    for conv, _ in conversations_query.all():
        conv_dict = {
            "id": str(conv.id),
            "title": conv.title,
            "state": ConversationState(conv.state),
            "anonymity_level": conv.anonymity_level,
            "access_code": conv.access_code,
            "created_at": conv.created_at.isoformat(),
            "activated_at": conv.activated_at.isoformat() if conv.activated_at else None,
            "closed_at": conv.closed_at.isoformat() if conv.closed_at else None,
            "timezone": conv.timezone,
            "organization_id": str(conv.organization_id) if conv.organization_id else None,
            "is_follow_up": conv.parent_conversation_id is not None,
            "parent_conversation_id": str(conv.parent_conversation_id) if conv.parent_conversation_id else None,
            "series_id": str(conv.series_id) if conv.series_id else None,
            "is_recurring_instance": conv.is_recurring_instance,
            "recurrence_pattern": conv.recurrence_pattern,
        }
        conversations.append(ConversationListItem(**conv_dict))

    # Build response
    series_dict = {
        "id": str(series.id),
        "name": series.name,
        "description": series.description,
        "creator_id": str(series.creator_id),
        "organization_id": str(series.organization_id) if series.organization_id else None,
        "created_at": series.created_at,
        "updated_at": series.updated_at,
        "conversations": conversations,
    }

    return SeriesWithConversations(**series_dict)


@router.patch("/{series_id}", response_model=SeriesSchema)
async def update_series(
    series_id: UUID,
    series_update: SeriesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update series details (name, description).

    Args:
        series_id: Series ID
        series_update: Series update data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated series

    Raises:
        HTTPException: If series not found or user is not creator
    """
    # Check access and that user is creator
    series = require_series_access(db, series_id, current_user)
    
    if series.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator can update a series"
        )

    # Update fields
    if series_update.name is not None:
        series.name = series_update.name
    if series_update.description is not None:
        series.description = series_update.description

    db.commit()
    db.refresh(series)

    return series


@router.delete("/{series_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_series(
    series_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a series.
    
    When a series is deleted:
    - All conversations in the series will have their series_id set to NULL (they won't be deleted)
    - Collection analyses for this series will be deleted
    - The series itself will be deleted

    Args:
        series_id: Series ID
        current_user: Current authenticated user
        db: Database session

    Raises:
        HTTPException: If series not found or user is not creator
    """
    # Check access and that user is creator
    series = require_series_access(db, series_id, current_user)
    
    if series.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator can delete a series"
        )

    # Set all conversations' series_id to NULL (conversations are not deleted)
    db.query(Conversation).filter(
        Conversation.series_id == series_id
    ).update({Conversation.series_id: None}, synchronize_session=False)

    # Delete collection analyses for this series
    db.query(CollectionAnalysis).filter(
        CollectionAnalysis.series_id == series_id
    ).delete(synchronize_session=False)

    # Delete the series
    db.delete(series)
    db.commit()

    return None


@router.get("/{series_id}/analysis", response_model=Optional[CollectionAnalysisSchema])
async def get_collection_analysis(
    series_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get collection analysis (summary, insights, trends).
    
    Returns cached analysis if available, otherwise returns None.
    
    Args:
        series_id: Series ID
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Collection analysis if exists, None otherwise
    
    Raises:
        HTTPException: If series not found or user doesn't have access
    """
    # Check access
    series = require_series_access(db, series_id, current_user)
    
    # Get existing analysis
    analysis = db.query(CollectionAnalysis).filter(
        CollectionAnalysis.series_id == series_id
    ).first()
    
    if analysis:
        return analysis
    
    return None  # No analysis computed yet


@router.post("/{series_id}/analyze", response_model=CollectionAnalysisSchema)
async def compute_collection_analysis(
    series_id: UUID,
    force: bool = Query(False, description="Force recomputation even if exists"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compute collection analysis (summary, insights, trends).
    
    If analysis already exists and force=False, returns existing.
    Otherwise computes new analysis and persists to DB.
    
    Args:
        series_id: Series ID
        force: Force recomputation even if analysis exists
        current_user: Current authenticated user
        db: Database session
    
    Returns:
        Collection analysis
    
    Raises:
        HTTPException: If series not found or user doesn't have access
    """
    # Check access
    series = require_series_access(db, series_id, current_user)
    
    # Check if analysis exists
    existing = db.query(CollectionAnalysis).filter(
        CollectionAnalysis.series_id == series_id
    ).first()
    
    if existing and not force:
        return existing
    
    # Get all conversations in collection
    conversations = db.query(Conversation).filter(
        Conversation.series_id == series_id,
        Conversation.state != ConversationState.DELETED.value
    ).all()
    
    # Get all analyses for these conversations
    conversation_ids = [c.id for c in conversations]
    analyses = db.query(Analysis).filter(
        Analysis.conversation_id.in_(conversation_ids)
    ).all()
    
    # Generate analysis
    service = CollectionAnalysisService()
    analysis_data = service.generate_collection_analysis(conversations, analyses)
    
    # Save to database
    if existing:
        # Update existing
        for key, value in analysis_data.items():
            setattr(existing, key, value)
        existing.computed_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    else:
        # Create new
        collection_analysis = CollectionAnalysis(
            series_id=series_id,
            **analysis_data
        )
        db.add(collection_analysis)
        db.commit()
        db.refresh(collection_analysis)
        return collection_analysis

