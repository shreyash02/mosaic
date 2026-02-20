"""Response submission routes."""

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

logger = logging.getLogger(__name__)
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_optional_current_user
from app.core.access_control import ConversationAccess, require_draft_access
from app.models.user import User
from app.models.conversation import Conversation
from app.models.question import Question
from app.models.response import Response
from app.models.participant_code import ParticipantCode
from app.models.conversation_invitation import ConversationInvitation
from app.schemas.response import (
    ResponseSubmit,
    Response as ResponseSchema,
    ResponseWithQuestion,
    ResponseList,
    ResponseStats,
    ResponseCheck,
    DraftSaveRequest,
    DraftSaveResponse,
    DraftLoadResponse,
    ResponseItemCreate,
)
from app.schemas.participant_code import CodeValidation
from app.schemas.common import SuccessResponse
from app.schemas.conversation import ConversationState, AnonymityLevel
from app.services.notification_service import notification_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/conversations/{access_code}/validate")
@limiter.limit("30/minute")
async def validate_code(
    request: Request,
    access_code: str,
    db: Session = Depends(get_db)
) -> CodeValidation:
    """
    Validate an access code for a conversation (first step).
    
    For fully_anonymous conversations, this will indicate that a participant_code
    is required. For other conversation types, this validates access.

    Args:
        access_code: Access code to validate
        db: Database session

    Returns:
        Validation result with conversation info
    """
    # Find conversation by access code (check if it exists first, regardless of state)
    conversation = db.query(Conversation).filter(
        Conversation.access_code == access_code
    ).first()

    if not conversation:
        return CodeValidation(
            valid=False,
            message="Invalid access code. Please check the code and try again."
        )

    # Check if this is a template (templates cannot receive responses)
    if conversation.series_id is None and conversation.recurrence_pattern is not None:
        return CodeValidation(
            valid=False,
            message="This is a recurring template. Templates cannot receive responses directly. Please use a conversation instance created from this template."
        )

    # Check if conversation is active
    if conversation.state != ConversationState.ACTIVE.value:
        if conversation.state == ConversationState.CLOSED.value:
            return CodeValidation(
                valid=False,
                message="This conversation has been closed and is no longer accepting responses."
            )
        elif conversation.state == ConversationState.DRAFT.value:
            return CodeValidation(
                valid=False,
                message="This conversation has not been activated yet."
            )
        else:
            return CodeValidation(
                valid=False,
                message="This conversation is not currently available."
            )

    # Conversation exists and is active
    # Determine requirements based on anonymity level and invite_only:
    # - OPEN (not invite_only): No login, no codes required
    # - OPEN (invite_only): Requires login to verify invitation
    # - FULLY_ANONYMOUS: Requires secret codes (for duplicate prevention)
    # - PLATFORM_TRACKED/REVEALABLE: Requires login
    is_open = conversation.anonymity_level == AnonymityLevel.OPEN.value
    is_fully_anonymous = conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value

    requires_participant_code = is_fully_anonymous  # Secret codes required for fully anonymous
    # Login required for: tracked modes, OR invite-only (except fully_anonymous which uses codes)
    requires_login = (not is_open and not is_fully_anonymous) or (conversation.invite_only and not is_fully_anonymous)

    return CodeValidation(
        valid=True,
        conversation_id=conversation.id,
        message="Valid conversation access code",
        requires_participant_code=requires_participant_code,
        requires_login=requires_login
    )


@router.post("/conversations/{access_code}/validate-participant")
async def validate_participant_code(
    access_code: str,
    participant_code: str = Query(..., description="Participant code to validate"),
    db: Session = Depends(get_db)
) -> CodeValidation:
    """
    Validate a participant code for a fully_anonymous conversation (second step).

    This validates the participant code and returns a session token that can be used
    to access conversation details without authentication.

    Now supports reusable codes: allows both used and unused codes for viewing results.

    Args:
        access_code: Conversation access code (already validated)
        participant_code: Participant code to validate
        db: Database session

    Returns:
        Validation result with session token and submission status
    """
    from app.core.security import create_participant_session_token

    # First verify the access_code is valid (conversation can be in any state now)
    conversation = db.query(Conversation).filter(
        Conversation.access_code == access_code
    ).first()

    if not conversation:
        return CodeValidation(
            valid=False,
            message="Invalid access code"
        )

    # Check if conversation is fully_anonymous
    if conversation.anonymity_level != AnonymityLevel.FULLY_ANONYMOUS.value:
        return CodeValidation(
            valid=False,
            message="Participant codes are only required for fully anonymous conversations"
        )

    # Validate participant code belongs to this conversation (accept both used and unused)
    participant_code_obj = db.query(ParticipantCode).filter(
        ParticipantCode.participant_code == participant_code,
        ParticipantCode.conversation_id == conversation.id
    ).first()

    if not participant_code_obj:
        return CodeValidation(
            valid=False,
            message="Invalid participant code"
        )

    # Check if this participant code has already been used to submit
    has_submitted = participant_code_obj.is_used

    # Create session token
    session_token = create_participant_session_token(
        access_code=access_code,
        participant_code=participant_code,
        conversation_id=conversation.id
    )

    return CodeValidation(
        valid=True,
        conversation_id=conversation.id,
        message="Valid participant code",
        requires_participant_code=False,
        session_token=session_token,
        has_submitted=has_submitted,
        conversation_state=conversation.state
    )


@router.get("/conversations/{access_code}/responses/check", response_model=ResponseCheck)
async def check_user_response(
    access_code: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Check if the current authenticated user has already submitted a response.
    
    This endpoint is only for platform_tracked and revealable conversations.
    For fully_anonymous conversations, this check is not applicable.
    
    Args:
        access_code: Conversation access code
        db: Database session
        current_user: Optional authenticated user
        
    Returns:
        ResponseCheck indicating if user has already submitted
    """
    # Find conversation by access code
    conversation = db.query(Conversation).filter(
        Conversation.access_code == access_code
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Only check for platform_tracked, revealable, or invite-only OPEN conversations
    is_trackable = conversation.anonymity_level in [AnonymityLevel.PLATFORM_TRACKED.value, AnonymityLevel.REVEALABLE.value]
    is_invite_only_open = conversation.anonymity_level == AnonymityLevel.OPEN.value and conversation.invite_only

    if not is_trackable and not is_invite_only_open:
        return ResponseCheck(
            has_submitted=False,
            message="Response check is only available for authenticated conversations"
        )
    
    # Must be authenticated for this check
    if not current_user:
        return ResponseCheck(
            has_submitted=False,
            message="Authentication required"
        )
    
    # Check if user already submitted (not drafts)
    existing_responses = db.query(Response).filter(
        Response.conversation_id == conversation.id,
        Response.participant_id == current_user.id,
        Response.status == "submitted"
    ).all()

    if existing_responses:
        # Check if editing is allowed
        can_edit = (
            conversation.allow_response_editing and
            conversation.state == ConversationState.ACTIVE.value
        )

        if can_edit:
            # Return existing responses so they can be edited
            existing_response_items = [
                ResponseItemCreate(
                    question_id=r.question_id,
                    response_text=r.response_text,
                    response_data=r.response_data
                )
                for r in existing_responses
            ]
            return ResponseCheck(
                has_submitted=True,
                can_edit=True,
                message="You can edit your response while the conversation is active.",
                existing_responses=existing_response_items
            )

        return ResponseCheck(
            has_submitted=True,
            can_edit=False,
            message="Your responses have been recorded. You can only submit once"
        )

    return ResponseCheck(
        has_submitted=False,
        can_edit=False,
        message=None
    )


@router.post("/conversations/{access_code}/responses/draft", response_model=DraftSaveResponse)
@limiter.limit("60/minute")
async def save_draft(
    request: Request,
    draft_data: DraftSaveRequest,
    access: ConversationAccess = Depends(require_draft_access),
    db: Session = Depends(get_db),
):
    """
    Save draft responses for a conversation.

    Access control handled by ConversationAccess dependency.
    - For fully_anonymous: requires participant_code in request body
    - For other modes: requires authentication + invitation (if invite_only)

    Returns:
        DraftSaveResponse with save timestamp
    """
    conversation = access.conversation
    current_user = access.user

    # Determine participant identifier based on anonymity level
    used_participant_code = None
    participant_id = None

    if conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
        # Require participant code from request body
        if not draft_data.participant_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fully anonymous conversations require a participant code"
            )

        # Validate participant code
        participant_code_obj = db.query(ParticipantCode).filter(
            ParticipantCode.participant_code == draft_data.participant_code,
            ParticipantCode.conversation_id == conversation.id
        ).first()

        if not participant_code_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid participant code"
            )

        # Check if already submitted
        existing_submitted = db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_code_used == draft_data.participant_code,
            Response.status == "submitted"
        ).first()

        if existing_submitted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot save draft - response already submitted"
            )

        used_participant_code = draft_data.participant_code

    else:
        # Non-anonymous: auth and invite-only already checked by dependency
        # Check if already submitted
        existing_submitted = db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_id == current_user.id,
            Response.status == "submitted"
        ).first()

        if existing_submitted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot save draft - response already submitted"
            )

        participant_id = current_user.id

    # Validate question IDs (but allow partial responses)
    conversation_question_ids = {q.id for q in conversation.questions}
    for response_item in draft_data.responses:
        if response_item.question_id not in conversation_question_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid question ID: {response_item.question_id}"
            )

    # Delete existing draft responses for this participant
    if used_participant_code:
        db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_code_used == used_participant_code,
            Response.status == "draft"
        ).delete()
    else:
        db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_id == participant_id,
            Response.status == "draft"
        ).delete()

    # Create new draft responses
    now = datetime.utcnow()
    for response_item in draft_data.responses:
        response = Response(
            conversation_id=conversation.id,
            question_id=response_item.question_id,
            response_text=response_item.response_text,
            response_data=response_item.response_data,
            anonymity_level=conversation.anonymity_level,
            participant_id=participant_id,
            participant_code_used=used_participant_code,
            reveal_consent=draft_data.reveal_consent if conversation.anonymity_level == AnonymityLevel.REVEALABLE.value else False,
            status="draft",
            last_saved_at=now,
            submitted_at=None
        )
        db.add(response)

    db.commit()

    return DraftSaveResponse(
        success=True,
        last_saved_at=now,
        message="Draft saved successfully"
    )


@router.get("/conversations/{access_code}/responses/draft", response_model=DraftLoadResponse)
async def load_draft(
    participant_code: Optional[str] = Query(None, description="Participant code for fully anonymous conversations"),
    access: ConversationAccess = Depends(require_draft_access),
    db: Session = Depends(get_db),
):
    """
    Load existing draft responses for a conversation.

    Access control handled by ConversationAccess dependency.
    Returns draft data if exists, or empty response if no draft found.
    """
    conversation = access.conversation
    current_user = access.user

    # Build query based on anonymity level
    if conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
        if not participant_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Participant code required for fully anonymous conversations"
            )

        drafts = db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_code_used == participant_code,
            Response.status == "draft"
        ).all()
    else:
        # Auth and invite-only already checked by dependency
        drafts = db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_id == current_user.id,
            Response.status == "draft"
        ).all()

    if not drafts:
        return DraftLoadResponse(
            has_draft=False,
            last_saved_at=None,
            responses=[],
            reveal_consent=False
        )

    # Build response items from drafts
    responses = [
        ResponseItemCreate(
            question_id=draft.question_id,
            response_text=draft.response_text,
            response_data=draft.response_data
        )
        for draft in drafts
    ]

    # Get the most recent save time and reveal_consent from any draft
    last_saved_at = max(d.last_saved_at for d in drafts if d.last_saved_at)
    reveal_consent = any(d.reveal_consent for d in drafts)

    return DraftLoadResponse(
        has_draft=True,
        last_saved_at=last_saved_at,
        responses=responses,
        reveal_consent=reveal_consent
    )


@router.delete("/conversations/{access_code}/responses/draft", response_model=SuccessResponse)
async def delete_draft(
    participant_code: Optional[str] = Query(None, description="Participant code for fully anonymous conversations"),
    access: ConversationAccess = Depends(require_draft_access),
    db: Session = Depends(get_db),
):
    """
    Delete draft responses (called after successful submission or explicit discard).

    Access control handled by ConversationAccess dependency.
    """
    conversation = access.conversation
    current_user = access.user

    # Delete drafts based on anonymity level
    if conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
        if not participant_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Participant code required for fully anonymous conversations"
            )

        deleted = db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_code_used == participant_code,
            Response.status == "draft"
        ).delete()
    else:
        # Auth and invite-only already checked by dependency
        deleted = db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_id == current_user.id,
            Response.status == "draft"
        ).delete()

    db.commit()

    return SuccessResponse(
        success=True,
        message=f"Deleted {deleted} draft response(s)"
    )


@router.post("/conversations/{access_code}/responses", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
async def submit_response(
    request: Request,
    access_code: str,
    response_data: ResponseSubmit,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Submit a response to a conversation.

    Supports three anonymity modes:
    - fully_anonymous: Requires unique participant code, no user tracking
    - platform_tracked: Platform knows user but doesn't reveal to facilitator
    - revealable: User can consent to reveal identity

    Args:
        access_code: Conversation access code (for platform_tracked/revealable) or participant code (for fully_anonymous)
        response_data: Response submission data (may include participant_code for fully_anonymous)
        db: Database session
        current_user: Optional authenticated user

    Returns:
        Success confirmation

    Raises:
        HTTPException: If conversation not found, not active, or validation fails
    """
    # Find conversation by access code
    conversation = db.query(Conversation).options(
        joinedload(Conversation.questions)
    ).filter(
        Conversation.access_code == access_code
    ).first()

    # If not found by access code, try participant code (for fully_anonymous)
    used_participant_code = None
    if not conversation:
        participant_code = db.query(ParticipantCode).filter(
            ParticipantCode.participant_code == access_code
        ).first()

        if participant_code:
            conversation = db.query(Conversation).options(
                joinedload(Conversation.questions)
            ).filter(
                Conversation.id == participant_code.conversation_id
            ).first()
            used_participant_code = participant_code

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Check if this is a template (templates cannot receive responses)
    if conversation.series_id is None and conversation.recurrence_pattern is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot submit responses to templates. Templates are used to create recurring conversation instances. Please use a conversation instance instead."
        )

    # Check if conversation is active
    if conversation.state != ConversationState.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation is not active"
        )

    # Validate anonymity level handling
    if conversation.anonymity_level == AnonymityLevel.OPEN.value:
        # OPEN: Anyone can respond, no login or codes required
        # EXCEPTION: invite_only requires login to verify the user was invited
        if conversation.invite_only:
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required for invite-only conversations"
                )
            # Check for duplicate submissions
            existing_response = db.query(Response).filter(
                Response.conversation_id == conversation.id,
                Response.participant_id == current_user.id,
                Response.status == "submitted"
            ).first()
            if existing_response:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You have already submitted a response to this conversation"
                )
            # Verify user was invited (by email or user_id)
            invitation = db.query(ConversationInvitation).filter(
                ConversationInvitation.conversation_id == conversation.id,
                or_(
                    ConversationInvitation.invited_user_id == current_user.id,
                    ConversationInvitation.email == current_user.email.lower()
                )
            ).first()
            if not invitation:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You were not invited to this conversation"
                )

    elif conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
        # FULLY_ANONYMOUS: Requires secret codes for duplicate prevention
        if not used_participant_code:
            # Check if participant_code is provided in request body
            if not response_data.participant_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This conversation requires a participant code"
                )

            # Look up participant code from request body
            participant_code = db.query(ParticipantCode).filter(
                ParticipantCode.participant_code == response_data.participant_code,
                ParticipantCode.conversation_id == conversation.id
            ).first()

            if not participant_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid participant code"
                )

            used_participant_code = participant_code

        # Check if code is already used
        if used_participant_code.is_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This participant code has already been used"
            )

    elif conversation.anonymity_level in [AnonymityLevel.PLATFORM_TRACKED.value, AnonymityLevel.REVEALABLE.value]:
        # Must be authenticated
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required for this conversation type"
            )

        # If invite_only is enabled, check if user was invited
        if conversation.invite_only:
            invitation = db.query(ConversationInvitation).filter(
                ConversationInvitation.conversation_id == conversation.id,
                ConversationInvitation.invited_user_id == current_user.id
            ).first()
            
            # Also check by email in case user doesn't have an account yet
            if not invitation:
                invitation = db.query(ConversationInvitation).filter(
                    ConversationInvitation.conversation_id == conversation.id,
                    ConversationInvitation.email == current_user.email.lower()
                ).first()
            
            if not invitation:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You must be invited to submit a response to this conversation"
                )

        # Check if user already responded
        existing_response = db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_id == current_user.id
        ).first()

        if existing_response:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already submitted a response to this conversation"
            )

    # Validate all question IDs belong to this conversation
    conversation_question_ids = {q.id for q in conversation.questions}
    submitted_question_ids = {r.question_id for r in response_data.responses}

    if not submitted_question_ids.issubset(conversation_question_ids):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid question IDs"
        )

    # Validate response text length
    for response_item in response_data.responses:
        if response_item.response_text and len(response_item.response_text) > conversation.max_response_length:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Response text exceeds maximum length of {conversation.max_response_length} characters"
            )

    # Validate question-specific response data
    question_map = {q.id: q for q in conversation.questions}
    for response_item in response_data.responses:
        question = question_map.get(response_item.question_id)
        if not question:
            continue

        # Validate rating questions
        if question.question_type == 'rating':
            if not response_item.response_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Rating questions require response_data"
                )
            rating = response_item.response_data.get('rating')
            if rating is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Rating value is required"
                )
            # Get min/max from options or use defaults
            options = question.options or {}
            min_val = options.get('min', 1)
            max_val = options.get('max', 10)
            if not isinstance(rating, (int, float)) or rating < min_val or rating > max_val:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Rating must be between {min_val} and {max_val}"
                )

        # Validate poll questions (single_choice/multiple_choice)
        elif question.question_type in ['single_choice', 'multiple_choice']:
            if not response_item.response_data:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Poll questions require response_data"
                )
            selected = response_item.response_data.get('selected')
            if not selected:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="At least one option must be selected"
                )

            # Get valid choice IDs from question options
            options = question.options or {}
            choices = options.get('choices', [])
            valid_ids = {choice['id'] for choice in choices}

            # Validate single choice
            if question.question_type == 'single_choice':
                if not isinstance(selected, str):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Single choice must be a string ID"
                    )
                if selected not in valid_ids:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Invalid option selected"
                    )

            # Validate multiple choice
            elif question.question_type == 'multiple_choice':
                if not isinstance(selected, list):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Multiple choice must be an array of IDs"
                    )
                if not selected:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="At least one option must be selected"
                    )
                # Check all selected IDs are valid
                for choice_id in selected:
                    if choice_id not in valid_ids:
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Invalid option selected: {choice_id}"
                        )
                # Validate max_selections
                max_selections = options.get('max_selections', len(choices))
                if len(selected) > max_selections:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Maximum {max_selections} selections allowed"
                    )

    # Validate required questions
    for question in conversation.questions:
        if question.is_required:
            response_item = next((r for r in response_data.responses if r.question_id == question.id), None)
            
            if not response_item:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Required question '{question.question_text}' must be answered"
                )
            
            # Check if response is actually provided based on question type
            if question.question_type == 'text':
                if not response_item.response_text or not response_item.response_text.strip():
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Required question '{question.question_text}' must be answered"
                    )
            elif question.question_type == 'rating':
                if response_item.response_data is None or response_item.response_data.get('rating') is None:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Required question '{question.question_text}' must be answered"
                    )
            elif question.question_type in ['single_choice', 'multiple_choice']:
                selected = response_item.response_data.get('selected') if response_item.response_data else None
                if not selected or (isinstance(selected, list) and len(selected) == 0):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Required question '{question.question_text}' must be answered"
                    )

    # Delete any existing draft responses for this participant before creating submitted ones
    if used_participant_code:
        db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_code_used == used_participant_code.participant_code,
            Response.status == "draft"
        ).delete()
    elif current_user:
        db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_id == current_user.id,
            Response.status == "draft"
        ).delete()

    # Create responses with status='submitted'
    now = datetime.utcnow()
    for response_item in response_data.responses:
        response = Response(
            conversation_id=conversation.id,
            question_id=response_item.question_id,
            response_text=response_item.response_text,
            response_data=response_item.response_data,
            anonymity_level=conversation.anonymity_level,
            participant_id=current_user.id if current_user else None,
            participant_code_used=used_participant_code.participant_code if used_participant_code else None,
            reveal_consent=response_data.reveal_consent if conversation.anonymity_level == AnonymityLevel.REVEALABLE.value else False,
            status="submitted",
            submitted_at=now
        )
        db.add(response)

    # Mark participant code as used
    if used_participant_code:
        used_participant_code.is_used = True
        used_participant_code.used_at = datetime.utcnow()

    # Mark invitation as accepted when response is submitted
    # This applies to: platform_tracked, revealable, and invite_only OPEN conversations
    should_mark_invitation = current_user and (
        conversation.anonymity_level in [AnonymityLevel.PLATFORM_TRACKED.value, AnonymityLevel.REVEALABLE.value]
        or (conversation.anonymity_level == AnonymityLevel.OPEN.value and conversation.invite_only)
    )
    if should_mark_invitation:
        # Find invitation for this user
        invitation = db.query(ConversationInvitation).filter(
            ConversationInvitation.conversation_id == conversation.id,
            or_(
                ConversationInvitation.invited_user_id == current_user.id,
                ConversationInvitation.email == current_user.email.lower()
            )
        ).first()

        if invitation and not invitation.is_accepted:
            invitation.is_accepted = True
            invitation.accepted_at = datetime.utcnow()

    db.commit()

    # Send Slack confirmation if user is authenticated
    if current_user:
        try:
            await notification_service.notify_response_submitted(
                user_id=current_user.id,
                conversation=conversation,
                db=db,
            )
        except Exception as e:
            logger.error(f"Failed to send Slack response confirmation: {e}", exc_info=True)

    return SuccessResponse(
        success=True,
        message="Response submitted successfully"
    )


@router.put("/conversations/{access_code}/responses", response_model=SuccessResponse)
@limiter.limit("20/minute")
async def update_response(
    request: Request,
    access_code: str,
    response_data: ResponseSubmit,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Update an existing response to a conversation.

    Requirements:
    - Conversation must be active
    - Conversation must have allow_response_editing enabled
    - User must have previously submitted a response
    - For fully_anonymous: must provide same participant_code
    - For platform_tracked/revealable: must be authenticated

    Args:
        access_code: Conversation access code
        response_data: Updated response data
        db: Database session
        current_user: Optional authenticated user

    Returns:
        Success confirmation

    Raises:
        HTTPException: If conversation not found, not active, editing not allowed, or validation fails
    """
    # Find conversation by access code
    conversation = db.query(Conversation).options(
        joinedload(Conversation.questions)
    ).filter(
        Conversation.access_code == access_code
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Check if conversation is active
    if conversation.state != ConversationState.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation is not active"
        )

    # Check if editing is allowed
    if not conversation.allow_response_editing:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Response editing is not enabled for this conversation"
        )

    # Find existing responses based on anonymity level
    existing_responses = []
    used_participant_code = None

    if conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
        # Require participant code
        if not response_data.participant_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Participant code required for editing"
            )

        # Validate participant code
        participant_code_obj = db.query(ParticipantCode).filter(
            ParticipantCode.participant_code == response_data.participant_code,
            ParticipantCode.conversation_id == conversation.id
        ).first()

        if not participant_code_obj:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid participant code"
            )

        used_participant_code = response_data.participant_code

        # Find existing submitted responses
        existing_responses = db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_code_used == used_participant_code,
            Response.status == "submitted"
        ).all()

    elif conversation.anonymity_level in [AnonymityLevel.PLATFORM_TRACKED.value, AnonymityLevel.REVEALABLE.value]:
        # Must be authenticated
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )

        # Find existing submitted responses
        existing_responses = db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_id == current_user.id,
            Response.status == "submitted"
        ).all()

    else:
        # OPEN mode - editing not supported (can't identify participant)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Response editing is not supported for open conversations"
        )

    if not existing_responses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No existing response found to edit"
        )

    # Validate question IDs
    conversation_question_ids = {q.id for q in conversation.questions}
    for response_item in response_data.responses:
        if response_item.question_id not in conversation_question_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid question ID: {response_item.question_id}"
            )

    # Validate response text length
    for response_item in response_data.responses:
        if response_item.response_text and len(response_item.response_text) > conversation.max_response_length:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Response text exceeds maximum length of {conversation.max_response_length} characters"
            )

    # Create a map of existing responses by question_id
    existing_by_question = {r.question_id: r for r in existing_responses}

    # Update responses
    now = datetime.utcnow()
    for response_item in response_data.responses:
        existing = existing_by_question.get(response_item.question_id)
        if existing:
            # Update existing response
            existing.response_text = response_item.response_text
            existing.response_data = response_item.response_data
            existing.edited_at = now
            existing.is_edited = True
        else:
            # Create new response for this question (in case a question was added)
            new_response = Response(
                conversation_id=conversation.id,
                question_id=response_item.question_id,
                response_text=response_item.response_text,
                response_data=response_item.response_data,
                anonymity_level=conversation.anonymity_level,
                participant_id=current_user.id if current_user else None,
                participant_code_used=used_participant_code,
                reveal_consent=response_data.reveal_consent if conversation.anonymity_level == AnonymityLevel.REVEALABLE.value else False,
                status="submitted",
                submitted_at=now,
                edited_at=now,
                is_edited=True
            )
            db.add(new_response)

    # Update reveal_consent if applicable
    if conversation.anonymity_level == AnonymityLevel.REVEALABLE.value:
        for existing in existing_responses:
            existing.reveal_consent = response_data.reveal_consent

    db.commit()

    return SuccessResponse(
        success=True,
        message="Response updated successfully"
    )


@router.get("/conversations/{conversation_id}/responses", response_model=ResponseList)
async def get_responses(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all responses for a conversation.

    Access control based on results_access and show_verbatim_responses settings:
    - Creator always has access
    - If show_verbatim_responses is disabled, only creator can view
    - If enabled, access follows results_access rules (CREATOR_ONLY, PARTICIPANTS, PUBLIC_LINK)

    Args:
        conversation_id: Conversation ID
        current_user: Current authenticated user
        db: Session = Depends(get_db)

    Returns:
        List of responses with question text

    Raises:
        HTTPException: If conversation not found or user doesn't have access
    """
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

    # Verbatim responses must be enabled for non-creators to view
    if not is_creator and not conversation.show_verbatim_responses:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    if not is_creator:
        # Not the creator - check results_access setting
        if conversation.results_access == ResultsAccess.CREATOR_ONLY.value:
            # Only creator can view
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )
        elif conversation.results_access == ResultsAccess.PARTICIPANTS.value:
            # Check if user has submitted a response (only count submitted, not drafts)
            has_responded = db.query(Response).filter(
                Response.conversation_id == conversation_id,
                Response.participant_id == current_user.id,
                Response.status == "submitted"
            ).first() is not None

            if not has_responded:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found"
                )
        # PUBLIC_LINK allows anyone authenticated to view (no additional check needed)

    # Get all submitted responses with question text (exclude drafts)
    responses = db.query(
        Response,
        Question.question_text
    ).join(
        Question, Response.question_id == Question.id
    ).filter(
        Response.conversation_id == conversation_id,
        Response.status == "submitted"
    ).order_by(
        Response.submitted_at.desc()
    ).all()

    # Build response list
    response_list = []
    for response, question_text in responses:
        response_dict = {
            "id": response.id,
            "conversation_id": response.conversation_id,
            "question_id": response.question_id,
            "response_text": response.response_text,
            "response_data": response.response_data,
            "anonymity_level": response.anonymity_level,
            "reveal_consent": response.reveal_consent,
            "status": response.status,
            "last_saved_at": response.last_saved_at,
            "submitted_at": response.submitted_at,
            "edited_at": response.edited_at,
            "is_edited": response.is_edited,
            "participant_id": response.participant_id if response.reveal_consent else None,
            "participant_code_used": response.participant_code_used if conversation.anonymity_level == AnonymityLevel.OPEN.value else None,
            "question_text": question_text
        }
        response_list.append(ResponseWithQuestion(**response_dict))

    return ResponseList(
        conversation_id=conversation_id,
        total_count=len(response_list),
        responses=response_list
    )


@router.get("/conversations/{conversation_id}/responses/stats", response_model=ResponseStats)
async def get_response_stats(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get response statistics for a conversation (owner only).

    Args:
        conversation_id: Conversation ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Response statistics

    Raises:
        HTTPException: If conversation not found or user is not the owner
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

    # Debug: count all responses for this conversation
    all_responses = db.query(Response).filter(
        Response.conversation_id == conversation_id
    ).all()
    logger.info(f"[STATS DEBUG] Conversation {conversation_id}: found {len(all_responses)} total responses in DB")
    for r in all_responses[:5]:  # Log first 5
        logger.info(f"[STATS DEBUG]   Response: id={r.id}, status={r.status}, participant_code={r.participant_code_used}")

    # Get total responses (only count submitted, not drafts)
    total_responses = db.query(func.count(Response.id)).filter(
        Response.conversation_id == conversation_id,
        Response.status == "submitted"
    ).scalar()
    logger.info(f"[STATS DEBUG] Total submitted responses: {total_responses}")

    # Get unique participants (only count submitted responses)
    # For fully_anonymous, count unique participant codes used
    # For others, count unique participant_ids
    logger.info(f"[STATS DEBUG] Conversation anonymity_level: {conversation.anonymity_level}")
    if conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
        unique_participants = db.query(
            func.count(func.distinct(Response.participant_code_used))
        ).filter(
            Response.conversation_id == conversation_id,
            Response.status == "submitted"
        ).scalar()
    else:
        unique_participants = db.query(
            func.count(func.distinct(Response.participant_id))
        ).filter(
            Response.conversation_id == conversation_id,
            Response.status == "submitted"
        ).scalar()
    logger.info(f"[STATS DEBUG] Unique participants: {unique_participants}")

    # Get responses by question (only count submitted)
    responses_by_question_raw = db.query(
        Response.question_id,
        func.count(Response.id).label('count')
    ).filter(
        Response.conversation_id == conversation_id,
        Response.status == "submitted"
    ).group_by(
        Response.question_id
    ).all()

    responses_by_question = {
        str(question_id): count
        for question_id, count in responses_by_question_raw
    }
    logger.info(f"[STATS DEBUG] Responses by question: {responses_by_question}")

    return ResponseStats(
        total_responses=total_responses or 0,
        unique_participants=unique_participants or 0,
        responses_by_question=responses_by_question
    )
