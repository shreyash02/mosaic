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
from app.services.in_app_notification_service import in_app_notification_service

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
        Send notification when a user is added to a conversation.

        Args:
            user_id: The user being invited
            conversation: The conversation they're invited to
            inviter: The user who invited them (optional)
            db: Database session

        Returns:
            True if any notification was sent successfully, False otherwise
        """
        inviter_name = inviter.full_name if inviter and inviter.full_name else None
        slack_success = False

        # Send in-app notification first (always, regardless of Slack)
        try:
            await in_app_notification_service.notify_invitation(
                db=db,
                user_id=user_id,
                conversation=conversation,
                inviter_name=inviter_name,
            )
        except Exception as e:
            logger.error(f"Failed to send in-app invitation notification: {e}", exc_info=True)

        # Then try Slack notification if configured
        if not settings.slack_enabled:
            return True  # In-app was sent

        # Get the organization's Slack connection
        if not conversation.organization_id:
            logger.debug("Conversation has no organization, skipping Slack notification")
            return True  # In-app was sent

        slack_connection = db.query(SlackWorkspaceConnection).filter(
            SlackWorkspaceConnection.organization_id == conversation.organization_id,
            SlackWorkspaceConnection.is_active == True,
        ).first()

        if not slack_connection:
            logger.debug("Organization has no Slack connection")
            return True  # In-app was sent

        # Get the user being invited
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            logger.warning(f"User {user_id} not found for Slack notification")
            return True  # In-app was sent

        # Find user's Slack ID
        slack_user_id = await self._get_slack_user_id(
            user=user,
            slack_connection=slack_connection,
            db=db,
        )

        if not slack_user_id:
            logger.debug(f"Could not find Slack user for {user.email}")
            return True  # In-app was sent

        # Build the message
        join_url = f"{settings.FRONTEND_URL}/respond/{conversation.access_code}"

        blocks, fallback_text = slack_service.build_invitation_message(
            conversation_title=conversation.title,
            inviter_name=inviter_name,
            join_url=join_url,
        )

        # Send the DM
        slack_success = await slack_service.send_dm(
            encrypted_token=slack_connection.bot_access_token_encrypted,
            slack_user_id=slack_user_id,
            blocks=blocks,
            fallback_text=fallback_text,
        )

        if slack_success:
            logger.info(f"Sent Slack invitation notification to user {user_id}")
        else:
            logger.warning(f"Failed to send Slack notification to user {user_id}")

        return True  # In-app was sent

    async def notify_conversation_closing_soon(
        self,
        user_id: UUID,
        conversation: Conversation,
        db: Session,
    ) -> bool:
        """
        Send notification when a conversation is closing soon.

        Args:
            user_id: The user to notify
            conversation: The conversation that's closing
            db: Database session

        Returns:
            True if any notification was sent successfully, False otherwise
        """
        # Send in-app notification first (always, regardless of Slack)
        try:
            # Calculate hours remaining
            hours_remaining = 24  # Default
            if conversation.auto_close_at:
                from datetime import datetime
                remaining = conversation.auto_close_at - datetime.utcnow()
                hours_remaining = max(1, int(remaining.total_seconds() / 3600))

            await in_app_notification_service.notify_closing_soon(
                db=db,
                user_id=user_id,
                conversation=conversation,
                hours_remaining=hours_remaining,
            )
        except Exception as e:
            logger.error(f"Failed to send in-app closing soon notification: {e}", exc_info=True)

        # Then try Slack notification if configured
        if not settings.slack_enabled:
            return True

        # Get the organization's Slack connection
        if not conversation.organization_id:
            return True

        slack_connection = db.query(SlackWorkspaceConnection).filter(
            SlackWorkspaceConnection.organization_id == conversation.organization_id,
            SlackWorkspaceConnection.is_active == True,
        ).first()

        if not slack_connection:
            return True

        # Get the user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return True

        # Find user's Slack ID
        slack_user_id = await self._get_slack_user_id(
            user=user,
            slack_connection=slack_connection,
            db=db,
        )

        if not slack_user_id:
            return True

        # Build the message
        respond_url = f"{settings.FRONTEND_URL}/respond/{conversation.access_code}"

        blocks, fallback_text = slack_service.build_closing_warning_message(
            conversation_title=conversation.title,
            closes_at=conversation.auto_close_at,
            respond_url=respond_url,
        )

        # Send the DM
        slack_success = await slack_service.send_dm(
            encrypted_token=slack_connection.bot_access_token_encrypted,
            slack_user_id=slack_user_id,
            blocks=blocks,
            fallback_text=fallback_text,
        )

        if slack_success:
            logger.info(f"Sent Slack closing warning to user {user_id} for conversation {conversation.id}")

        return True

    async def notify_analysis_ready(
        self,
        conversation: Conversation,
        db: Session,
    ) -> int:
        """
        Send notification when analysis is ready.

        Args:
            conversation: The conversation that was analyzed
            db: Database session

        Returns:
            Number of notifications sent successfully
        """
        # Always notify the creator with in-app notification first
        try:
            from app.models.analysis import Analysis
            analysis = db.query(Analysis).filter(
                Analysis.conversation_id == conversation.id
            ).order_by(Analysis.created_at.desc()).first()

            if analysis:
                await in_app_notification_service.notify_analysis_ready(
                    db=db,
                    user_id=conversation.creator_id,
                    conversation=conversation,
                    analysis_id=analysis.id,
                )
        except Exception as e:
            logger.error(f"Failed to send in-app analysis ready notification: {e}", exc_info=True)

        # Skip Slack notifications to participants if results_access is creator_only
        if conversation.results_access == "creator_only":
            logger.debug("Skipping Slack analysis notification - results_access is creator_only")
            return 1  # In-app to creator was sent

        if not settings.slack_enabled:
            return 1

        # Get the organization's Slack connection
        if not conversation.organization_id:
            return 1

        slack_connection = db.query(SlackWorkspaceConnection).filter(
            SlackWorkspaceConnection.organization_id == conversation.organization_id,
            SlackWorkspaceConnection.is_active == True,
        ).first()

        if not slack_connection:
            return 1

        # Import here to avoid circular imports
        from app.models.response import Response

        # Get all unique participants who submitted responses
        participant_ids = db.query(Response.participant_id).filter(
            Response.conversation_id == conversation.id,
            Response.participant_id.isnot(None),
            Response.status == "submitted",
        ).distinct().all()

        participant_ids = [p[0] for p in participant_ids]

        if not participant_ids:
            return 1

        # Build the message
        results_url = f"{settings.FRONTEND_URL}/analysis/{conversation.id}"

        blocks, fallback_text = slack_service.build_analysis_ready_message(
            conversation_title=conversation.title,
            results_url=results_url,
        )

        sent_count = 1  # Creator in-app already sent
        for participant_id in participant_ids:
            user = db.query(User).filter(User.id == participant_id).first()
            if not user:
                continue

            slack_user_id = await self._get_slack_user_id(
                user=user,
                slack_connection=slack_connection,
                db=db,
            )

            if not slack_user_id:
                continue

            success = await slack_service.send_dm(
                encrypted_token=slack_connection.bot_access_token_encrypted,
                slack_user_id=slack_user_id,
                blocks=blocks,
                fallback_text=fallback_text,
            )

            if success:
                sent_count += 1
                logger.info(f"Sent Slack analysis notification to user {participant_id}")

        return sent_count

    async def notify_response_submitted(
        self,
        user_id: UUID,
        conversation: Conversation,
        db: Session,
    ) -> bool:
        """
        Send notification when a user submits a response.

        Args:
            user_id: The user who submitted
            conversation: The conversation they responded to
            db: Database session

        Returns:
            True if any notification was sent successfully, False otherwise
        """
        # Send in-app notification to the CREATOR that someone responded (always, regardless of Slack)
        try:
            # Don't notify if the creator is the one who responded
            if conversation.creator_id != user_id:
                from app.models.response import Response
                response_count = db.query(Response).filter(
                    Response.conversation_id == conversation.id,
                    Response.status == "submitted",
                ).count()

                await in_app_notification_service.notify_response_submitted(
                    db=db,
                    creator_id=conversation.creator_id,
                    conversation=conversation,
                    response_count=response_count,
                )
        except Exception as e:
            logger.error(f"Failed to send in-app response notification to creator: {e}", exc_info=True)

        # Then try Slack confirmation to the responder if configured
        if not settings.slack_enabled:
            return True

        # Get the organization's Slack connection
        if not conversation.organization_id:
            return True

        slack_connection = db.query(SlackWorkspaceConnection).filter(
            SlackWorkspaceConnection.organization_id == conversation.organization_id,
            SlackWorkspaceConnection.is_active == True,
        ).first()

        if not slack_connection:
            return True

        # Get the user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return True

        # Find user's Slack ID
        slack_user_id = await self._get_slack_user_id(
            user=user,
            slack_connection=slack_connection,
            db=db,
        )

        if not slack_user_id:
            return True

        # Build the message
        results_url = f"{settings.FRONTEND_URL}/analysis/{conversation.id}"

        blocks, fallback_text = slack_service.build_response_confirmation_message(
            conversation_title=conversation.title,
            results_url=results_url,
        )

        # Send the DM
        slack_success = await slack_service.send_dm(
            encrypted_token=slack_connection.bot_access_token_encrypted,
            slack_user_id=slack_user_id,
            blocks=blocks,
            fallback_text=fallback_text,
        )

        if slack_success:
            logger.info(f"Sent Slack response confirmation to user {user_id} for conversation {conversation.id}")

        return True

    async def notify_reminder(
        self,
        user_id: UUID,
        conversation: Conversation,
        db: Session,
    ) -> bool:
        """
        Send Slack reminder notification to a non-responder.

        Args:
            user_id: The user to notify
            conversation: The conversation
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
        respond_url = f"{settings.FRONTEND_URL}/respond/{conversation.access_code}"

        blocks, fallback_text = slack_service.build_reminder_message(
            conversation_title=conversation.title,
            respond_url=respond_url,
            closes_at=conversation.auto_close_at,
        )

        # Send the DM
        success = await slack_service.send_dm(
            encrypted_token=slack_connection.bot_access_token_encrypted,
            slack_user_id=slack_user_id,
            blocks=blocks,
            fallback_text=fallback_text,
        )

        if success:
            logger.info(f"Sent Slack reminder to user {user_id} for conversation {conversation.id}")

        return success

    async def notify_announcement(
        self,
        user_id: UUID,
        conversation: Conversation,
        message: str,
        db: Session,
    ) -> bool:
        """
        Send Slack announcement notification to a participant.

        Args:
            user_id: The user to notify
            conversation: The conversation
            message: The announcement message
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
        respond_url = f"{settings.FRONTEND_URL}/respond/{conversation.access_code}"
        from datetime import datetime
        announcement_date = datetime.utcnow()

        blocks, fallback_text = slack_service.build_announcement_message(
            conversation_title=conversation.title,
            announcement_message=message,
            respond_url=respond_url,
            announcement_date=announcement_date,
        )

        # Send the DM
        success = await slack_service.send_dm(
            encrypted_token=slack_connection.bot_access_token_encrypted,
            slack_user_id=slack_user_id,
            blocks=blocks,
            fallback_text=fallback_text,
        )

        if success:
            logger.info(f"Sent Slack announcement to user {user_id} for conversation {conversation.id}")

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

    # Channel notification methods (post to Slack channels instead of DMs)

    async def notify_channel_conversation_activated(
        self,
        conversation: Conversation,
        db: Session,
    ) -> bool:
        """
        Send Slack channel notification when conversation is activated.

        Args:
            conversation: The conversation that was activated
            db: Database session

        Returns:
            True if notification was sent successfully, False otherwise
        """
        if not settings.slack_enabled:
            return False

        # Check if channel notifications are enabled
        if not conversation.slack_channel_id or not conversation.slack_notify_on_activate:
            return False

        # Get the organization's Slack connection
        if not conversation.organization_id:
            logger.debug("Conversation has no organization, skipping channel notification")
            return False

        slack_connection = db.query(SlackWorkspaceConnection).filter(
            SlackWorkspaceConnection.organization_id == conversation.organization_id,
            SlackWorkspaceConnection.is_active == True,
        ).first()

        if not slack_connection:
            logger.debug("Organization has no Slack connection")
            return False

        # Build the message
        respond_url = f"{settings.FRONTEND_URL}/respond/{conversation.access_code}"

        blocks, fallback_text = slack_service.build_conversation_activated_message(
            conversation_title=conversation.title,
            respond_url=respond_url,
            closes_at=conversation.auto_close_at,
        )

        # Send to channel
        success = await slack_service.send_channel_message(
            encrypted_token=slack_connection.bot_access_token_encrypted,
            channel_id=conversation.slack_channel_id,
            blocks=blocks,
            fallback_text=fallback_text,
        )

        if success:
            logger.info(f"Sent Slack channel activation notification for conversation {conversation.id}")
        else:
            logger.warning(f"Failed to send Slack channel notification for conversation {conversation.id}")

        return success

    async def notify_channel_conversation_closed(
        self,
        conversation: Conversation,
        response_count: int,
        db: Session,
    ) -> bool:
        """
        Send Slack channel notification when conversation is closed.

        Args:
            conversation: The conversation that was closed
            response_count: Number of responses collected
            db: Database session

        Returns:
            True if notification was sent successfully, False otherwise
        """
        if not settings.slack_enabled:
            return False

        # Check if channel notifications are enabled
        if not conversation.slack_channel_id or not conversation.slack_notify_on_close:
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

        # Build the message
        results_url = f"{settings.FRONTEND_URL}/conversations/{conversation.id}"

        blocks, fallback_text = slack_service.build_conversation_closed_message(
            conversation_title=conversation.title,
            response_count=response_count,
            results_url=results_url,
        )

        # Send to channel
        success = await slack_service.send_channel_message(
            encrypted_token=slack_connection.bot_access_token_encrypted,
            channel_id=conversation.slack_channel_id,
            blocks=blocks,
            fallback_text=fallback_text,
        )

        if success:
            logger.info(f"Sent Slack channel closed notification for conversation {conversation.id}")

        return success

    async def notify_channel_analysis_ready(
        self,
        conversation: Conversation,
        db: Session,
    ) -> bool:
        """
        Send Slack channel notification when analysis is complete.

        Args:
            conversation: The conversation that was analyzed
            db: Database session

        Returns:
            True if notification was sent successfully, False otherwise
        """
        if not settings.slack_enabled:
            return False

        # Check if channel notifications are enabled
        if not conversation.slack_channel_id or not conversation.slack_notify_on_analysis:
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

        # Get response count
        from app.models.response import Response
        response_count = db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.status == "submitted",
        ).count()

        # Build the message
        results_url = f"{settings.FRONTEND_URL}/analysis/{conversation.id}"

        blocks, fallback_text = slack_service.build_channel_analysis_complete_message(
            conversation_title=conversation.title,
            results_url=results_url,
            response_count=response_count,
        )

        # Send to channel
        success = await slack_service.send_channel_message(
            encrypted_token=slack_connection.bot_access_token_encrypted,
            channel_id=conversation.slack_channel_id,
            blocks=blocks,
            fallback_text=fallback_text,
        )

        if success:
            logger.info(f"Sent Slack channel analysis notification for conversation {conversation.id}")

        return success


# Singleton instance
notification_service = NotificationService()
