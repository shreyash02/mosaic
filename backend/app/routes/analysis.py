"""Analysis routes."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

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

router = APIRouter()


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

    except Exception as e:
        db.rollback()
        # Log error (in production, use proper logging)
        print(f"Analysis failed for conversation {conversation_id}: {str(e)}")
        raise
    finally:
        db.close()


@router.post("/conversations/{conversation_id}/analyze", response_model=SuccessResponse)
async def trigger_analysis(
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

    # Check if conversation is closed
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

    Args:
        conversation_id: Conversation ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Analysis results

    Raises:
        HTTPException: If conversation not found, user is not owner, or no analysis exists
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

    return analysis
