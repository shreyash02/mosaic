"""Notification service for orchestrating email and Slack notifications."""

import logging
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.conversation import Conversation
from app.models.slack_workspace_connection import SlackWorkspaceConnection
from app.models.user_slack_connection import UserSlackConnection
from app.services.slack_service import slack_service

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for orchestrating notifications across channels (email, Slack)."""

    async def notify_user_added_to_conversation(
        self,
        user_id: UUID,
        conversation: Conversation,
        inviter: Optional[User],
        db: Session,
    ) -> bool:
        """
        Send Slack notification when a user is added to a conversation.

        Args:
            user_id: The user being invited
            conversation: The conversation they're invited to
            inviter: The user who invited them (optional)
            db: Database session

        Returns:
            True if notification was sent successfully, False otherwise
        """
        if not settings.slack_enabled:
            return False

        # Get the organization's Slack connection
        if not conversation.organization_id:
            logger.debug("Conversation has no organization, skipping Slack notification")
            return False

        slack_connection = db.query(SlackWorkspaceConnection).filter(
            SlackWorkspaceConnection.organization_id == conversation.organization_id,
            SlackWorkspaceConnection.is_active == True,
        ).first()

        if not slack_connection:
            logger.debug("Organization has no Slack connection")
            return False

        # Get the user being invited
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"User {user_id} not found for Slack notification")
            return False

        # Find user's Slack ID
        slack_user_id = await self._get_slack_user_id(
            user=user,
            slack_connection=slack_connection,
            db=db,
        )

        if not slack_user_id:
            logger.debug(f"Could not find Slack user for {user.email}")
            return False

        # Build the message
        join_url = f"{settings.FRONTEND_URL}/join/{conversation.access_code}"
        inviter_name = inviter.full_name if inviter and inviter.full_name else None

        blocks, fallback_text = slack_service.build_invitation_message(
            conversation_title=conversation.title,
            inviter_name=inviter_name,
            join_url=join_url,
        )

        # Send the DM
        success = await slack_service.send_dm(
            encrypted_token=slack_connection.bot_access_token_encrypted,
            slack_user_id=slack_user_id,
            blocks=blocks,
            fallback_text=fallback_text,
        )

        if success:
            logger.info(f"Sent Slack invitation notification to user {user_id}")
        else:
            logger.warning(f"Failed to send Slack notification to user {user_id}")

        return success

    async def notify_conversation_closing_soon(
        self,
        user_id: UUID,
        conversation: Conversation,
        db: Session,
    ) -> bool:
        """
        Send Slack notification when a conversation is closing soon.

        Args:
            user_id: The user to notify
            conversation: The conversation that's closing
            db: Database session

        Returns:
            True if notification was sent successfully, False otherwise
        """
        if not settings.slack_enabled:
            return False

        # Get the organization's Slack connection
        if not conversation.organization_id:
            return False

        slack_connection = db.query(SlackWorkspaceConnection).filter(
            SlackWorkspaceConnection.organization_id == conversation.organization_id,
            SlackWorkspaceConnection.is_active == True,
        ).first()

        if not slack_connection:
            return False

        # Get the user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        # Find user's Slack ID
        slack_user_id = await self._get_slack_user_id(
            user=user,
            slack_connection=slack_connection,
            db=db,
        )

        if not slack_user_id:
            return False

        # Build the message
        respond_url = f"{settings.FRONTEND_URL}/join/{conversation.access_code}"

        blocks, fallback_text = slack_service.build_closing_warning_message(
            conversation_title=conversation.title,
            closes_at=conversation.auto_close_at,
            respond_url=respond_url,
        )

        # Send the DM
        success = await slack_service.send_dm(
            encrypted_token=slack_connection.bot_access_token_encrypted,
            slack_user_id=slack_user_id,
            blocks=blocks,
            fallback_text=fallback_text,
        )

        if success:
            logger.info(f"Sent Slack closing warning to user {user_id} for conversation {conversation.id}")

        return success

    async def _get_slack_user_id(
        self,
        user: User,
        slack_connection: SlackWorkspaceConnection,
        db: Session,
    ) -> Optional[str]:
        """
        Get Slack user ID for a user, preferring linked account over email lookup.

        Args:
            user: The user to find
            slack_connection: The Slack workspace connection
            db: Database session

        Returns:
            Slack user ID if found, None otherwise
        """
        # First, check if user has a linked Slack account for this workspace
        user_slack = db.query(UserSlackConnection).filter(
            UserSlackConnection.user_id == user.id,
            UserSlackConnection.slack_team_id == slack_connection.slack_team_id,
            UserSlackConnection.is_active == True,
        ).first()

        if user_slack:
            return user_slack.slack_user_id

        # Fall back to email lookup
        return await slack_service.lookup_user_by_email(
            encrypted_token=slack_connection.bot_access_token_encrypted,
            email=user.email,
        )


# Singleton instance
notification_service = NotificationService()
