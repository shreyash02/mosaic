"""Conversation routes."""

import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.question import Question
from app.models.invite_code import InviteCode
from app.models.response import Response
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    Conversation as ConversationSchema,
    ConversationWithQuestions,
    ConversationListItem,
    ActivateConversation,
    ExtendConversation,
    GenerateInviteCodes,
    ConversationState,
    AnonymityLevel,
)
from app.schemas.invite_code import (
    InviteCodeList,
    GeneratedInviteCodes,
    InviteCode as InviteCodeSchema,
)
from app.schemas.common import DeleteResponse

router = APIRouter()


def generate_invite_code(length: int = 12) -> str:
    """Generate a secure random invite code."""
    alphabet = string.ascii_uppercase + string.digits
    # Exclude similar looking characters
    alphabet = alphabet.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def get_conversation_or_404(
    conversation_id: UUID,
    db: Session,
    current_user: User
) -> Conversation:
    """Get conversation by ID or raise 404."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.creator_id == current_user.id,
        Conversation.state != ConversationState.DELETED
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    return conversation


@router.post("", response_model=ConversationWithQuestions, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new conversation with questions.

    Args:
        conversation_data: Conversation creation data with questions
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created conversation with questions
    """
    # Generate unique invite code
    invite_code = generate_invite_code()
    while db.query(Conversation).filter(Conversation.invite_code == invite_code).first():
        invite_code = generate_invite_code()

    # Create conversation
    conversation = Conversation(
        creator_id=current_user.id,
        organization_id=conversation_data.organization_id,
        title=conversation_data.title,
        description=conversation_data.description,
        invite_code=invite_code,
        anonymity_level=conversation_data.anonymity_level.value,
        results_access=conversation_data.results_access.value,
        auto_analyze=conversation_data.auto_analyze,
        max_response_length=conversation_data.max_response_length,
        auto_close_at=conversation_data.auto_close_at,
        manual_close_enabled=conversation_data.manual_close_enabled,
        time_extension_enabled=conversation_data.time_extension_enabled,
        state=ConversationState.DRAFT.value,
    )

    db.add(conversation)
    db.flush()  # Get conversation ID

    # Create questions
    for question_data in conversation_data.questions:
        question = Question(
            conversation_id=conversation.id,
            question_text=question_data.question_text,
            question_type=question_data.question_type,
            question_order=question_data.question_order,
            options=question_data.options,
        )
        db.add(question)

    db.commit()
    db.refresh(conversation)

    return conversation


@router.get("", response_model=List[ConversationListItem])
async def list_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    state: Optional[ConversationState] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List user's conversations.

    Args:
        skip: Number of conversations to skip
        limit: Maximum number of conversations to return
        state: Optional filter by conversation state
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of conversations
    """
    query = db.query(
        Conversation,
        func.count(Response.id).label('response_count')
    ).outerjoin(Response).filter(
        Conversation.creator_id == current_user.id,
        Conversation.state != ConversationState.DELETED
    ).group_by(Conversation.id)

    if state:
        query = query.filter(Conversation.state == state.value)

    query = query.order_by(Conversation.created_at.desc())
    query = query.offset(skip).limit(limit)

    results = query.all()

    # Build response with response count
    conversations = []
    for conv, response_count in results:
        conv_dict = {
            "id": conv.id,
            "title": conv.title,
            "state": conv.state,
            "anonymity_level": conv.anonymity_level,
            "invite_code": conv.invite_code,
            "created_at": conv.created_at,
            "activated_at": conv.activated_at,
            "closed_at": conv.closed_at,
            "response_count": response_count,
        }
        conversations.append(ConversationListItem(**conv_dict))

    return conversations


@router.get("/{conversation_id}", response_model=ConversationWithQuestions)
async def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get conversation details with questions.

    Args:
        conversation_id: Conversation ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Conversation with questions
    """
    conversation = db.query(Conversation).options(
        joinedload(Conversation.questions)
    ).filter(
        Conversation.id == conversation_id,
        Conversation.creator_id == current_user.id,
        Conversation.state != ConversationState.DELETED
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    return conversation


@router.patch("/{conversation_id}", response_model=ConversationWithQuestions)
async def update_conversation(
    conversation_id: UUID,
    update_data: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update conversation (only in draft state).

    Args:
        conversation_id: Conversation ID
        update_data: Update data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated conversation

    Raises:
        HTTPException: If conversation is not in draft state
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    # Only allow updates in draft state
    if conversation.state != ConversationState.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update conversations in draft state"
        )

    # Update fields
    update_dict = update_data.model_dump(exclude_unset=True)
    for field, value in update_dict.items():
        setattr(conversation, field, value)

    db.commit()
    db.refresh(conversation)

    return conversation


@router.delete("/{conversation_id}", response_model=DeleteResponse)
async def delete_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete conversation (soft delete by marking as deleted).

    Args:
        conversation_id: Conversation ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Delete confirmation
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    # Soft delete
    conversation.state = ConversationState.DELETED.value
    db.commit()

    return DeleteResponse(
        success=True,
        message="Conversation deleted successfully",
        deleted_id=str(conversation_id)
    )


@router.post("/{conversation_id}/activate", response_model=ConversationWithQuestions)
async def activate_conversation(
    conversation_id: UUID,
    activate_data: ActivateConversation,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Activate a conversation (move from draft to active).

    Args:
        conversation_id: Conversation ID
        activate_data: Activation data (optional auto_close_at)
        current_user: Current authenticated user
        db: Database session

    Returns:
        Activated conversation

    Raises:
        HTTPException: If conversation is not in draft state
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    if conversation.state != ConversationState.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only activate conversations in draft state"
        )

    conversation.state = ConversationState.ACTIVE.value
    conversation.activated_at = datetime.utcnow()

    if activate_data.auto_close_at:
        conversation.auto_close_at = activate_data.auto_close_at

    db.commit()
    db.refresh(conversation)

    return conversation


@router.post("/{conversation_id}/close", response_model=ConversationWithQuestions)
async def close_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Close a conversation manually.

    Args:
        conversation_id: Conversation ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Closed conversation

    Raises:
        HTTPException: If conversation is not active or manual close is disabled
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    if conversation.state != ConversationState.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only close active conversations"
        )

    if not conversation.manual_close_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Manual close is disabled for this conversation"
        )

    conversation.state = ConversationState.CLOSED.value
    conversation.closed_at = datetime.utcnow()

    db.commit()
    db.refresh(conversation)

    return conversation


@router.post("/{conversation_id}/extend", response_model=ConversationWithQuestions)
async def extend_conversation(
    conversation_id: UUID,
    extend_data: ExtendConversation,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Extend conversation time window.

    Args:
        conversation_id: Conversation ID
        extend_data: Extension data (additional hours)
        current_user: Current authenticated user
        db: Database session

    Returns:
        Extended conversation

    Raises:
        HTTPException: If extension is not enabled or conversation is not active
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    if conversation.state != ConversationState.ACTIVE.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only extend active conversations"
        )

    if not conversation.time_extension_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time extension is disabled for this conversation"
        )

    if not conversation.auto_close_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No auto-close time set for this conversation"
        )

    # Extend the auto_close_at time
    conversation.auto_close_at = conversation.auto_close_at + timedelta(hours=extend_data.additional_hours)

    db.commit()
    db.refresh(conversation)

    return conversation


@router.post("/{conversation_id}/invite-codes", response_model=GeneratedInviteCodes, status_code=status.HTTP_201_CREATED)
async def generate_invite_codes(
    conversation_id: UUID,
    generate_data: GenerateInviteCodes,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate unique invite codes for fully_anonymous mode.

    Args:
        conversation_id: Conversation ID
        generate_data: Number of codes to generate
        current_user: Current authenticated user
        db: Database session

    Returns:
        Generated invite codes

    Raises:
        HTTPException: If conversation is not fully_anonymous
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    if conversation.anonymity_level != AnonymityLevel.FULLY_ANONYMOUS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite codes can only be generated for fully_anonymous conversations"
        )

    # Generate unique codes
    codes = []
    for _ in range(generate_data.count):
        code = generate_invite_code(length=16)
        while db.query(InviteCode).filter(InviteCode.code == code).first():
            code = generate_invite_code(length=16)

        invite_code = InviteCode(
            conversation_id=conversation.id,
            code=code,
        )
        db.add(invite_code)
        codes.append(code)

    db.commit()

    return GeneratedInviteCodes(
        conversation_id=conversation.id,
        codes_generated=len(codes),
        codes=codes
    )


@router.get("/{conversation_id}/invite-codes", response_model=InviteCodeList)
async def list_invite_codes(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List generated invite codes and their usage.

    Args:
        conversation_id: Conversation ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of invite codes with usage stats
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    if conversation.anonymity_level != AnonymityLevel.FULLY_ANONYMOUS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invite codes are only available for fully_anonymous conversations"
        )

    # Get all invite codes for this conversation
    invite_codes = db.query(InviteCode).filter(
        InviteCode.conversation_id == conversation.id
    ).order_by(InviteCode.created_at.desc()).all()

    total_codes = len(invite_codes)
    used_codes = sum(1 for code in invite_codes if code.is_used)
    unused_codes = total_codes - used_codes

    return InviteCodeList(
        conversation_id=conversation.id,
        total_codes=total_codes,
        used_codes=used_codes,
        unused_codes=unused_codes,
        codes=[InviteCodeSchema.model_validate(code) for code in invite_codes]
    )
