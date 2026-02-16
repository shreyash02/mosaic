"""Notification routes for in-app notifications and SSE streaming."""

import asyncio
import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import decode_token
from app.models.user import User
from app.models.notification import Notification
from app.services.sse_service import sse_service

logger = logging.getLogger(__name__)

router = APIRouter()

# Heartbeat interval in seconds
HEARTBEAT_INTERVAL = 30


# Response schemas
class NotificationResponse(BaseModel):
    """Response schema for a notification."""
    id: UUID
    notification_type: str
    title: str
    message: str
    entity_type: Optional[str]
    entity_id: Optional[UUID]
    data: Optional[dict]
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListResponse(BaseModel):
    """Response schema for list of notifications."""
    notifications: List[NotificationResponse]
    total: int
    has_more: bool


class UnreadCountResponse(BaseModel):
    """Response schema for unread count."""
    count: int


# SSE Endpoint
@router.get("/notifications/stream")
async def notification_stream(
    token: str = Query(..., description="Access token for authentication"),
    db: Session = Depends(get_db),
):
    """
    SSE endpoint for real-time notifications.
    Token must be passed as query param due to EventSource API limitations.
    """
    # Verify token and get user
    try:
        payload = decode_token(token)
        user_id = UUID(payload.get("sub"))
    except Exception as e:
        logger.warning(f"SSE auth failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    async def event_generator():
        """Generate SSE events for the user."""
        queue = await sse_service.connect(user_id)

        try:
            # Send connected event
            yield sse_service.format_sse_message("connected", {"status": "connected"})

            while True:
                try:
                    # Wait for message with timeout for heartbeat
                    message = await asyncio.wait_for(
                        queue.get(),
                        timeout=HEARTBEAT_INTERVAL
                    )

                    # Send the notification event
                    yield sse_service.format_sse_message(
                        message["event"],
                        message["data"]
                    )

                except asyncio.TimeoutError:
                    # Send heartbeat
                    yield sse_service.format_sse_message("heartbeat", {"timestamp": datetime.utcnow().isoformat()})

        except asyncio.CancelledError:
            logger.info(f"SSE connection cancelled for user {user_id}")
        except Exception as e:
            logger.error(f"SSE error for user {user_id}: {e}")
        finally:
            await sse_service.disconnect(user_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


# REST Endpoints
@router.get(
    "/notifications",
    response_model=NotificationListResponse,
)
async def list_notifications(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List notifications for the current user."""
    query = db.query(Notification).filter(
        Notification.user_id == current_user.id
    )

    if unread_only:
        query = query.filter(Notification.read == False)

    total = query.count()

    notifications = query.order_by(
        Notification.created_at.desc()
    ).offset(offset).limit(limit + 1).all()

    # Check if there are more
    has_more = len(notifications) > limit
    if has_more:
        notifications = notifications[:limit]

    return NotificationListResponse(
        notifications=notifications,
        total=total,
        has_more=has_more,
    )


@router.get(
    "/notifications/unread-count",
    response_model=UnreadCountResponse,
)
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get count of unread notifications."""
    count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,
    ).count()

    return UnreadCountResponse(count=count)


@router.post(
    "/notifications/{notification_id}/read",
    response_model=NotificationResponse,
)
async def mark_notification_as_read(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a single notification as read."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    if not notification.read:
        notification.read = True
        notification.read_at = datetime.utcnow()
        db.commit()
        db.refresh(notification)

    return notification


@router.post("/notifications/mark-all-read")
async def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark all notifications as read for the current user."""
    now = datetime.utcnow()

    updated_count = db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.read == False,
    ).update({
        Notification.read: True,
        Notification.read_at: now,
    })

    db.commit()

    return {"updated_count": updated_count}


@router.delete(
    "/notifications/{notification_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_notification(
    notification_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification (user can only delete their own)."""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id,
    ).first()

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )

    db.delete(notification)
    db.commit()

    return None
