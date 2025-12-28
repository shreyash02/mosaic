"""Response submission routes."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_optional_current_user
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
)
from app.schemas.participant_code import CodeValidation
from app.schemas.common import SuccessResponse
from app.schemas.conversation import ConversationState, AnonymityLevel

router = APIRouter()


@router.post("/conversations/{access_code}/validate")
async def validate_code(
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
    requires_participant_code = conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value
    return CodeValidation(
        valid=True,
        conversation_id=conversation.id,
        message="Valid conversation access code",
        requires_participant_code=requires_participant_code
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

    Args:
        access_code: Conversation access code (already validated)
        participant_code: Participant code to validate
        db: Database session

    Returns:
        Validation result with session token
    """
    from app.core.security import create_participant_session_token
    
    # First verify the access_code is valid and conversation is active
    conversation = db.query(Conversation).filter(
        Conversation.access_code == access_code,
        Conversation.state == ConversationState.ACTIVE.value
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
    
    # Validate participant code belongs to this conversation and is unused
    participant_code_obj = db.query(ParticipantCode).filter(
        ParticipantCode.participant_code == participant_code,
        ParticipantCode.conversation_id == conversation.id,
        ParticipantCode.is_used == False
    ).first()
    
    if not participant_code_obj:
        return CodeValidation(
            valid=False,
            message="Invalid or already used participant code"
        )
    
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
        session_token=session_token
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
    
    # Only check for platform_tracked and revealable conversations
    if conversation.anonymity_level not in [AnonymityLevel.PLATFORM_TRACKED.value, AnonymityLevel.REVEALABLE.value]:
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
    
    # Check if user already responded
    existing_response = db.query(Response).filter(
        Response.conversation_id == conversation.id,
        Response.participant_id == current_user.id
    ).first()
    
    if existing_response:
        return ResponseCheck(
            has_submitted=True,
            message="Your responses have been recorded. You can only submit once"
        )
    
    return ResponseCheck(
        has_submitted=False,
        message=None
    )


@router.post("/conversations/{access_code}/responses", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def submit_response(
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

    # Check if conversation is active
    if conversation.state != ConversationState.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation is not active"
        )

    # Validate anonymity level handling
    if conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
        # Must use participant code (either from URL or request body)
        if not used_participant_code:
            # Check if participant_code is provided in request body
            if not response_data.participant_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Fully anonymous conversations require a participant code"
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
        
        # If invite_only is enabled, verify that invitations exist
        # For fully_anonymous, we trust that participant codes are distributed only to invited users
        if conversation.invite_only:
            # Check if any invitations exist for this conversation
            has_invitations = db.query(ConversationInvitation).filter(
                ConversationInvitation.conversation_id == conversation.id
            ).first()
            
            if not has_invitations:
                # If invite_only is enabled but no invitations exist, this is a configuration error
                # But we'll still allow access to prevent breaking existing conversations
                pass
            # Note: For fully_anonymous, we can't directly link participant codes to invitations
            # since participant codes don't have emails. The facilitator must distribute
            # participant codes only to invited users.

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

    # Create responses
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
            submitted_at=datetime.utcnow()
        )
        db.add(response)

    # Mark participant code as used
    if used_participant_code:
        used_participant_code.is_used = True
        used_participant_code.used_at = datetime.utcnow()

    db.commit()

    return SuccessResponse(
        success=True,
        message="Response submitted successfully"
    )


@router.get("/conversations/{conversation_id}/responses", response_model=ResponseList)
async def get_responses(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all responses for a conversation (owner only).

    Args:
        conversation_id: Conversation ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of responses with question text

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

    # Get all responses with question text
    responses = db.query(
        Response,
        Question.question_text
    ).join(
        Question, Response.question_id == Question.id
    ).filter(
        Response.conversation_id == conversation_id
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
            "submitted_at": response.submitted_at,
            "participant_id": response.participant_id if response.reveal_consent else None,
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

    # Get total responses
    total_responses = db.query(func.count(Response.id)).filter(
        Response.conversation_id == conversation_id
    ).scalar()

    # Get unique participants
    # For fully_anonymous, count unique participant codes used
    # For others, count unique participant_ids
    if conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
        unique_participants = db.query(
            func.count(func.distinct(Response.participant_code_used))
        ).filter(
            Response.conversation_id == conversation_id
        ).scalar()
    else:
        unique_participants = db.query(
            func.count(func.distinct(Response.participant_id))
        ).filter(
            Response.conversation_id == conversation_id
        ).scalar()

    # Get responses by question
    responses_by_question_raw = db.query(
        Response.question_id,
        func.count(Response.id).label('count')
    ).filter(
        Response.conversation_id == conversation_id
    ).group_by(
        Response.question_id
    ).all()

    responses_by_question = {
        str(question_id): count
        for question_id, count in responses_by_question_raw
    }

    return ResponseStats(
        total_responses=total_responses or 0,
        unique_participants=unique_participants or 0,
        responses_by_question=responses_by_question
    )
