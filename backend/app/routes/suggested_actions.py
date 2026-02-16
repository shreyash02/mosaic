"""Suggested actions routes."""

import logging
from datetime import datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.analysis import Analysis
from app.models.conversation import Conversation
from app.models.suggested_action import SuggestedAction
from app.models.user import User
from app.schemas.suggested_action import (
    GenerateActionsRequest,
    SuggestedActionsResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


def _check_analysis_access(
    conversation_id: UUID,
    analysis_id: UUID,
    current_user: User,
    db: Session,
) -> tuple[Conversation, Analysis, bool]:
    """Verify user access and return (conversation, analysis, is_creator)."""
    from app.models.response import Response
    from app.schemas.conversation import ResultsAccess

    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")

    is_creator = conversation.creator_id == current_user.id

    if not is_creator:
        if conversation.results_access == ResultsAccess.CREATOR_ONLY.value:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
        elif conversation.results_access == ResultsAccess.PARTICIPANTS.value:
            has_responded = db.query(Response).filter(
                Response.conversation_id == conversation_id,
                Response.participant_id == current_user.id,
            ).first() is not None
            if not has_responded:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    analysis = db.query(Analysis).filter(
        Analysis.id == analysis_id,
        Analysis.conversation_id == conversation_id,
    ).first()
    if not analysis:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Analysis not found")

    return conversation, analysis, is_creator


@router.post(
    "/conversations/{conversation_id}/analyses/{analysis_id}/suggested-actions",
    response_model=SuggestedActionsResponse,
)
@limiter.limit("5/minute")
async def generate_suggested_actions(
    request: Request,
    conversation_id: UUID,
    analysis_id: UUID,
    body: GenerateActionsRequest = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate AI-suggested actions for an analysis. Creator-only."""
    conversation, analysis, is_creator = _check_analysis_access(
        conversation_id, analysis_id, current_user, db
    )

    if not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the conversation creator can generate suggested actions",
        )

    # Feature flag + usage limit check
    from app.services.feature_flag_service import feature_flag_service
    from app.services.subscription_service import subscription_service
    from app.services.usage_service import usage_service

    tier = subscription_service.get_tier(
        db, user_id=current_user.id, org_id=conversation.organization_id
    )
    if not feature_flag_service.is_enabled(
        db, "ai_suggested_actions",
        tier=tier,
        org_id=conversation.organization_id,
        user_id=current_user.id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="AI suggested actions is not available for your account",
        )

    # Check monthly usage limit
    limit = feature_flag_service.get_config_value(
        db, "ai_suggested_actions", "generations_per_month",
        tier=tier,
        org_id=conversation.organization_id,
        user_id=current_user.id,
    )
    usage_user_id = None if conversation.organization_id else current_user.id
    usage_org_id = conversation.organization_id

    is_allowed, current_usage = usage_service.check_limit(
        db, "ai_suggested_actions", limit,
        user_id=usage_user_id,
        org_id=usage_org_id,
    )
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "LIMIT_REACHED",
                "feature": "ai_suggested_actions",
                "limit": limit,
                "usage": current_usage,
                "message": f"Monthly suggested actions limit reached ({current_usage}/{limit})",
            },
        )

    # Check for existing actions
    existing = db.query(SuggestedAction).filter(
        SuggestedAction.analysis_id == analysis_id
    ).all()

    regenerate = body.regenerate if body else False

    if existing and not regenerate:
        return SuggestedActionsResponse(
            analysis_id=analysis_id,
            conversation_id=conversation_id,
            actions=existing,
            total=len(existing),
        )

    # Delete existing if regenerating
    if existing and regenerate:
        for action in existing:
            db.delete(action)
        db.flush()

    # Generate via LLM
    from app.services.suggested_action_service import SuggestedActionService

    service = SuggestedActionService()
    action_dicts = service.generate_actions(
        conversation_title=conversation.title,
        conversation_description=conversation.description,
        overall_summary=analysis.overall_summary or "",
        question_analyses=analysis.question_analyses or [],
        surprising_insights=analysis.surprising_insights or [],
        context_notes=analysis.context_notes_snapshot,
        total_responses=analysis.total_responses_analyzed or 0,
    )

    if not action_dicts:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate suggested actions. Please try again.",
        )

    # Count this generation against usage
    usage_service.increment_usage(
        db, "ai_suggested_actions",
        user_id=usage_user_id,
        org_id=usage_org_id,
    )

    # Persist
    actions = []
    for d in action_dicts:
        action = SuggestedAction(
            id=uuid4(),
            analysis_id=analysis_id,
            conversation_id=conversation_id,
            title=d["title"],
            description=d["description"],
            action_type=d["action_type"],
            priority=d["priority"],
            sentiment=d["sentiment"],
            related_cluster_ids=d.get("related_cluster_ids", []),
            response_percentage=d.get("response_percentage"),
            status="suggested",
            created_at=datetime.utcnow(),
        )
        db.add(action)
        actions.append(action)

    db.commit()
    for action in actions:
        db.refresh(action)

    return SuggestedActionsResponse(
        analysis_id=analysis_id,
        conversation_id=conversation_id,
        actions=actions,
        total=len(actions),
    )


@router.get(
    "/conversations/{conversation_id}/analyses/{analysis_id}/suggested-actions",
    response_model=SuggestedActionsResponse,
)
async def get_suggested_actions(
    conversation_id: UUID,
    analysis_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get suggested actions for an analysis. Follows results_access rules."""
    conversation, analysis, is_creator = _check_analysis_access(
        conversation_id, analysis_id, current_user, db
    )

    actions = db.query(SuggestedAction).filter(
        SuggestedAction.analysis_id == analysis_id
    ).order_by(SuggestedAction.created_at).all()

    return SuggestedActionsResponse(
        analysis_id=analysis_id,
        conversation_id=conversation_id,
        actions=actions,
        total=len(actions),
    )
