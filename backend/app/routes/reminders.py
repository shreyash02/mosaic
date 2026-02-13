"""Reminder routes for managing conversation reminders."""

import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.conversation_reminder import ConversationReminder
from app.schemas.conversation import ConversationState
from app.services.reminder_service import reminder_service

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response schemas
class CreateReminderRequest(BaseModel):
    """Request to create a reminder."""
    scheduled_at: Optional[datetime] = Field(None, description="When to send (UTC). Null = immediate.")


class ReminderResponse(BaseModel):
    """Response schema for a reminder."""
    id: UUID
    conversation_id: UUID
    reminder_type: str
    scheduled_at: Optional[datetime]
    status: str
    sent_at: Optional[datetime]
    recipients_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ReminderListResponse(BaseModel):
    """Response schema for list of reminders."""
    reminders: List[ReminderResponse]


class NonRespondersCountResponse(BaseModel):
    """Response schema for non-responders count."""
    conversation_id: UUID
    total_invitations: int
    responded: int
    non_responders: int


def get_conversation_as_creator(
    conversation_id: UUID,
    db: Session,
    current_user: User,
) -> Conversation:
    """Get conversation and verify user is the creator."""
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    if conversation.creator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the creator can manage reminders",
        )

    return conversation


@router.get(
    "/conversations/{conversation_id}/non-responders",
    response_model=NonRespondersCountResponse,
)
async def get_non_responders_count(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get count of non-responders for a conversation."""
    conversation = get_conversation_as_creator(conversation_id, db, current_user)

    if not conversation.invite_only:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Non-responder tracking is only available for invite-only conversations",
        )

    counts = reminder_service.get_non_responders_count(conversation, db)

    return NonRespondersCountResponse(
        conversation_id=conversation_id,
        **counts,
    )


@router.post(
    "/conversations/{conversation_id}/reminders",
    response_model=ReminderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_reminder(
    conversation_id: UUID,
    request: CreateReminderRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new reminder (immediate or scheduled)."""
    conversation = get_conversation_as_creator(conversation_id, db, current_user)

    # Verify conversation is active
    if conversation.state != ConversationState.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reminders can only be sent for active conversations",
        )

    if not conversation.invite_only:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reminders are only available for invite-only conversations",
        )

    # Determine reminder type
    is_scheduled = request.scheduled_at is not None
    reminder_type = "scheduled" if is_scheduled else "manual"

    # Validate scheduled time
    if is_scheduled:
        if request.scheduled_at <= datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled time must be in the future",
            )
        # Don't allow scheduling past conversation close time
        if conversation.auto_close_at and request.scheduled_at >= conversation.auto_close_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled time must be before conversation closes",
            )

    # Create reminder record
    reminder = ConversationReminder(
        conversation_id=conversation_id,
        reminder_type=reminder_type,
        scheduled_at=request.scheduled_at,
        status="pending",
        created_by_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    # If immediate, send now
    if not is_scheduled:
        await reminder_service.send_reminders(reminder, conversation, db)
        db.refresh(reminder)

    return reminder


@router.get(
    "/conversations/{conversation_id}/reminders",
    response_model=ReminderListResponse,
)
async def list_reminders(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all reminders for a conversation."""
    conversation = get_conversation_as_creator(conversation_id, db, current_user)

    reminders = db.query(ConversationReminder).filter(
        ConversationReminder.conversation_id == conversation_id,
    ).order_by(ConversationReminder.created_at.desc()).all()

    return ReminderListResponse(reminders=reminders)


@router.delete(
    "/conversations/{conversation_id}/reminders/{reminder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def cancel_reminder(
    conversation_id: UUID,
    reminder_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a scheduled reminder."""
    conversation = get_conversation_as_creator(conversation_id, db, current_user)

    reminder = db.query(ConversationReminder).filter(
        ConversationReminder.id == reminder_id,
        ConversationReminder.conversation_id == conversation_id,
    ).first()

    if not reminder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reminder not found",
        )

    if reminder.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending reminders can be cancelled",
        )

    reminder.status = "cancelled"
    db.commit()
