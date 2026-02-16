"""Announcement service for broadcasting messages to participants."""

import logging
from datetime import datetime
from typing import List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.conversation import Conversation
from app.models.conversation_invitation import ConversationInvitation
from app.models.conversation_announcement import ConversationAnnouncement
from app.models.response import Response
from app.models.user import User
from app.services.email_service import email_service
from app.services.notification_service import notification_service
from app.services.in_app_notification_service import in_app_notification_service
from app.utils.email_preferences import should_send_email

logger = logging.getLogger(__name__)


class AnnouncementService:
    """Service for managing conversation announcements."""

    def get_recipients(
        self,
        conversation: Conversation,
        db: Session,
    ) -> List[Tuple[str, UUID | None]]:
        """
        Get announcement recipients based on conversation type.

        For invite_only=True: All invitees
        For invite_only=False: Users who have responded (have participant_id)

        Args:
            conversation: The conversation
            db: Database session

        Returns:
            List of tuples (email, user_id or None)
        """
        recipients = []

        if conversation.invite_only:
            # Get all invitees
            invitations = db.query(ConversationInvitation).filter(
                ConversationInvitation.conversation_id == conversation.id,
            ).all()

            for inv in invitations:
                recipients.append((inv.email, inv.invited_user_id))
        else:
            # Get users who have responded
            responses = db.query(Response).filter(
                Response.conversation_id == conversation.id,
                Response.participant_id.isnot(None),
                Response.status == "submitted",
            ).all()

            # Get unique participant IDs
            participant_ids = set(r.participant_id for r in responses)

            for pid in participant_ids:
                user = db.query(User).filter(User.id == pid).first()
                if user and user.email:
                    recipients.append((user.email, user.id))

        return recipients

    async def send_announcement(
        self,
        announcement: ConversationAnnouncement,
        conversation: Conversation,
        db: Session,
    ) -> int:
        """
        Send announcement to all recipients.

        Args:
            announcement: The announcement record
            conversation: The conversation
            db: Database session

        Returns:
            Number of announcements sent
        """
        recipients = self.get_recipients(conversation, db)

        if not recipients:
            logger.info(f"No recipients for announcement in conversation {conversation.id}")
            announcement.sent_at = datetime.utcnow()
            announcement.recipients_count = 0
            db.commit()
            return 0

        respond_url = f"{settings.FRONTEND_URL}/join/{conversation.access_code}"
        sent_count = 0

        for email, user_id in recipients:
            slack_sent = False
            email_sent = False
            in_app_sent = False

            # Try Slack notification for registered users (if org has Slack)
            if user_id and conversation.organization_id:
                try:
                    slack_sent = await notification_service.notify_announcement(
                        user_id=user_id,
                        conversation=conversation,
                        message=announcement.message,
                        db=db,
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to send Slack announcement to user {user_id}: {e}",
                        exc_info=True
                    )

            # Send in-app notification for registered users
            if user_id:
                try:
                    await in_app_notification_service.notify_announcement(
                        db=db,
                        user_id=user_id,
                        conversation=conversation,
                        announcement_message=announcement.message,
                    )
                    in_app_sent = True
                except Exception as e:
                    logger.error(
                        f"Failed to send in-app announcement to user {user_id}: {e}",
                        exc_info=True
                    )

            # Send email (respects announcements preference)
            if email and should_send_email(db, email, "announcements"):
                try:
                    email_sent = await email_service.send_announcement_email(
                        to_email=email,
                        conversation_title=conversation.title,
                        announcement_message=announcement.message,
                        respond_url=respond_url,
                        announcement_date=announcement.created_at,
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to send announcement email to {email}: {e}",
                        exc_info=True
                    )

            if slack_sent or email_sent or in_app_sent:
                sent_count += 1

        # Update announcement record
        announcement.sent_at = datetime.utcnow()
        announcement.recipients_count = sent_count
        db.commit()

        logger.info(f"Sent announcement to {sent_count} recipients for conversation {conversation.id}")
        return sent_count


# Singleton instance
announcement_service = AnnouncementService()
