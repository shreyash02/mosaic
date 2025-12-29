"""Conversation routes."""

import logging
import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_optional_current_user, get_participant_session
from app.models.user import User
from app.models.conversation import Conversation
from app.models.question import Question
from app.models.participant_code import ParticipantCode
from app.models.response import Response
from app.models.conversation_invitation import ConversationInvitation
from app.utils.timezone_utils import parse_datetime_with_timezone, convert_local_to_utc
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    Conversation as ConversationSchema,
    ConversationWithQuestions,
    ConversationListItem,
    ActivateConversation,
    ExtendConversation,
    GenerateParticipantCodes,
    ConversationState,
    AnonymityLevel,
)
from app.schemas.participant_code import (
    ParticipantCodeList,
    GeneratedParticipantCodes,
    ParticipantCode as ParticipantCodeSchema,
)
from app.schemas.conversation_invitation import (
    InviteUsersRequest,
    InviteUsersResponse,
    InvitationListResponse,
    ConversationInvitation as ConversationInvitationSchema,
    ConversationInvitationWithUser,
)
from app.schemas.common import DeleteResponse
from app.services.email_service import email_service

router = APIRouter()


def generate_access_code(length: int = 12) -> str:
    """Generate a secure random access code."""
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
    # Generate unique access code
    access_code = generate_access_code()
    while db.query(Conversation).filter(Conversation.access_code == access_code).first():
        access_code = generate_access_code()

    # Get conversation timezone
    conversation_timezone = conversation_data.timezone or "UTC"
    
    # Convert scheduled_activate_at from conversation timezone to UTC if provided
    scheduled_activate_at_utc = None
    if conversation_data.scheduled_activate_at:
        scheduled_activate_at_utc = parse_datetime_with_timezone(
            conversation_data.scheduled_activate_at.isoformat() if isinstance(conversation_data.scheduled_activate_at, datetime) else str(conversation_data.scheduled_activate_at),
            conversation_timezone
        )
    
    # Convert auto_close_at from conversation timezone to UTC if provided
    auto_close_at_utc = None
    if conversation_data.auto_close_at:
        auto_close_at_utc = parse_datetime_with_timezone(
            conversation_data.auto_close_at.isoformat() if isinstance(conversation_data.auto_close_at, datetime) else str(conversation_data.auto_close_at),
            conversation_timezone
        )
    
    # Create conversation
    conversation = Conversation(
        creator_id=current_user.id,
        organization_id=conversation_data.organization_id,
        title=conversation_data.title,
        description=conversation_data.description,
        access_code=access_code,
        anonymity_level=conversation_data.anonymity_level.value,
        results_access=conversation_data.results_access.value,
        invite_only=conversation_data.invite_only,
        auto_analyze=conversation_data.auto_analyze,
        max_response_length=conversation_data.max_response_length,
        duration_minutes=conversation_data.duration_minutes,
        scheduled_activate_at=scheduled_activate_at_utc,
        auto_close_at=auto_close_at_utc,
        manual_close_enabled=conversation_data.manual_close_enabled,
        time_extension_enabled=conversation_data.time_extension_enabled,
        timezone=conversation_timezone,
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
            "access_code": conv.access_code,
            "created_at": conv.created_at,
            "activated_at": conv.activated_at,
            "closed_at": conv.closed_at,
            "response_count": response_count,
            "timezone": conv.timezone or "UTC",
        }
        conversations.append(ConversationListItem(**conv_dict))

    return conversations


@router.get("/by-code/{access_code}", response_model=ConversationWithQuestions)
async def get_conversation_by_code(
    access_code: str,
    participant_session: Optional[dict] = Depends(get_participant_session),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    """
    Get conversation details by access code (public endpoint).
    
    For fully_anonymous conversations: Requires valid participant session token.
    For other conversations: Requires authentication.
    
    Args:
        access_code: Conversation access code
        participant_session: Optional participant session (for fully_anonymous)
        current_user: Optional authenticated user (for platform_tracked/revealable)
        db: Database session
    
    Returns:
        Conversation with questions
    
    Raises:
        HTTPException: If conversation not found, not active, or access denied
    """
    # Find conversation by access code (check if it exists first, regardless of state)
    conversation = db.query(Conversation).options(
        joinedload(Conversation.questions)
    ).filter(
        Conversation.access_code == access_code
    ).first()
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found. Please check the access code and try again."
        )
    
    # Check if conversation is active
    if conversation.state != ConversationState.ACTIVE.value:
        if conversation.state == ConversationState.CLOSED.value:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="This conversation has been closed and is no longer accepting responses."
            )
        elif conversation.state == ConversationState.DRAFT.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This conversation has not been activated yet."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="This conversation is not currently available."
            )
    
    # Check access based on anonymity level
    if conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
        # For fully_anonymous, require participant session
        if not participant_session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Valid participant session required for fully anonymous conversations"
            )
        
        # Verify session matches this conversation
        if participant_session["access_code"] != access_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Session token does not match conversation"
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
    else:
        # For platform_tracked/revealable, require authentication
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
                    detail="This conversation is invite-only. You must be invited by the conversation creator to access it. Please contact the organizer if you believe you should have access."
                )
            
            # Mark invitation as accepted if not already
            if not invitation.is_accepted:
                invitation.is_accepted = True
                invitation.accepted_at = datetime.utcnow()
                db.commit()
        else:
            # If not invite_only, still track invitation acceptance if user was invited
            invitation = db.query(ConversationInvitation).filter(
                ConversationInvitation.conversation_id == conversation.id,
                ConversationInvitation.invited_user_id == current_user.id
            ).first()
            
            if invitation and not invitation.is_accepted:
                invitation.is_accepted = True
                invitation.accepted_at = datetime.utcnow()
                db.commit()
    
    return conversation


@router.get("/{conversation_id}", response_model=ConversationWithQuestions)
async def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get conversation details with questions (owner only).

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

    # Handle questions update separately (if provided)
    questions_to_update = update_data.questions
    update_dict = update_data.model_dump(exclude_unset=True, exclude={'questions'})
    
    # Update conversation fields
    for field, value in update_dict.items():
        if field == 'anonymity_level' and value:
            setattr(conversation, field, value.value)
        elif field == 'results_access' and value:
            setattr(conversation, field, value.value)
        else:
            setattr(conversation, field, value)

    # Update questions if provided
    if questions_to_update is not None:
        if len(questions_to_update) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one question is required"
            )
        
        # Delete existing questions
        db.query(Question).filter(Question.conversation_id == conversation.id).delete()
        
        # Create new questions
        for question_data in questions_to_update:
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
    
    # Reload with questions
    conversation = db.query(Conversation).options(
        joinedload(Conversation.questions)
    ).filter(Conversation.id == conversation.id).first()

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
    
    Can activate immediately or schedule activation for a future time.

    Args:
        conversation_id: Conversation ID
        activate_data: Activation data (optional auto_close_at, optional scheduled_activate_at)
        current_user: Current authenticated user
        db: Database session

    Returns:
        Activated conversation (or conversation with scheduled activation time set)

    Raises:
        HTTPException: If conversation is not in draft state
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    if conversation.state != ConversationState.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only activate conversations in draft state"
        )

    # Check if scheduling activation for future
    if activate_data.scheduled_activate_at:
        # Convert scheduled time from conversation timezone to UTC for storage
        conversation_timezone = conversation.timezone or "UTC"
        scheduled_utc = parse_datetime_with_timezone(
            activate_data.scheduled_activate_at.isoformat() if isinstance(activate_data.scheduled_activate_at, datetime) else str(activate_data.scheduled_activate_at),
            conversation_timezone
        )
        
        # Validate scheduled time is in the future
        if scheduled_utc <= datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled activation time must be in the future"
            )
        
        # Schedule activation (store in UTC)
        conversation.scheduled_activate_at = scheduled_utc
        
        # If duration_minutes is set, calculate auto_close_at based on scheduled time
        if conversation.duration_minutes:
            conversation.auto_close_at = scheduled_utc + timedelta(minutes=conversation.duration_minutes)
        elif activate_data.auto_close_at:
            # Convert auto_close_at from conversation timezone to UTC
            auto_close_utc = parse_datetime_with_timezone(
                activate_data.auto_close_at.isoformat() if isinstance(activate_data.auto_close_at, datetime) else str(activate_data.auto_close_at),
                conversation_timezone
            )
            conversation.auto_close_at = auto_close_utc
    else:
        # Activate immediately
        conversation.state = ConversationState.ACTIVE.value
        conversation.activated_at = datetime.utcnow()
        conversation.scheduled_activate_at = None  # Clear any previously scheduled time

        # Calculate auto_close_at from duration_minutes if set
        if conversation.duration_minutes:
            conversation.auto_close_at = conversation.activated_at + timedelta(minutes=conversation.duration_minutes)
        elif activate_data.auto_close_at:
            # Allow override via activation endpoint if duration_minutes is not set
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


@router.post("/{conversation_id}/participant-codes", response_model=GeneratedParticipantCodes, status_code=status.HTTP_201_CREATED)
async def generate_participant_codes(
    conversation_id: UUID,
    generate_data: GenerateParticipantCodes,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate unique participant codes for fully_anonymous mode.

    Args:
        conversation_id: Conversation ID
        generate_data: Number of codes to generate
        current_user: Current authenticated user
        db: Database session

    Returns:
        Generated participant codes

    Raises:
        HTTPException: If conversation is not fully_anonymous
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    if conversation.anonymity_level != AnonymityLevel.FULLY_ANONYMOUS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Participant codes can only be generated for fully_anonymous conversations"
        )

    # Generate unique codes
    codes = []
    for _ in range(generate_data.count):
        code = generate_access_code(length=16)
        while db.query(ParticipantCode).filter(ParticipantCode.participant_code == code).first():
            code = generate_access_code(length=16)

        participant_code = ParticipantCode(
            conversation_id=conversation.id,
            participant_code=code,
        )
        db.add(participant_code)
        codes.append(code)

    db.commit()

    return GeneratedParticipantCodes(
        conversation_id=conversation.id,
        codes_generated=len(codes),
        codes=codes
    )


@router.get("/{conversation_id}/participant-codes", response_model=ParticipantCodeList)
async def list_participant_codes(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List generated participant codes and their usage.

    Args:
        conversation_id: Conversation ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of participant codes with usage stats
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    if conversation.anonymity_level != AnonymityLevel.FULLY_ANONYMOUS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Participant codes are only available for fully_anonymous conversations"
        )

    # Get all participant codes for this conversation
    participant_codes = db.query(ParticipantCode).filter(
        ParticipantCode.conversation_id == conversation.id
    ).order_by(ParticipantCode.created_at.desc()).all()

    total_codes = len(participant_codes)
    used_codes = sum(1 for code in participant_codes if code.is_used)
    unused_codes = total_codes - used_codes

    return ParticipantCodeList(
        conversation_id=conversation.id,
        total_codes=total_codes,
        used_codes=used_codes,
        unused_codes=unused_codes,
        codes=[ParticipantCodeSchema.model_validate(code) for code in participant_codes]
    )


@router.post("/{conversation_id}/invitations", response_model=InviteUsersResponse, status_code=status.HTTP_201_CREATED)
async def invite_users(
    conversation_id: UUID,
    invite_data: InviteUsersRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invite users to a conversation by email.

    Args:
        conversation_id: Conversation ID
        invite_data: List of email addresses to invite
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created invitations

    Raises:
        HTTPException: If conversation not found or user is not the owner
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    # Check if conversation is active (can invite to active conversations)
    if conversation.state not in [ConversationState.DRAFT.value, ConversationState.ACTIVE.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only invite users to draft or active conversations"
        )

    # Validate that invite_only is enabled
    if not conversation.invite_only:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invitations can only be sent for conversations with invite-only mode enabled"
        )

    # Create invitations
    created_invitations = []
    for email in invite_data.emails:
        # Check if invitation already exists
        existing = db.query(ConversationInvitation).filter(
            ConversationInvitation.conversation_id == conversation.id,
            ConversationInvitation.email == email.lower()
        ).first()

        if existing:
            # Skip if already invited
            continue

        # Check if user exists with this email
        invited_user = db.query(User).filter(User.email == email.lower()).first()

        # Generate invitation token
        invitation_token = generate_access_code(length=24)

        invitation = ConversationInvitation(
            conversation_id=conversation.id,
            email=email.lower(),
            invited_by_id=current_user.id,
            invited_user_id=invited_user.id if invited_user else None,
            invitation_token=invitation_token,
        )
        db.add(invitation)
        created_invitations.append(invitation)

    db.commit()

    # Refresh invitations
    for inv in created_invitations:
        db.refresh(inv)

    # Send invitation emails asynchronously
    # Don't block the response if email sending fails
    logger = logging.getLogger(__name__)
    for invitation in created_invitations:
        try:
            await email_service.send_invitation_email(
                to_email=invitation.email,
                conversation_title=conversation.title,
                conversation_description=conversation.description,
                access_code=conversation.access_code,
                invitation_token=invitation.invitation_token,
                inviter_name=current_user.full_name or current_user.email,
            )
        except Exception as e:
            # Log error but don't fail the request
            # Email sending failures shouldn't prevent invitation creation
            logger.error(f"Failed to send invitation email to {invitation.email}: {str(e)}", exc_info=True)

    return InviteUsersResponse(
        conversation_id=conversation.id,
        invitations_created=len(created_invitations),
        invitations=[ConversationInvitationSchema.model_validate(inv) for inv in created_invitations]
    )


@router.get("/{conversation_id}/invitations", response_model=InvitationListResponse)
async def list_invitations(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all invitations for a conversation.

    Args:
        conversation_id: Conversation ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of invitations with user details

    Raises:
        HTTPException: If conversation not found or user is not the owner
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    # Get all invitations with user details
    invitations = db.query(ConversationInvitation).options(
        joinedload(ConversationInvitation.invited_user)
    ).filter(
        ConversationInvitation.conversation_id == conversation.id
    ).order_by(ConversationInvitation.created_at.desc()).all()

    total_invitations = len(invitations)
    accepted_invitations = sum(1 for inv in invitations if inv.is_accepted)
    pending_invitations = total_invitations - accepted_invitations

    # Build invitation list with response submission status
    invitation_list = []
    for inv in invitations:
        has_submitted = False
        # Check if the invited user has submitted a response
        if inv.invited_user_id:
            # For authenticated users, check by participant_id
            response = db.query(Response).filter(
                Response.conversation_id == conversation.id,
                Response.participant_id == inv.invited_user_id
            ).first()
            has_submitted = response is not None
        
        # Create invitation schema with response status
        inv_schema = ConversationInvitationWithUser.model_validate(inv)
        # Create a copy with the response submission status
        inv_with_response = inv_schema.model_copy(update={'has_submitted_response': has_submitted})
        invitation_list.append(inv_with_response)

    return InvitationListResponse(
        conversation_id=conversation.id,
        total_invitations=total_invitations,
        accepted_invitations=accepted_invitations,
        pending_invitations=pending_invitations,
        invitations=invitation_list
    )


@router.delete("/{conversation_id}/invitations/{invitation_id}", response_model=DeleteResponse)
async def delete_invitation(
    conversation_id: UUID,
    invitation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete an invitation.

    Args:
        conversation_id: Conversation ID
        invitation_id: Invitation ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Delete confirmation

    Raises:
        HTTPException: If conversation or invitation not found
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    invitation = db.query(ConversationInvitation).filter(
        ConversationInvitation.id == invitation_id,
        ConversationInvitation.conversation_id == conversation.id
    ).first()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found"
        )

    db.delete(invitation)
    db.commit()

    return DeleteResponse(
        success=True,
        message="Invitation deleted successfully",
        deleted_id=str(invitation_id)
    )
