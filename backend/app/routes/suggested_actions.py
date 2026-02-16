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
    CreateActionRequest,
    EditActionRequest,
    GenerateActionsRequest,
    SuggestedActionsResponse,
    UpdateActionStatusRequest,
    SuggestedAction as SuggestedActionSchema,
)

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

# Valid status transitions
VALID_TRANSITIONS: dict[str, set[str]] = {
    "suggested": {"accepted", "dismissed", "deferred"},
    "deferred": {"accepted", "dismissed", "suggested"},  # suggested = undo defer
    "accepted": {"completed", "suggested"},              # suggested = undo accept
    "dismissed": {"suggested"},                          # undo dismiss
    "completed": {"accepted"},                           # undo complete
}


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


def _get_action_or_404(
    action_id: UUID,
    analysis_id: UUID,
    db: Session,
) -> SuggestedAction:
    """Get an action by ID or raise 404."""
    action = db.query(SuggestedAction).filter(
        SuggestedAction.id == action_id,
        SuggestedAction.analysis_id == analysis_id,
    ).first()
    if not action:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Action not found")
    return action


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

    # Delete only AI-generated actions if regenerating (preserve manual actions)
    manual_actions = []
    if existing and regenerate:
        for action in existing:
            if action.source == "manual":
                manual_actions.append(action)
            else:
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
            source="user_requested",
            status="suggested",
            created_at=datetime.utcnow(),
        )
        db.add(action)
        actions.append(action)

    db.commit()
    for action in actions:
        db.refresh(action)

    # Include preserved manual actions in response
    all_actions = manual_actions + actions

    return SuggestedActionsResponse(
        analysis_id=analysis_id,
        conversation_id=conversation_id,
        actions=all_actions,
        total=len(all_actions),
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


@router.patch(
    "/conversations/{conversation_id}/analyses/{analysis_id}/suggested-actions/{action_id}/status",
    response_model=SuggestedActionSchema,
)
async def update_action_status(
    conversation_id: UUID,
    analysis_id: UUID,
    action_id: UUID,
    body: UpdateActionStatusRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update action status (accept, dismiss, complete, undo). Creator-only."""
    conversation, analysis, is_creator = _check_analysis_access(
        conversation_id, analysis_id, current_user, db
    )
    if not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the conversation creator can update action status",
        )

    action = _get_action_or_404(action_id, analysis_id, db)

    new_status = body.status.value
    allowed = VALID_TRANSITIONS.get(action.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from '{action.status}' to '{new_status}'",
        )

    now = datetime.utcnow()

    # Apply transition
    if new_status == "accepted":
        action.accepted_at = now
        # If undoing complete, clear completed_at
        if action.status == "completed":
            action.completed_at = None
        # If coming from deferred, clear deferred_at
        elif action.status == "deferred":
            action.deferred_at = None
    elif new_status == "deferred":
        action.deferred_at = now
    elif new_status == "dismissed":
        action.dismissed_at = now
        action.dismissed_reason = body.dismissed_reason
        # If coming from deferred, clear deferred_at
        if action.status == "deferred":
            action.deferred_at = None
    elif new_status == "completed":
        action.completed_at = now
    elif new_status == "suggested":
        # Undo: clear the timestamp for the previous state
        if action.status == "accepted":
            action.accepted_at = None
        elif action.status == "dismissed":
            action.dismissed_at = None
            action.dismissed_reason = None
        elif action.status == "deferred":
            action.deferred_at = None

    action.status = new_status
    action.updated_at = now

    db.commit()
    db.refresh(action)
    return action


@router.patch(
    "/conversations/{conversation_id}/analyses/{analysis_id}/suggested-actions/{action_id}",
    response_model=SuggestedActionSchema,
)
async def edit_action(
    conversation_id: UUID,
    analysis_id: UUID,
    action_id: UUID,
    body: EditActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit an action's title/description. Creator-only. Cannot edit dismissed actions."""
    conversation, analysis, is_creator = _check_analysis_access(
        conversation_id, analysis_id, current_user, db
    )
    if not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the conversation creator can edit actions",
        )

    action = _get_action_or_404(action_id, analysis_id, db)

    if action.status == "dismissed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot edit a dismissed action",
        )

    if body.title is not None:
        action.title = body.title
    if body.description is not None:
        action.description = body.description

    action.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(action)
    return action


@router.post(
    "/conversations/{conversation_id}/analyses/{analysis_id}/suggested-actions/manual",
    response_model=SuggestedActionSchema,
    status_code=status.HTTP_201_CREATED,
)
async def create_manual_action(
    conversation_id: UUID,
    analysis_id: UUID,
    body: CreateActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a manual action. Creator-only."""
    conversation, analysis, is_creator = _check_analysis_access(
        conversation_id, analysis_id, current_user, db
    )
    if not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the conversation creator can create actions",
        )

    action = SuggestedAction(
        id=uuid4(),
        analysis_id=analysis_id,
        conversation_id=conversation_id,
        title=body.title,
        description=body.description,
        action_type=body.action_type.value,
        priority=body.priority.value,
        sentiment="neutral",
        source="manual",
        status="suggested",
        created_by_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(action)
    db.commit()
    db.refresh(action)
    return action
