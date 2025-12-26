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
from app.models.invite_code import InviteCode
from app.schemas.response import (
    ResponseSubmit,
    Response as ResponseSchema,
    ResponseWithQuestion,
    ResponseList,
    ResponseStats,
)
from app.schemas.invite_code import InviteCodeValidation
from app.schemas.common import SuccessResponse
from app.schemas.conversation import ConversationState, AnonymityLevel

router = APIRouter()


@router.post("/conversations/{invite_code}/validate")
async def validate_invite_code(
    invite_code: str,
    db: Session = Depends(get_db)
) -> InviteCodeValidation:
    """
    Validate an invite code for a conversation.

    Args:
        invite_code: Invite code to validate
        db: Database session

    Returns:
        Validation result with conversation info
    """
    # Try to find conversation by main invite code
    conversation = db.query(Conversation).filter(
        Conversation.invite_code == invite_code,
        Conversation.state == ConversationState.ACTIVE.value
    ).first()

    if conversation:
        return InviteCodeValidation(
            valid=True,
            conversation_id=conversation.id,
            message="Valid conversation invite code"
        )

    # Try to find by unique invite code (fully_anonymous mode)
    unique_code = db.query(InviteCode).filter(
        InviteCode.code == invite_code,
        InviteCode.is_used == False
    ).first()

    if unique_code:
        # Check if conversation is active
        conversation = db.query(Conversation).filter(
            Conversation.id == unique_code.conversation_id,
            Conversation.state == ConversationState.ACTIVE.value
        ).first()

        if conversation:
            return InviteCodeValidation(
                valid=True,
                conversation_id=conversation.id,
                message="Valid unique invite code"
            )

    return InviteCodeValidation(
        valid=False,
        message="Invalid or expired invite code"
    )


@router.post("/conversations/{invite_code}/responses", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def submit_response(
    invite_code: str,
    response_data: ResponseSubmit,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """
    Submit a response to a conversation.

    Supports three anonymity modes:
    - fully_anonymous: Requires unique invite code, no user tracking
    - platform_tracked: Platform knows user but doesn't reveal to facilitator
    - revealable: User can consent to reveal identity

    Args:
        invite_code: Conversation invite code or unique participant code
        response_data: Response submission data
        db: Database session
        current_user: Optional authenticated user

    Returns:
        Success confirmation

    Raises:
        HTTPException: If conversation not found, not active, or validation fails
    """
    # Find conversation by invite code
    conversation = db.query(Conversation).options(
        joinedload(Conversation.questions)
    ).filter(
        Conversation.invite_code == invite_code
    ).first()

    # If not found by main invite code, try unique invite code
    used_unique_code = None
    if not conversation:
        unique_code = db.query(InviteCode).filter(
            InviteCode.code == invite_code
        ).first()

        if unique_code:
            conversation = db.query(Conversation).options(
                joinedload(Conversation.questions)
            ).filter(
                Conversation.id == unique_code.conversation_id
            ).first()
            used_unique_code = unique_code

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
        # Must use unique invite code
        if not used_unique_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Fully anonymous conversations require unique invite codes"
            )

        # Check if code is already used
        if used_unique_code.is_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This invite code has already been used"
            )

    elif conversation.anonymity_level in [AnonymityLevel.PLATFORM_TRACKED.value, AnonymityLevel.REVEALABLE.value]:
        # Must be authenticated
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required for this conversation type"
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
            invite_code_used=invite_code if conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value else None,
            reveal_consent=response_data.reveal_consent if conversation.anonymity_level == AnonymityLevel.REVEALABLE.value else False,
            submitted_at=datetime.utcnow()
        )
        db.add(response)

    # Mark unique invite code as used
    if used_unique_code:
        used_unique_code.is_used = True
        used_unique_code.used_at = datetime.utcnow()

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
    # For fully_anonymous, count unique invite codes used
    # For others, count unique participant_ids
    if conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
        unique_participants = db.query(
            func.count(func.distinct(Response.invite_code_used))
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
