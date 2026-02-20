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
    AnalysisSummary,
    AnalysisListResponse,
)
from app.schemas.conversation import ConversationState
from app.schemas.common import SuccessResponse
from app.services.analysis_service import AnalysisService
from app.services.notification_service import notification_service
from app.services.email_service import email_service
from app.services.platform_settings_service import get_llm_model
from app.utils.email_preferences import should_send_email

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def run_analysis_task(
    conversation_id: UUID,
    db_url: str,
    min_cluster_size: int = 2,
    is_reanalysis: bool = False
):
    """
    Background task to run analysis.

    Args:
        conversation_id: Conversation ID to analyze
        db_url: Database connection URL
        min_cluster_size: Minimum cluster size for DBSCAN
        is_reanalysis: If True, skip sending notifications (user re-ran analysis)
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

        # Run analysis with context notes
        context_notes = conversation.context_notes
        analysis_service = AnalysisService(model=get_llm_model(db))
        results = analysis_service.analyze_conversation(
            conversation.questions,
            responses,
            min_cluster_size=min_cluster_size,
            context_notes=context_notes
        )

        # Store results in database (snapshot context_notes so viewers see what the AI used)
        analysis = Analysis(
            conversation_id=conversation_id,
            overall_summary=results["overall_summary"],
            themes=results.get("themes", []),  # Deprecated field
            question_analyses=results["question_analyses"],
            surprising_insights=results.get("surprising_insights"),
            context_notes_snapshot=context_notes,
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

        # Auto-generate suggested actions if confidence is high enough
        try:
            from app.services.suggested_action_service import SuggestedActionService
            from app.models.suggested_action import SuggestedAction as SuggestedActionModel

            if SuggestedActionService.should_auto_suggest(
                results["question_analyses"],
                results.get("surprising_insights"),
                results["total_responses_analyzed"],
            ):
                # Check if actions already exist for this analysis (idempotent)
                existing_actions = db.query(SuggestedActionModel).filter(
                    SuggestedActionModel.analysis_id == analysis.id
                ).first()

                if not existing_actions:
                    # Check feature flag + usage limits for the creator
                    from app.services.feature_flag_service import feature_flag_service
                    from app.services.subscription_service import subscription_service
                    from app.services.usage_service import usage_service
                    from app.models.user import User as UserModel

                    creator = db.query(UserModel).filter(
                        UserModel.id == conversation.creator_id
                    ).first()

                    if creator:
                        tier = subscription_service.get_tier(
                            db, user_id=creator.id, org_id=conversation.organization_id
                        )
                        flag_enabled = feature_flag_service.is_enabled(
                            db, "ai_suggested_actions",
                            tier=tier,
                            org_id=conversation.organization_id,
                            user_id=creator.id,
                        )

                        if flag_enabled:
                            limit = feature_flag_service.get_config_value(
                                db, "ai_suggested_actions", "generations_per_month",
                                tier=tier,
                                org_id=conversation.organization_id,
                                user_id=creator.id,
                            )
                            usage_user_id = None if conversation.organization_id else creator.id
                            usage_org_id = conversation.organization_id

                            is_allowed, _ = usage_service.check_limit(
                                db, "ai_suggested_actions", limit,
                                user_id=usage_user_id,
                                org_id=usage_org_id,
                            )

                            if is_allowed:
                                service = SuggestedActionService(model=get_llm_model(db))
                                action_dicts = service.generate_actions(
                                    conversation_title=conversation.title,
                                    conversation_description=conversation.description,
                                    overall_summary=results["overall_summary"],
                                    question_analyses=results["question_analyses"],
                                    surprising_insights=results.get("surprising_insights"),
                                    context_notes=context_notes,
                                    total_responses=results["total_responses_analyzed"],
                                )

                                if action_dicts:
                                    from uuid import uuid4

                                    for d in action_dicts:
                                        action = SuggestedActionModel(
                                            id=uuid4(),
                                            analysis_id=analysis.id,
                                            conversation_id=conversation_id,
                                            title=d["title"],
                                            description=d["description"],
                                            action_type=d["action_type"],
                                            priority=d["priority"],
                                            sentiment=d["sentiment"],
                                            related_cluster_ids=d.get("related_cluster_ids", []),
                                            response_percentage=d.get("response_percentage"),
                                            source="auto_generated",
                                            status="suggested",
                                            created_at=datetime.utcnow(),
                                        )
                                        db.add(action)

                                    usage_service.increment_usage(
                                        db, "ai_suggested_actions",
                                        user_id=usage_user_id,
                                        org_id=usage_org_id,
                                    )
                                    db.commit()
                                    logger.info(
                                        f"Auto-generated {len(action_dicts)} suggested actions "
                                        f"for conversation {conversation_id}"
                                    )
        except Exception as e:
            logger.error(
                f"Auto-suggestion failed for conversation {conversation_id}: {e}",
                exc_info=True,
            )
            # Don't fail the analysis over auto-suggestion errors

        # Send notifications to participants (skip on re-analysis to avoid duplicate notifications)
        if conversation and not is_reanalysis:
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
        # Reset conversation state so the user can retry analysis
        try:
            conversation = db.query(Conversation).filter(
                Conversation.id == conversation_id
            ).first()
            if conversation and conversation.state == ConversationState.ANALYZING.value:
                conversation.state = ConversationState.CLOSED.value
                db.commit()
        except Exception:
            pass
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
    from app.services.subscription_service import subscription_service
    from app.services.usage_service import usage_service

    # Get tier based on context (org tier if org conversation, else user's personal tier)
    tier = subscription_service.get_tier(
        db,
        user_id=current_user.id,
        org_id=conversation.organization_id
    )

    if not feature_flag_service.is_enabled(
        db, "ai_analysis",
        tier=tier,
        org_id=conversation.organization_id,
        user_id=current_user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI analysis is not available for your account"
        )

    # Check usage limit
    limit = feature_flag_service.get_config_value(
        db, "ai_analysis", "analyses_per_month",
        tier=tier,
        org_id=conversation.organization_id,
        user_id=current_user.id
    )

    # Track usage at org level if org conversation, else personal
    usage_user_id = None if conversation.organization_id else current_user.id
    usage_org_id = conversation.organization_id

    is_allowed, current_usage = usage_service.check_limit(
        db, "ai_analysis", limit,
        user_id=usage_user_id,
        org_id=usage_org_id
    )

    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "LIMIT_REACHED",
                "feature": "ai_analysis",
                "limit": limit,
                "usage": current_usage,
                "message": f"Monthly analysis limit reached ({current_usage}/{limit})"
            }
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

    # Detect re-analysis (conversation already analyzed)
    is_reanalysis = conversation.state == ConversationState.ANALYZED.value

    # Set conversation state to ANALYZING
    conversation.state = ConversationState.ANALYZING.value
    db.commit()

    # Trigger background analysis
    from app.core.config import settings

    # Increment usage count before starting analysis
    usage_service.increment_usage(
        db, "ai_analysis",
        user_id=usage_user_id,
        org_id=usage_org_id
    )

    if background_tasks:
        background_tasks.add_task(
            run_analysis_task,
            conversation_id=conversation_id,
            db_url=settings.DATABASE_URL,
            min_cluster_size=2,
            is_reanalysis=is_reanalysis
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
            min_cluster_size=2,
            is_reanalysis=is_reanalysis
        )

        return SuccessResponse(
            success=True,
            message="Analysis completed"
        )


def _check_analysis_access(
    conversation_id: UUID,
    current_user: User,
    db: Session
) -> Conversation:
    """Check if user has access to analysis for this conversation. Returns conversation."""
    from app.models.response import Response
    from app.schemas.conversation import ResultsAccess

    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    is_creator = conversation.creator_id == current_user.id

    if not is_creator:
        if conversation.results_access == ResultsAccess.CREATOR_ONLY.value:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        elif conversation.results_access == ResultsAccess.PARTICIPANTS.value:
            has_responded = db.query(Response).filter(
                Response.conversation_id == conversation_id,
                Response.participant_id == current_user.id
            ).first() is not None

            if not has_responded:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found"
                )

    return conversation


def _enrich_analysis(analysis: Analysis, conversation: Conversation, db: Session) -> Analysis:
    """Add conversation metadata and participant count to analysis."""
    from sqlalchemy import func
    from app.models.response import Response

    analysis.conversation_title = conversation.title
    analysis.conversation_timezone = conversation.timezone
    analysis.show_verbatim_responses = conversation.show_verbatim_responses
    analysis.organization_id = conversation.organization_id
    analysis.conversation_activated_at = conversation.activated_at
    analysis.conversation_closed_at = conversation.closed_at

    unique_by_id = db.query(func.count(func.distinct(Response.participant_id))).filter(
        Response.conversation_id == conversation.id,
        Response.participant_id.isnot(None)
    ).scalar() or 0

    if unique_by_id == 0:
        unique_by_code = db.query(func.count(func.distinct(Response.participant_code_used))).filter(
            Response.conversation_id == conversation.id,
            Response.participant_code_used.isnot(None)
        ).scalar() or 0

        if unique_by_code > 0:
            unique_participants = unique_by_code
        else:
            unique_submissions = db.query(func.count(func.distinct(Response.submitted_at))).filter(
                Response.conversation_id == conversation.id
            ).scalar() or 0
            unique_participants = unique_submissions
    else:
        unique_participants = unique_by_id

    analysis.unique_participants = unique_participants
    return analysis


@router.get("/conversations/{conversation_id}/analysis", response_model=AnalysisSchema)
async def get_analysis(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the latest analysis results for a conversation."""
    conversation = _check_analysis_access(conversation_id, current_user, db)

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

    return _enrich_analysis(analysis, conversation, db)


@router.get("/conversations/{conversation_id}/analyses", response_model=AnalysisListResponse)
async def list_analyses(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all analyses for a conversation, ordered by most recent first."""
    _check_analysis_access(conversation_id, current_user, db)

    analyses = db.query(Analysis).filter(
        Analysis.conversation_id == conversation_id
    ).order_by(
        Analysis.created_at.desc()
    ).all()

    return AnalysisListResponse(
        conversation_id=conversation_id,
        total=len(analyses),
        analyses=analyses
    )


@router.get("/conversations/{conversation_id}/analyses/{analysis_id}", response_model=AnalysisSchema)
async def get_analysis_by_id(
    conversation_id: UUID,
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific analysis by ID."""
    conversation = _check_analysis_access(conversation_id, current_user, db)

    analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.conversation_id == conversation_id
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Analysis not found"
        )

    return _enrich_analysis(analysis, conversation, db)
