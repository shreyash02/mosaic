"""Conversation routes."""

import logging
import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user, get_optional_current_user, get_participant_session
from app.models.user import User
from app.models.conversation import Conversation
from app.models.question import Question
from app.models.participant_code import ParticipantCode
from app.models.response import Response
from app.models.conversation_invitation import ConversationInvitation
from app.models.organization import OrganizationMember
from app.utils.timezone_utils import parse_datetime_with_timezone, convert_local_to_utc
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    Conversation as ConversationSchema,
    ConversationWithQuestions,
    ConversationListItem,
    ConversationSummary,
    ConversationLineage,
    CreateFollowUpRequest,
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
    ConversationInvitationWithConversation,
)
from app.schemas.common import DeleteResponse
from app.services.email_service import email_service
from app.services.organization_service import check_organization_membership

router = APIRouter()


def generate_access_code(length: int = 12) -> str:
    """Generate a secure random access code."""
    alphabet = string.ascii_uppercase + string.digits
    # Exclude similar looking characters
    alphabet = alphabet.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
    return ''.join(secrets.choice(alphabet) for _ in range(length))


async def send_pending_invitation_emails(
    conversation: Conversation,
    db: Session,
    inviter_user: Optional[User] = None
) -> None:
    """
    Send invitation emails to all pending invitations for a conversation.

    Args:
        conversation: The conversation to send invitations for
        db: Database session
        inviter_user: Optional user who invited (for inviter name in email)
    """
    if not conversation.invite_only:
        return

    # Get all pending invitations for this conversation
    pending_invitations = db.query(ConversationInvitation).filter(
        ConversationInvitation.conversation_id == conversation.id
    ).all()

    if not pending_invitations:
        return

    # Get inviter name
    inviter_name = None
    if inviter_user:
        inviter_name = inviter_user.full_name or inviter_user.email
    elif pending_invitations and pending_invitations[0].invited_by_id:
        inviter = db.query(User).filter(User.id == pending_invitations[0].invited_by_id).first()
        if inviter:
            inviter_name = inviter.full_name or inviter.email

    # Send invitation emails asynchronously
    # Don't block if email sending fails
    logger = logging.getLogger(__name__)
    for invitation in pending_invitations:
        try:
            await email_service.send_invitation_email(
                to_email=invitation.email,
                conversation_title=conversation.title,
                conversation_description=conversation.description,
                access_code=conversation.access_code,
                invitation_token=invitation.invitation_token,
                inviter_name=inviter_name,
            )
        except Exception as e:
            # Log error but don't fail the request
            # Email sending failures shouldn't prevent activation
            logger.error(f"Failed to send invitation email to {invitation.email}: {str(e)}", exc_info=True)


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

    # Convert next_instance_date from conversation timezone to UTC if provided (for recurring templates)
    next_instance_date_utc = None
    if conversation_data.next_instance_date:
        next_instance_date_utc = parse_datetime_with_timezone(
            conversation_data.next_instance_date.isoformat() if isinstance(conversation_data.next_instance_date, datetime) else str(conversation_data.next_instance_date),
            conversation_timezone
        )

    # Convert recurrence_end_date from conversation timezone to UTC if provided
    recurrence_end_date_utc = None
    if conversation_data.recurrence_end_date:
        recurrence_end_date_utc = parse_datetime_with_timezone(
            conversation_data.recurrence_end_date.isoformat() if isinstance(conversation_data.recurrence_end_date, datetime) else str(conversation_data.recurrence_end_date),
            conversation_timezone
        )

    # If organization_id is provided, verify user is member
    if conversation_data.organization_id:
        membership = check_organization_membership(
            db,
            conversation_data.organization_id,
            current_user.id
        )
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must be a member of this organization to create conversations in it"
            )

    # If series_id is provided, verify series exists and user has access
    if conversation_data.series_id:
        from app.models.series import Series
        series = db.query(Series).filter(Series.id == conversation_data.series_id).first()
        if not series:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Series not found"
            )
        # Check access: creator or org member
        if series.creator_id != current_user.id:
            if series.organization_id:
                membership = check_organization_membership(
                    db, series.organization_id, current_user.id
                )
                if not membership:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You don't have access to this series"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this series"
                )

    # If template_series_id is provided (for templates), verify series exists and user has access
    if conversation_data.template_series_id:
        from app.models.series import Series
        series = db.query(Series).filter(Series.id == conversation_data.template_series_id).first()
        if not series:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template series not found"
            )
        # Check access: creator or org member
        if series.creator_id != current_user.id:
            if series.organization_id:
                membership = check_organization_membership(
                    db, series.organization_id, current_user.id
                )
                if not membership:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You don't have access to this series"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this series"
                )

    # Create conversation
    conversation = Conversation(
        creator_id=current_user.id,
        organization_id=conversation_data.organization_id,
        parent_conversation_id=conversation_data.parent_conversation_id,
        title=conversation_data.title,
        participant_title=conversation_data.participant_title,
        description=conversation_data.description,
        header_image_url=conversation_data.header_image_url,
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
        # Template fields
        is_template=conversation_data.is_template or False,
        template_series_id=conversation_data.template_series_id,
        # Series relationship
        series_id=conversation_data.series_id,
        # Recurring conversation fields
        is_recurring_instance=False,  # Will be set by scheduler for auto-created instances
        recurrence_pattern=conversation_data.recurrence_pattern.value if conversation_data.recurrence_pattern else None,
        next_instance_date=next_instance_date_utc,
        recurrence_end_date=recurrence_end_date_utc,
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
            is_required=question_data.is_required if hasattr(question_data, 'is_required') else False,
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

    Includes both:
    - Conversations created by the user
    - Conversations in organizations where the user is a member

    Args:
        skip: Number of conversations to skip
        limit: Maximum number of conversations to return
        state: Optional filter by conversation state
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of conversations
    """
    # Get user's organizations
    user_org_ids = db.query(OrganizationMember.organization_id).filter(
        OrganizationMember.user_id == current_user.id
    ).subquery()

    query = db.query(
        Conversation,
        func.count(Response.id).label('response_count')
    ).outerjoin(Response).filter(
        or_(
            Conversation.creator_id == current_user.id,
            Conversation.organization_id.in_(user_org_ids)
        ),
        Conversation.state != ConversationState.DELETED
    ).group_by(Conversation.id)

    if state:
        query = query.filter(Conversation.state == state.value)

    query = query.order_by(Conversation.created_at.desc())
    query = query.offset(skip).limit(limit)

    results = query.all()

    # Build response with response count and unique participants
    conversations = []
    for conv, response_count in results:
        # Calculate unique participants based on anonymity level
        if conv.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
            unique_participants = db.query(
                func.count(func.distinct(Response.participant_code_used))
            ).filter(
                Response.conversation_id == conv.id,
                Response.participant_code_used.isnot(None)
            ).scalar() or 0
        else:
            unique_participants = db.query(
                func.count(func.distinct(Response.participant_id))
            ).filter(
                Response.conversation_id == conv.id,
                Response.participant_id.isnot(None)
            ).scalar() or 0

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
            "unique_participants": unique_participants,
            "timezone": conv.timezone or "UTC",
            "is_follow_up": conv.parent_conversation_id is not None,
            "parent_conversation_id": conv.parent_conversation_id,
            "organization_id": conv.organization_id,
            # Template fields
            "is_template": conv.is_template or False,
            "template_series_id": conv.template_series_id,
            # Series relationship
            "series_id": conv.series_id,
            # Recurring conversation fields
            "is_recurring_instance": conv.is_recurring_instance or False,
            "recurrence_pattern": conv.recurrence_pattern,
        }
        conversations.append(ConversationListItem(**conv_dict))

    return conversations


@router.get("/participated", response_model=List[ConversationListItem])
async def list_participated_conversations(
    skip: int = 0,
    limit: int = 100,
    state: Optional[ConversationState] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List conversations where the user has submitted responses.

    This endpoint returns conversations the user participated in (submitted responses to)
    but did not create. Useful for showing "My Responses" or "Participated" tab.

    Args:
        skip: Number of conversations to skip
        limit: Maximum number of conversations to return
        state: Optional filter by conversation state
        current_user: Current authenticated user
        db: Database session

    Returns:
        List of conversations where user has participated
    """
    # Get conversation IDs where user has responses
    participated_conv_ids = db.query(Response.conversation_id).filter(
        Response.participant_id == current_user.id
    ).distinct().subquery()

    query = db.query(
        Conversation,
        func.count(Response.id).label('response_count')
    ).outerjoin(Response).filter(
        Conversation.id.in_(participated_conv_ids),
        Conversation.creator_id != current_user.id,  # Exclude conversations user created
        Conversation.state != ConversationState.DELETED
    ).group_by(Conversation.id)

    if state:
        query = query.filter(Conversation.state == state.value)

    query = query.order_by(Conversation.created_at.desc())
    query = query.offset(skip).limit(limit)

    results = query.all()

    # Build response with response count and unique participants
    conversations = []
    for conv, response_count in results:
        # Calculate unique participants based on anonymity level
        if conv.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
            unique_participants = db.query(
                func.count(func.distinct(Response.participant_code_used))
            ).filter(
                Response.conversation_id == conv.id,
                Response.participant_code_used.isnot(None)
            ).scalar() or 0
        else:
            unique_participants = db.query(
                func.count(func.distinct(Response.participant_id))
            ).filter(
                Response.conversation_id == conv.id,
                Response.participant_id.isnot(None)
            ).scalar() or 0

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
            "unique_participants": unique_participants,
            "timezone": conv.timezone or "UTC",
            "is_follow_up": conv.parent_conversation_id is not None,
            "parent_conversation_id": conv.parent_conversation_id,
            "organization_id": conv.organization_id,
            # Template fields
            "is_template": conv.is_template or False,
            "template_series_id": conv.template_series_id,
            # Series relationship
            "series_id": conv.series_id,
            # Recurring conversation fields
            "is_recurring_instance": conv.is_recurring_instance or False,
            "recurrence_pattern": conv.recurrence_pattern,
        }
        conversations.append(ConversationListItem(**conv_dict))

    return conversations


@router.get("/invitations", response_model=List[ConversationInvitationWithConversation])
async def get_my_invitations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all invitations for the current user.
    
    Returns invitations where:
    - email matches user's email OR
    - invited_user_id matches user's id
    - conversation state is ACTIVE
    
    Args:
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        List of invitations with conversation details
    """
    # First get all invitations for the user
    invitations = db.query(ConversationInvitation).options(
        joinedload(ConversationInvitation.conversation)
    ).filter(
        or_(
            ConversationInvitation.email == current_user.email.lower(),
            ConversationInvitation.invited_user_id == current_user.id
        ),
        ConversationInvitation.is_accepted == False
    ).order_by(ConversationInvitation.created_at.desc()).all()
    
    # Filter to only include invitations for active conversations
    invitations = [inv for inv in invitations if inv.conversation.state == ConversationState.ACTIVE.value]
    
    # Convert to schema with conversation details
    result = []
    for inv in invitations:
        # Build conversation dict
        conv = inv.conversation
        response_count = db.query(func.count(Response.id)).filter(
            Response.conversation_id == conv.id
        ).scalar()
        
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
            "is_follow_up": conv.parent_conversation_id is not None,
            "parent_conversation_id": conv.parent_conversation_id,
            "organization_id": conv.organization_id,
            # Template fields
            "is_template": conv.is_template or False,
            "template_series_id": conv.template_series_id,
            # Series relationship
            "series_id": conv.series_id,
            # Recurring conversation fields
            "is_recurring_instance": conv.is_recurring_instance or False,
            "recurrence_pattern": conv.recurrence_pattern,
        }
        
        # Build invitation dict
        inv_dict = {
            "id": inv.id,
            "conversation_id": inv.conversation_id,
            "email": inv.email,
            "invited_by_id": inv.invited_by_id,
            "invited_user_id": inv.invited_user_id,
            "invitation_token": inv.invitation_token,
            "is_accepted": inv.is_accepted,
            "accepted_at": inv.accepted_at,
            "created_at": inv.created_at,
            "expires_at": inv.expires_at,
            "conversation": ConversationListItem(**conv_dict)
        }
        
        result.append(ConversationInvitationWithConversation(**inv_dict))
    
    return result


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
        joinedload(Conversation.questions),
        joinedload(Conversation.parent_conversation),
        joinedload(Conversation.follow_up_conversations)
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

    # Set is_follow_up field
    conversation.is_follow_up = conversation.parent_conversation_id is not None

    return conversation


@router.patch("/{conversation_id}", response_model=ConversationWithQuestions)
async def update_conversation(
    conversation_id: UUID,
    update_data: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update conversation.

    - Regular conversations can only be updated in draft state
    - Templates can be updated at any time (changes apply to future instances only)

    Args:
        conversation_id: Conversation ID
        update_data: Update data
        current_user: Current authenticated user
        db: Database session

    Returns:
        Updated conversation

    Raises:
        HTTPException: If conversation cannot be updated
    """
    conversation = get_conversation_or_404(conversation_id, db, current_user)

    # Check if this is a template (has recurrence_pattern and no series_id)
    is_template = (conversation.series_id is None and
                   conversation.recurrence_pattern is not None)

    # Handle questions update separately (if provided)
    questions_to_update = update_data.questions
    update_dict = update_data.model_dump(exclude_unset=True, exclude={'questions'})
    
    # Check if only series_id is being updated (allowed at any stage)
    only_series_update = (
        len(update_dict) == 1 and 
        'series_id' in update_dict and
        questions_to_update is None
    )

    # Only allow updates in draft state for regular conversations
    # Templates can be updated at any time
    # series_id can be updated at any stage
    if not is_template and not only_series_update and conversation.state != ConversationState.DRAFT.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update conversations in draft state"
        )

    # Get conversation timezone for datetime conversions
    conversation_timezone = conversation.timezone or "UTC"

    # Update conversation fields
    for field, value in update_dict.items():
        if field == 'anonymity_level' and value:
            setattr(conversation, field, value.value)
        elif field == 'results_access' and value:
            setattr(conversation, field, value.value)
        elif field == 'recurrence_pattern' and value:
            setattr(conversation, field, value.value)
        elif field in ['next_instance_date', 'recurrence_end_date'] and value:
            # Convert from conversation timezone to UTC
            value_utc = parse_datetime_with_timezone(
                value.isoformat() if isinstance(value, datetime) else str(value),
                conversation_timezone
            )
            setattr(conversation, field, value_utc)
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
                is_required=question_data.is_required if hasattr(question_data, 'is_required') else False,
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


@router.post("/{conversation_id}/duplicate", response_model=ConversationWithQuestions, status_code=status.HTTP_201_CREATED)
async def duplicate_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Duplicate a conversation with all its questions.

    Creates a new conversation in draft state with "- Copy" appended to the title.
    Copies all conversation settings and questions, but does NOT copy invitations.

    Args:
        conversation_id: Conversation ID to duplicate
        current_user: Current authenticated user
        db: Database session

    Returns:
        Duplicated conversation with questions

    Raises:
        HTTPException: If conversation not found or user is not the owner
    """
    # Get the original conversation with questions
    original_conversation = db.query(Conversation).options(
        joinedload(Conversation.questions)
    ).filter(
        Conversation.id == conversation_id,
        Conversation.creator_id == current_user.id,
        Conversation.state != ConversationState.DELETED
    ).first()

    if not original_conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Generate unique access code
    access_code = generate_access_code()
    while db.query(Conversation).filter(Conversation.access_code == access_code).first():
        access_code = generate_access_code()

    # Create duplicate conversation with "- Copy" appended to title
    duplicate_title = f"{original_conversation.title} - Copy"

    duplicate_conversation = Conversation(
        creator_id=current_user.id,
        organization_id=original_conversation.organization_id,
        # Don't copy parent_conversation_id - this is a standalone duplicate
        parent_conversation_id=None,
        title=duplicate_title,
        participant_title=original_conversation.participant_title,
        description=original_conversation.description,
        header_image_url=original_conversation.header_image_url,
        access_code=access_code,
        anonymity_level=original_conversation.anonymity_level,
        results_access=original_conversation.results_access,
        show_verbatim_responses=original_conversation.show_verbatim_responses,
        invite_only=original_conversation.invite_only,
        auto_analyze=original_conversation.auto_analyze,
        max_response_length=original_conversation.max_response_length,
        duration_minutes=original_conversation.duration_minutes,
        # Don't copy scheduled_activate_at - new conversation starts fresh
        scheduled_activate_at=None,
        # Don't copy auto_close_at - new conversation starts fresh
        auto_close_at=None,
        manual_close_enabled=original_conversation.manual_close_enabled,
        time_extension_enabled=original_conversation.time_extension_enabled,
        timezone=original_conversation.timezone or "UTC",
        state=ConversationState.DRAFT.value,
        # Don't copy recurring fields - duplicate is standalone
        series_id=None,
        is_recurring_instance=False,
        recurrence_pattern=None,
        next_instance_date=None,
        recurrence_end_date=None,
    )

    db.add(duplicate_conversation)
    db.flush()  # Get duplicate conversation ID

    # Copy all questions
    for original_question in original_conversation.questions:
        duplicate_question = Question(
            conversation_id=duplicate_conversation.id,
            question_text=original_question.question_text,
            question_type=original_question.question_type,
            question_order=original_question.question_order,
            options=original_question.options,
            is_required=original_question.is_required,
        )
        db.add(duplicate_question)

    # Note: We intentionally do NOT copy invitations as per requirements

    db.commit()
    db.refresh(duplicate_conversation)

    return duplicate_conversation


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

    # Send invitation emails when activating immediately
    # (For scheduled activations, emails are sent by the scheduler)
    if conversation.state == ConversationState.ACTIVE.value and not activate_data.scheduled_activate_at:
        await send_pending_invitation_emails(conversation, db, current_user)

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

    # Note: Emails are NOT sent here. They will be sent when the conversation is activated.
    # If conversation is already active, send emails immediately
    if conversation.state == ConversationState.ACTIVE.value:
        await send_pending_invitation_emails(conversation, db, current_user)

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


@router.post("/{conversation_id}/create-follow-up", response_model=ConversationWithQuestions, status_code=status.HTTP_201_CREATED)
async def create_follow_up_conversation(
    conversation_id: UUID,
    request: CreateFollowUpRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a follow-up conversation from a closed or analyzed conversation.

    Args:
        conversation_id: Parent conversation ID
        request: Follow-up creation options
        current_user: Current authenticated user
        db: Database session

    Returns:
        Created follow-up conversation

    Raises:
        HTTPException: If parent conversation not found, user is not creator, or conversation not closed/analyzed
    """
    # Verify parent conversation exists and user is creator
    parent_conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.creator_id == current_user.id,
        Conversation.state != ConversationState.DELETED
    ).first()

    if not parent_conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Check if parent conversation is closed or analyzed
    if parent_conversation.state not in [ConversationState.CLOSED.value, ConversationState.ANALYZED.value]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only create follow-ups from closed or analyzed conversations"
        )

    # Generate unique access code
    access_code = generate_access_code()
    while db.query(Conversation).filter(Conversation.access_code == access_code).first():
        access_code = generate_access_code()

    # Handle series assignment if requested
    series_id_to_assign = None
    if request.add_to_series:
        # Check if parent already has a series
        if parent_conversation.series_id:
            # Add follow-up to parent's existing series
            series_id_to_assign = parent_conversation.series_id
        else:
            # Create new series with parent's title
            from app.models.series import Series
            series = Series(
                name=parent_conversation.title,
                description=f"Series for {parent_conversation.title} and its follow-ups",
                creator_id=current_user.id,
                organization_id=parent_conversation.organization_id,
            )
            db.add(series)
            db.flush()  # Get series ID
            # Add both parent and follow-up to series
            parent_conversation.series_id = series.id
            series_id_to_assign = series.id

    # Create follow-up conversation
    follow_up = Conversation(
        creator_id=current_user.id,
        organization_id=parent_conversation.organization_id,
        parent_conversation_id=parent_conversation.id,
        series_id=series_id_to_assign,
        title=f"{parent_conversation.title} (Follow-up)",
        description=parent_conversation.description,
        access_code=access_code,
        state=ConversationState.DRAFT.value,
    )

    # Inherit settings if requested
    if request.copy_settings:
        follow_up.participant_title = parent_conversation.participant_title
        follow_up.header_image_url = parent_conversation.header_image_url
        follow_up.anonymity_level = parent_conversation.anonymity_level
        follow_up.results_access = parent_conversation.results_access
        follow_up.max_response_length = parent_conversation.max_response_length
        follow_up.manual_close_enabled = parent_conversation.manual_close_enabled
        follow_up.time_extension_enabled = parent_conversation.time_extension_enabled
        follow_up.timezone = parent_conversation.timezone
        follow_up.invite_only = parent_conversation.invite_only
        follow_up.auto_analyze = parent_conversation.auto_analyze
    else:
        # Use defaults
        follow_up.anonymity_level = AnonymityLevel.PLATFORM_TRACKED.value
        follow_up.results_access = "participants"
        follow_up.max_response_length = 10000
        follow_up.manual_close_enabled = True
        follow_up.time_extension_enabled = True
        follow_up.timezone = "UTC"
        follow_up.invite_only = False
        follow_up.auto_analyze = False

    db.add(follow_up)
    db.flush()  # Get follow-up conversation ID

    # Copy invitations if requested
    if request.copy_invitations:
        parent_invitations = db.query(ConversationInvitation).filter(
            ConversationInvitation.conversation_id == parent_conversation.id
        ).all()

        for parent_inv in parent_invitations:
            # Only copy if invited user still exists
            if parent_inv.invited_user_id:
                new_invitation = ConversationInvitation(
                    conversation_id=follow_up.id,
                    invited_by_user_id=current_user.id,
                    invited_user_id=parent_inv.invited_user_id,
                    status="pending"
                )
                db.add(new_invitation)

    # Copy questions if requested
    if request.copy_questions:
        parent_questions = db.query(Question).filter(
            Question.conversation_id == parent_conversation.id
        ).order_by(Question.question_order).all()

        for parent_q in parent_questions:
            new_question = Question(
                conversation_id=follow_up.id,
                question_text=parent_q.question_text,
                question_type=parent_q.question_type,
                question_order=parent_q.question_order,
                options=parent_q.options,
                is_required=parent_q.is_required
            )
            db.add(new_question)

        # Mark as recurring instance if questions are copied
        follow_up.is_recurring_instance = True

    db.commit()
    db.refresh(follow_up)

    return follow_up


@router.get("/{conversation_id}/lineage", response_model=ConversationLineage)
async def get_conversation_lineage(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get conversation lineage (ancestors and descendants).

    Args:
        conversation_id: Conversation ID
        current_user: Current authenticated user
        db: Database session

    Returns:
        Conversation lineage with ancestors and descendants

    Raises:
        HTTPException: If conversation not found
    """
    # Get current conversation
    current_conversation = db.query(Conversation).options(
        joinedload(Conversation.questions),
        joinedload(Conversation.parent_conversation),
        joinedload(Conversation.follow_up_conversations)
    ).filter(
        Conversation.id == conversation_id,
        Conversation.creator_id == current_user.id,
        Conversation.state != ConversationState.DELETED
    ).first()

    if not current_conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Set is_follow_up field
    current_conversation.is_follow_up = current_conversation.parent_conversation_id is not None

    # Walk up to find all ancestors
    ancestors = []
    current = current_conversation
    while current.parent_conversation_id:
        parent = db.query(Conversation).filter(
            Conversation.id == current.parent_conversation_id,
            Conversation.state != ConversationState.DELETED
        ).first()
        if parent:
            ancestors.append(parent)
            current = parent
        else:
            break

    # Reverse to get oldest first
    ancestors.reverse()

    # Walk down to find all descendants (recursive)
    def get_all_descendants(conv_id: UUID) -> List[Conversation]:
        children = db.query(Conversation).filter(
            Conversation.parent_conversation_id == conv_id,
            Conversation.state != ConversationState.DELETED
        ).all()

        all_descendants = []
        for child in children:
            all_descendants.append(child)
            all_descendants.extend(get_all_descendants(child.id))

        return all_descendants

    descendants = get_all_descendants(conversation_id)

    return ConversationLineage(
        current=current_conversation,
        ancestors=ancestors,
        descendants=descendants
    )
