"""Analysis routes."""

import asyncio
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.response import Response
from app.models.analysis import Analysis
from app.schemas.analysis import (
    AnalyzeRequest,
    Analysis as AnalysisSchema,
)
from app.schemas.conversation import ConversationState
from app.schemas.common import SuccessResponse
from app.services.analysis_service import AnalysisService
from app.services.notification_service import notification_service
from app.services.email_service import email_service
from app.utils.email_preferences import should_send_email

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def run_analysis_task(
    conversation_id: UUID,
    db_url: str,
    min_cluster_size: int = 2
):
    """
    Background task to run analysis.

    Args:
        conversation_id: Conversation ID to analyze
        db_url: Database connection URL
        min_cluster_size: Minimum cluster size for DBSCAN
    """
    # Create a new database session for this background task
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Get conversation with questions
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()

        if not conversation:
            return

        # Get all responses for the conversation
        responses = db.query(Response).filter(
            Response.conversation_id == conversation_id
        ).all()

        # Run analysis
        analysis_service = AnalysisService()
        results = analysis_service.analyze_conversation(
            conversation.questions,
            responses,
            min_cluster_size=min_cluster_size
        )

        # Store results in database
        analysis = Analysis(
            conversation_id=conversation_id,
            overall_summary=results["overall_summary"],
            themes=results.get("themes", []),  # Deprecated field
            question_analyses=results["question_analyses"],
            surprising_insights=results.get("surprising_insights"),
            embedding_provider=results["embedding_provider"],
            embedding_model=results["embedding_model"],
            clustering_algorithm=results["clustering_algorithm"],
            llm_provider=results["llm_provider"],
            llm_model=results["llm_model"],
            total_responses_analyzed=results["total_responses_analyzed"],
            num_clusters_found=results["num_clusters_found"],
            analysis_duration_ms=results["analysis_duration_ms"]
        )
        db.add(analysis)

        # Update conversation state
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()

        if conversation:
            conversation.state = ConversationState.ANALYZED.value
            conversation.analyzed_at = datetime.utcnow()

        db.commit()

        # Send notifications to participants
        if conversation:
            results_url = f"https://mosaic.app/analysis/{conversation.id}"  # Will be replaced by settings

            # Send Slack DM notifications to participants
            try:
                asyncio.run(
                    notification_service.notify_analysis_ready(
                        conversation=conversation,
                        db=db,
                    )
                )
            except Exception as e:
                logger.error(f"Failed to send Slack analysis ready notifications: {e}", exc_info=True)

            # Send Slack channel notification if configured
            try:
                asyncio.run(
                    notification_service.notify_channel_analysis_ready(
                        conversation=conversation,
                        db=db,
                    )
                )
            except Exception as e:
                logger.error(f"Failed to send Slack channel analysis notification: {e}", exc_info=True)

            # Send email notifications
            try:
                asyncio.run(
                    _send_analysis_ready_emails(conversation, db)
                )
            except Exception as e:
                logger.error(f"Failed to send email analysis ready notifications: {e}", exc_info=True)

    except Exception as e:
        db.rollback()
        # Log error (in production, use proper logging)
        logger.error(f"Analysis failed for conversation {conversation_id}: {str(e)}")
        raise
    finally:
        db.close()


async def _send_analysis_ready_emails(
    conversation: Conversation,
    db: Session,
) -> None:
    """Send analysis ready email notifications."""
    from app.core.config import settings

    results_url = f"{settings.FRONTEND_URL}/analysis/{conversation.id}"

    # Send to creator
    if conversation.creator_id:
        creator = db.query(User).filter(User.id == conversation.creator_id).first()
        if creator and creator.email and should_send_email(db, creator.email, "analysis_ready"):
            try:
                await email_service.send_analysis_ready_email(
                    to_email=creator.email,
                    conversation_title=conversation.title,
                    results_url=results_url,
                )
            except Exception as e:
                logger.error(f"Failed to send analysis ready email to creator {creator.email}: {e}", exc_info=True)

    # Send to participants if results are accessible
    if conversation.results_access != "creator_only":
        # Get unique participants who responded
        participant_ids = db.query(Response.participant_id).filter(
            Response.conversation_id == conversation.id,
            Response.participant_id.isnot(None),
            Response.status == "submitted",
        ).distinct().all()

        participant_ids = [p[0] for p in participant_ids if p[0] != conversation.creator_id]

        for participant_id in participant_ids:
            user = db.query(User).filter(User.id == participant_id).first()
            if user and user.email and should_send_email(db, user.email, "analysis_ready"):
                try:
                    await email_service.send_analysis_ready_email(
                        to_email=user.email,
                        conversation_title=conversation.title,
                        results_url=results_url,
                    )
                except Exception as e:
                    logger.error(f"Failed to send analysis ready email to participant {user.email}: {e}", exc_info=True)


@router.post("/conversations/{conversation_id}/analyze", response_model=SuccessResponse)
@limiter.limit("10/minute")
async def trigger_analysis(
    request: Request,
    conversation_id: UUID,
    analyze_request: Optional[AnalyzeRequest] = None,
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Trigger LLM analysis for a conversation.

    The analysis runs in the background and includes:
    - Embedding generation using OpenAI
    - Clustering using DBSCAN
    - Theme extraction and summarization using Claude

    Args:
        conversation_id: Conversation ID to analyze
        analyze_request: Optional analysis parameters
        background_tasks: FastAPI background tasks
        current_user: Current authenticated user
        db: Database session

    Returns:
        Success response

    Raises:
        HTTPException: If conversation not found, user is not owner, or conversation not closed
    """
    # Verify user owns the conversation
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.creator_id == current_user.id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Check if AI analysis is enabled for this user
    from app.services.feature_flag_service import feature_flag_service
    if not feature_flag_service.is_enabled(
        db, "ai_analysis",
        org_id=conversation.organization_id,
        user_id=current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI analysis is not available for your account"
        )

    # Check if analysis is already in progress
    if conversation.state == ConversationState.ANALYZING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Analysis is already in progress"
        )

    # Check if conversation is closed or analyzed
    if conversation.state not in [ConversationState.CLOSED.value, ConversationState.ANALYZED.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation must be closed before analysis"
        )

    # Check if there are responses to analyze
    response_count = db.query(Response).filter(
        Response.conversation_id == conversation_id
    ).count()

    if response_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No responses to analyze"
        )

    # Check if analysis already exists
    existing_analysis = db.query(Analysis).filter(
        Analysis.conversation_id == conversation_id
    ).first()

    if existing_analysis:
        # Delete old analysis to replace with new one
        db.delete(existing_analysis)
        db.commit()

    # Set conversation state to ANALYZING
    conversation.state = ConversationState.ANALYZING.value
    db.commit()

    # Trigger background analysis
    from app.core.config import settings

    if background_tasks:
        background_tasks.add_task(
            run_analysis_task,
            conversation_id=conversation_id,
            db_url=settings.DATABASE_URL,
            min_cluster_size=2
        )

        return SuccessResponse(
            success=True,
            message="Analysis started in background"
        )
    else:
        # Run synchronously (for testing or when background tasks not available)
        run_analysis_task(
            conversation_id=conversation_id,
            db_url=settings.DATABASE_URL,
            min_cluster_size=2
        )

        return SuccessResponse(
            success=True,
            message="Analysis completed"
        )


@router.get("/conversations/{conversation_id}/analysis", response_model=AnalysisSchema)
async def get_analysis(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get analysis results for a conversation.

    Access control based on results_access setting:
    - CREATOR_ONLY: Only the conversation creator can view
    - PARTICIPANTS: Creator and anyone who submitted a response can view
    - PUBLIC_LINK: Anyone authenticated can view

    Args:
        conversation_id: Conversation ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Analysis results

    Raises:
        HTTPException: If conversation not found, user doesn't have access, or no analysis exists
    """
    from app.models.response import Response
    from app.schemas.conversation import ResultsAccess

    # Get the conversation
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Check access permissions
    is_creator = conversation.creator_id == current_user.id

    if not is_creator:
        # Not the creator - check results_access setting
        if conversation.results_access == ResultsAccess.CREATOR_ONLY.value:
            # Only creator can view
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        elif conversation.results_access == ResultsAccess.PARTICIPANTS.value:
            # Check if user has submitted a response
            has_responded = db.query(Response).filter(
                Response.conversation_id == conversation_id,
                Response.participant_id == current_user.id
            ).first() is not None

            if not has_responded:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found"
                )
        # PUBLIC_LINK allows anyone authenticated to view (no additional check needed)

    # Get analysis
    analysis = db.query(Analysis).filter(
        Analysis.conversation_id == conversation_id
    ).order_by(
        Analysis.created_at.desc()
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis found for this conversation"
        )

    # Add conversation metadata to analysis response for participant access
    analysis.conversation_title = conversation.title
    analysis.conversation_timezone = conversation.timezone
    analysis.show_verbatim_responses = conversation.show_verbatim_responses
    analysis.organization_id = conversation.organization_id
    analysis.conversation_activated_at = conversation.activated_at
    analysis.conversation_closed_at = conversation.closed_at

    # Get unique participant count - count by participant_id or participant_code_used
    from sqlalchemy import func, case

    # Count unique participants (those with participant_id)
    unique_by_id = db.query(func.count(func.distinct(Response.participant_id))).filter(
        Response.conversation_id == conversation_id,
        Response.participant_id.isnot(None)
    ).scalar() or 0

    # If no participants with IDs, count by participant_code_used or unique response submissions
    if unique_by_id == 0:
        # Count unique participant codes
        unique_by_code = db.query(func.count(func.distinct(Response.participant_code_used))).filter(
            Response.conversation_id == conversation_id,
            Response.participant_code_used.isnot(None)
        ).scalar() or 0

        if unique_by_code > 0:
            unique_participants = unique_by_code
        else:
            # Fallback: count unique submitted_at timestamps (approximate unique submissions)
            # Group responses by submitted_at to approximate unique respondents
            unique_submissions = db.query(func.count(func.distinct(Response.submitted_at))).filter(
                Response.conversation_id == conversation_id
            ).scalar() or 0
            unique_participants = unique_submissions
    else:
        unique_participants = unique_by_id

    analysis.unique_participants = unique_participants

    return analysis
