"""Periodic analysis routes for continuous conversations."""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.periodic_analysis import PeriodicAnalysis
from app.models.continuous_trends import ContinuousTrends
from app.schemas.periodic_analysis import (
    PeriodicAnalysis as PeriodicAnalysisSchema,
    PeriodicAnalysisList,
    TriggerPeriodicAnalysisRequest,
    ContinuousTrends as ContinuousTrendsSchema,
)
from app.schemas.common import SuccessResponse
from app.services.continuous_trends_service import ContinuousTrendsService
from app.services.scheduler_service import run_periodic_analysis_task, generate_period_label

router = APIRouter()


def get_conversation_or_404(
    conversation_id: UUID,
    db: Session,
    current_user: User
) -> Conversation:
    """Get conversation and verify user access."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.creator_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    return conversation


@router.get(
    "/conversations/{conversation_id}/periodic-analyses",
    response_model=PeriodicAnalysisList,
    summary="List periodic analyses",
    description="List all periodic analyses for a continuous conversation, ordered by period_start descending."
)
async def list_periodic_analyses(
    conversation_id: UUID,
    skip: int = Query(0, ge=0, description="Number of analyses to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of analyses to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all periodic analyses for a continuous conversation."""
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    if not conversation.is_continuous:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Periodic analyses are only available for continuous conversations"
        )

    # Get total count
    total = db.query(PeriodicAnalysis).filter(
        PeriodicAnalysis.conversation_id == conversation_id
    ).count()

    # Get analyses with pagination
    analyses = db.query(PeriodicAnalysis).filter(
        PeriodicAnalysis.conversation_id == conversation_id
    ).order_by(
        PeriodicAnalysis.period_start.desc()
    ).offset(skip).limit(limit).all()

    return PeriodicAnalysisList(
        conversation_id=conversation_id,
        total_periods=total,
        analyses=analyses
    )


@router.get(
    "/conversations/{conversation_id}/periodic-analyses/{period_label}",
    response_model=PeriodicAnalysisSchema,
    summary="Get periodic analysis by period",
    description="Get a specific periodic analysis by its period label (e.g., '2024-W01', '2024-01')."
)
async def get_periodic_analysis(
    conversation_id: UUID,
    period_label: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific periodic analysis by period label."""
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    analysis = db.query(PeriodicAnalysis).filter(
        PeriodicAnalysis.conversation_id == conversation_id,
        PeriodicAnalysis.period_label == period_label
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Periodic analysis not found for period '{period_label}'"
        )

    return analysis


@router.post(
    "/conversations/{conversation_id}/periodic-analyses/trigger",
    response_model=SuccessResponse,
    summary="Trigger periodic analysis",
    description="Manually trigger a periodic analysis for a specific time window."
)
async def trigger_periodic_analysis(
    conversation_id: UUID,
    request: TriggerPeriodicAnalysisRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger a periodic analysis for a specific time window."""
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    if not conversation.is_continuous:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only trigger periodic analysis for continuous conversations"
        )

    # Determine analysis window
    if request.period_end:
        period_end = request.period_end
    else:
        period_end = datetime.utcnow()

    if request.period_start:
        period_start = request.period_start
    else:
        # Find last analysis
        last_analysis = db.query(PeriodicAnalysis).filter(
            PeriodicAnalysis.conversation_id == conversation_id
        ).order_by(PeriodicAnalysis.period_end.desc()).first()

        if last_analysis:
            period_start = last_analysis.period_end
        elif conversation.activated_at:
            period_start = conversation.activated_at
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot determine analysis window. Please specify period_start."
            )

    # Ensure both datetimes are naive (UTC) for comparison
    # Remove timezone info if present (assume UTC)
    if period_start.tzinfo is not None:
        period_start = period_start.replace(tzinfo=None)
    if period_end.tzinfo is not None:
        period_end = period_end.replace(tzinfo=None)

    # Validate period
    if period_start >= period_end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="period_start must be before period_end"
        )

    # Check if analysis for this period already exists
    period_type = conversation.analysis_interval or "weekly"
    period_label = generate_period_label(period_start, period_end, period_type)

    existing = db.query(PeriodicAnalysis).filter(
        PeriodicAnalysis.conversation_id == conversation_id,
        PeriodicAnalysis.period_label == period_label
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Periodic analysis for period '{period_label}' already exists"
        )

    # Trigger background analysis
    background_tasks.add_task(
        run_periodic_analysis_task,
        conversation_id=conversation_id,
        period_start=period_start,
        period_end=period_end,
        period_type=period_type,
        db_url=settings.DATABASE_URL
    )

    return SuccessResponse(
        success=True,
        message=f"Periodic analysis triggered for {period_start.date()} to {period_end.date()}"
    )


@router.get(
    "/conversations/{conversation_id}/trends",
    response_model=ContinuousTrendsSchema,
    summary="Get continuous trends",
    description="Get trends across all periodic analyses for a continuous conversation."
)
async def get_continuous_trends(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get trends across all periodic analyses for a continuous conversation."""
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    if not conversation.is_continuous:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trends are only available for continuous conversations"
        )

    trends = db.query(ContinuousTrends).filter(
        ContinuousTrends.conversation_id == conversation_id
    ).first()

    if not trends:
        # Check if we have enough analyses
        analyses_count = db.query(PeriodicAnalysis).filter(
            PeriodicAnalysis.conversation_id == conversation_id
        ).count()

        if analyses_count < 2:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Need at least 2 periodic analyses to compute trends. Currently have {analyses_count}."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Trends not computed yet. Run /trends/recompute to generate."
            )

    return trends


@router.post(
    "/conversations/{conversation_id}/trends/recompute",
    response_model=ContinuousTrendsSchema,
    summary="Recompute trends",
    description="Recompute trends from all periodic analyses."
)
async def recompute_trends(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Recompute trends from all periodic analyses."""
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    if not conversation.is_continuous:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Trends are only available for continuous conversations"
        )

    # Get all periodic analyses
    analyses = db.query(PeriodicAnalysis).filter(
        PeriodicAnalysis.conversation_id == conversation_id
    ).order_by(PeriodicAnalysis.period_start).all()

    if len(analyses) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Need at least 2 periodic analyses to compute trends. Currently have {len(analyses)}."
        )

    # Compute trends
    service = ContinuousTrendsService()
    period_type = conversation.analysis_interval or "weekly"
    trends_data = service.compute_trends(analyses, period_type)

    # Update or create trends record
    trends = db.query(ContinuousTrends).filter(
        ContinuousTrends.conversation_id == conversation_id
    ).first()

    if trends:
        trends.trends = trends_data
        trends.periods_analyzed = len(analyses)
        trends.last_computed_at = datetime.utcnow()
        trends.computation_duration_ms = trends_data.get("computation_duration_ms")
    else:
        import uuid
        trends = ContinuousTrends(
            id=uuid.uuid4(),
            conversation_id=conversation_id,
            trends=trends_data,
            periods_analyzed=len(analyses),
            computation_duration_ms=trends_data.get("computation_duration_ms")
        )
        db.add(trends)

    db.commit()
    db.refresh(trends)

    return trends
