"""Reminder service for sending reminder notifications to non-responders."""

import logging
from datetime import datetime
from typing import List
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.conversation import Conversation
from app.models.conversation_invitation import ConversationInvitation
from app.models.conversation_reminder import ConversationReminder
from app.models.response import Response
from app.models.user import User
from app.services.email_service import email_service
from app.services.notification_service import notification_service
from app.utils.email_preferences import should_send_email

logger = logging.getLogger(__name__)


class ReminderService:
    """Service for managing conversation reminders."""

    def get_non_responders(
        self,
        conversation: Conversation,
        db: Session,
    ) -> List[ConversationInvitation]:
        """
        Get invitations for users who haven't responded to a conversation.

        Args:
            conversation: The conversation to check
            db: Database session

        Returns:
            List of invitations for non-responders
        """
        # Get all invitations for this conversation
        invitations = db.query(ConversationInvitation).filter(
            ConversationInvitation.conversation_id == conversation.id,
        ).all()

        if not invitations:
            return []

        # Get users who have already responded
        responded_user_ids = set(
            r.participant_id for r in db.query(Response).filter(
                Response.conversation_id == conversation.id,
                Response.participant_id.isnot(None),
                Response.status == "submitted",
            ).all()
        )

        # Filter to non-responders
        non_responders = []
        for invitation in invitations:
            if invitation.invited_user_id and invitation.invited_user_id in responded_user_ids:
                continue
            non_responders.append(invitation)

        return non_responders

    def get_non_responders_count(
        self,
        conversation: Conversation,
        db: Session,
    ) -> dict:
        """
        Get counts for responders vs non-responders.

        Args:
            conversation: The conversation to check
            db: Database session

        Returns:
            Dict with total_invitations, responded, non_responders counts
        """
        invitations = db.query(ConversationInvitation).filter(
            ConversationInvitation.conversation_id == conversation.id,
        ).all()

        total = len(invitations)

        # Get users who have responded
        responded_user_ids = set(
            r.participant_id for r in db.query(Response).filter(
                Response.conversation_id == conversation.id,
                Response.participant_id.isnot(None),
                Response.status == "submitted",
            ).all()
        )

        # Count responders among invitees
        responded_count = sum(
            1 for inv in invitations
            if inv.invited_user_id and inv.invited_user_id in responded_user_ids
        )

        return {
            "total_invitations": total,
            "responded": responded_count,
            "non_responders": total - responded_count,
        }

    async def send_reminders(
        self,
        reminder: ConversationReminder,
        conversation: Conversation,
        db: Session,
    ) -> int:
        """
        Send reminders to all non-responders.

        Args:
            reminder: The reminder record
            conversation: The conversation
            db: Database session

        Returns:
            Number of reminders sent
        """
        non_responders = self.get_non_responders(conversation, db)

        if not non_responders:
            logger.info(f"No non-responders for conversation {conversation.id}")
            reminder.status = "sent"
            reminder.sent_at = datetime.utcnow()
            reminder.recipients_count = 0
            db.commit()
            return 0

        respond_url = f"{settings.FRONTEND_URL}/join/{conversation.access_code}"
        sent_count = 0

        for invitation in non_responders:
            slack_sent = False
            email_sent = False

            # Try Slack notification for registered users (if org has Slack)
            if invitation.invited_user_id and conversation.organization_id:
                try:
                    slack_sent = await notification_service.notify_reminder(
                        user_id=invitation.invited_user_id,
                        conversation=conversation,
                        db=db,
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to send Slack reminder to user {invitation.invited_user_id}: {e}",
                        exc_info=True
                    )

            # Send email (respects closing_reminders preference)
            if invitation.email and should_send_email(db, invitation.email, "closing_reminders"):
                try:
                    email_sent = await email_service.send_reminder_email(
                        to_email=invitation.email,
                        conversation_title=conversation.title,
                        respond_url=respond_url,
                        closes_at=conversation.auto_close_at,
                    )
                except Exception as e:
                    logger.error(
                        f"Failed to send reminder email to {invitation.email}: {e}",
                        exc_info=True
                    )

            if slack_sent or email_sent:
                sent_count += 1

        # Update reminder record
        reminder.status = "sent"
        reminder.sent_at = datetime.utcnow()
        reminder.recipients_count = sent_count
        db.commit()

        logger.info(f"Sent {sent_count} reminders for conversation {conversation.id}")
        return sent_count


# Singleton instance
reminder_service = ReminderService()
