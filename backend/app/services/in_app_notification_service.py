"""In-app notification service for creating and broadcasting notifications."""

import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.models.conversation import Conversation
from app.services.sse_service import sse_service

logger = logging.getLogger(__name__)


class InAppNotificationService:
    """Service for creating and managing in-app notifications."""

    async def create_notification(
        self,
        db: Session,
        user_id: UUID,
        notification_type: str,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None,
        data: Optional[Dict[str, Any]] = None,
    ) -> Notification:
        """
        Create a notification, persist to DB, and broadcast via SSE.
        """
        notification = Notification(
            user_id=user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
            data=data,
            read=False,
            created_at=datetime.utcnow(),
        )

        db.add(notification)
        db.commit()
        db.refresh(notification)

        # Broadcast via SSE
        await self._broadcast_notification(notification)

        logger.info(f"Created notification {notification.id} for user {user_id}: {notification_type}")
        return notification

    async def _broadcast_notification(self, notification: Notification) -> None:
        """Broadcast a notification to the user via SSE."""
        notification_data = {
            "id": str(notification.id),
            "notification_type": notification.notification_type,
            "title": notification.title,
            "message": notification.message,
            "entity_type": notification.entity_type,
            "entity_id": str(notification.entity_id) if notification.entity_id else None,
            "data": notification.data,
            "read": notification.read,
            "created_at": notification.created_at.isoformat(),
        }

        await sse_service.send_to_user(
            user_id=notification.user_id,
            event_type="notification",
            data=notification_data,
        )

    # Convenience methods for specific notification types

    async def notify_response_submitted(
        self,
        db: Session,
        creator_id: UUID,
        conversation: Conversation,
        response_count: int,
    ) -> Optional[Notification]:
        """Notify conversation creator when someone submits a response."""
        action_url = f"/conversations/{conversation.id}"

        return await self.create_notification(
            db=db,
            user_id=creator_id,
            notification_type="response_submitted",
            title="New Response",
            message=f"Someone responded to \"{conversation.title}\" ({response_count} total)",
            entity_type="conversation",
            entity_id=conversation.id,
            data={"action_url": action_url},
        )

    async def notify_analysis_ready(
        self,
        db: Session,
        user_id: UUID,
        conversation: Conversation,
        analysis_id: UUID,
    ) -> Optional[Notification]:
        """Notify user when analysis is complete."""
        action_url = f"/conversations/{conversation.id}/analysis"

        return await self.create_notification(
            db=db,
            user_id=user_id,
            notification_type="analysis_ready",
            title="Analysis Ready",
            message=f"Analysis for \"{conversation.title}\" is ready to view",
            entity_type="analysis",
            entity_id=analysis_id,
            data={"action_url": action_url, "conversation_id": str(conversation.id)},
        )

    async def notify_announcement(
        self,
        db: Session,
        user_id: UUID,
        conversation: Conversation,
        announcement_message: str,
    ) -> Optional[Notification]:
        """Notify participant of an announcement."""
        action_url = f"/join/{conversation.access_code}"

        # Truncate message for title if too long
        truncated_message = (announcement_message[:100] + "...") if len(announcement_message) > 100 else announcement_message

        return await self.create_notification(
            db=db,
            user_id=user_id,
            notification_type="announcement",
            title=f"Announcement: {conversation.title}",
            message=truncated_message,
            entity_type="conversation",
            entity_id=conversation.id,
            data={"action_url": action_url},
        )

    async def notify_closing_soon(
        self,
        db: Session,
        user_id: UUID,
        conversation: Conversation,
        hours_remaining: int,
    ) -> Optional[Notification]:
        """Notify participant that conversation is closing soon."""
        action_url = f"/join/{conversation.access_code}"

        time_str = f"{hours_remaining} hour{'s' if hours_remaining != 1 else ''}"

        return await self.create_notification(
            db=db,
            user_id=user_id,
            notification_type="closing_soon",
            title="Closing Soon",
            message=f"\"{conversation.title}\" closes in {time_str}",
            entity_type="conversation",
            entity_id=conversation.id,
            data={"action_url": action_url},
        )

    async def notify_invitation(
        self,
        db: Session,
        user_id: UUID,
        conversation: Conversation,
        inviter_name: Optional[str] = None,
    ) -> Optional[Notification]:
        """Notify user when they're invited to a conversation."""
        action_url = f"/join/{conversation.access_code}"

        if inviter_name:
            message = f"{inviter_name} invited you to \"{conversation.title}\""
        else:
            message = f"You've been invited to \"{conversation.title}\""

        return await self.create_notification(
            db=db,
            user_id=user_id,
            notification_type="invitation",
            title="New Invitation",
            message=message,
            entity_type="conversation",
            entity_id=conversation.id,
            data={"action_url": action_url},
        )

    async def notify_space_invitation(
        self,
        db: Session,
        user_id: UUID,
        space_title: str,
        space_id: UUID,
        invitation_token: str,
        inviter_name: Optional[str] = None,
    ) -> Optional[Notification]:
        """Notify user when they're invited to a space."""
        action_url = f"/spaces/accept-invite/{invitation_token}"

        if inviter_name:
            message = f"{inviter_name} invited you to collaborate on \"{space_title}\""
        else:
            message = f"You've been invited to collaborate on \"{space_title}\""

        return await self.create_notification(
            db=db,
            user_id=user_id,
            notification_type="space_invitation",
            title="Space Invitation",
            message=message,
            entity_type="space",
            entity_id=space_id,
            data={"action_url": action_url},
        )

    async def notify_journal_shared(
        self,
        db: Session,
        user_id: UUID,
        journal_title: str,
        inviter_name: Optional[str] = None,
        invitation_token: Optional[str] = None,
    ) -> Optional[Notification]:
        """Notify user when a journal is shared with them."""
        action_url = f"/journals/accept-share/{invitation_token}" if invitation_token else "/journals"

        if inviter_name:
            message = f"{inviter_name} shared the journal \"{journal_title}\" with you"
        else:
            message = f"Someone shared the journal \"{journal_title}\" with you"

        return await self.create_notification(
            db=db,
            user_id=user_id,
            notification_type="invitation",
            title="Journal Shared",
            message=message,
            data={"action_url": action_url},
        )

    async def delete_by_entity(
        self,
        db: Session,
        entity_type: str,
        entity_id: UUID,
        notification_type: Optional[str] = None,
        user_id: Optional[UUID] = None,
    ) -> int:
        """
        Delete notifications associated with an entity.
        Used when the source entity is invalidated (e.g., invitation deleted).
        Broadcasts deletion via SSE for real-time UI updates.

        Args:
            db: Database session
            entity_type: Type of entity (e.g., 'conversation', 'analysis')
            entity_id: ID of the entity
            notification_type: Optionally filter by notification type
            user_id: Optionally filter by user (e.g., for invitation deletions)

        Returns:
            Number of notifications deleted
        """
        query = db.query(Notification).filter(
            Notification.entity_type == entity_type,
            Notification.entity_id == entity_id,
        )

        if notification_type:
            query = query.filter(Notification.notification_type == notification_type)

        if user_id:
            query = query.filter(Notification.user_id == user_id)

        # Get notifications before deleting (for SSE broadcast)
        notifications = query.all()

        if not notifications:
            return 0

        # Broadcast deletion to each affected user
        for notification in notifications:
            await sse_service.send_to_user(
                user_id=notification.user_id,
                event_type="notification_deleted",
                data={"id": str(notification.id)},
            )

        # Delete the notifications
        deleted_count = query.delete(synchronize_session=False)
        db.commit()

        logger.info(f"Deleted {deleted_count} notifications for {entity_type}:{entity_id}")
        return deleted_count


# Singleton instance
in_app_notification_service = InAppNotificationService()
