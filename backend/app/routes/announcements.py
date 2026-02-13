"""Announcement routes for managing conversation announcements."""

import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.conversation import Conversation
from app.models.conversation_announcement import ConversationAnnouncement
from app.schemas.conversation import ConversationState
from app.services.announcement_service import announcement_service

logger = logging.getLogger(__name__)

router = APIRouter()


# Request/Response schemas
class CreateAnnouncementRequest(BaseModel):
    """Request to create an announcement."""
    message: str = Field(..., min_length=1, max_length=2000, description="Announcement text")


class AnnouncementResponse(BaseModel):
    """Response schema for an announcement."""
    id: UUID
    conversation_id: UUID
    message: str
    sent_at: Optional[datetime]
    recipients_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class AnnouncementListResponse(BaseModel):
    """Response schema for list of announcements."""
    announcements: List[AnnouncementResponse]


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
            detail="Only the creator can manage announcements",
        )

    return conversation


@router.post(
    "/conversations/{conversation_id}/announcements",
    response_model=AnnouncementResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_announcement(
    conversation_id: UUID,
    request: CreateAnnouncementRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create and send an announcement to participants."""
    conversation = get_conversation_as_creator(conversation_id, db, current_user)

    # Verify conversation is active
    if conversation.state != ConversationState.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Announcements can only be sent for active conversations",
        )

    # Create announcement record
    announcement = ConversationAnnouncement(
        conversation_id=conversation_id,
        message=request.message.strip(),
        created_by_id=current_user.id,
        created_at=datetime.utcnow(),
    )
    db.add(announcement)
    db.commit()
    db.refresh(announcement)

    # Send the announcement
    await announcement_service.send_announcement(announcement, conversation, db)
    db.refresh(announcement)

    return announcement


@router.get(
    "/conversations/{conversation_id}/announcements",
    response_model=AnnouncementListResponse,
)
async def list_announcements(
    conversation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all announcements for a conversation (creator view)."""
    conversation = get_conversation_as_creator(conversation_id, db, current_user)

    announcements = db.query(ConversationAnnouncement).filter(
        ConversationAnnouncement.conversation_id == conversation_id,
    ).order_by(ConversationAnnouncement.created_at.desc()).all()

    return AnnouncementListResponse(announcements=announcements)


@router.get(
    "/conversations/{conversation_id}/announcements/public",
    response_model=AnnouncementListResponse,
)
async def get_public_announcements(
    conversation_id: UUID,
    access_code: str = Query(..., description="Access code to verify permission"),
    db: Session = Depends(get_db),
):
    """Get announcements for a conversation (participant view, no auth required)."""
    # Verify access code matches the conversation
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.access_code == access_code,
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found or invalid access code",
        )

    # Only return announcements that have been sent
    announcements = db.query(ConversationAnnouncement).filter(
        ConversationAnnouncement.conversation_id == conversation_id,
        ConversationAnnouncement.sent_at.isnot(None),
    ).order_by(ConversationAnnouncement.created_at.desc()).all()

    return AnnouncementListResponse(announcements=announcements)
