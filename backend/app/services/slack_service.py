"""Slack integration service for sending DMs and managing connections."""

import logging
from typing import Optional, Tuple, List
from datetime import datetime
import httpx

from app.core.config import settings
from app.core.encryption import encrypt_token, decrypt_token

logger = logging.getLogger(__name__)

# Slack API endpoints
SLACK_OAUTH_URL = "https://slack.com/api/oauth.v2.access"
SLACK_USERS_LOOKUP_URL = "https://slack.com/api/users.lookupByEmail"
SLACK_CONVERSATIONS_OPEN_URL = "https://slack.com/api/conversations.open"
SLACK_CONVERSATIONS_LIST_URL = "https://slack.com/api/conversations.list"
SLACK_CHAT_POST_URL = "https://slack.com/api/chat.postMessage"
SLACK_AUTH_TEST_URL = "https://slack.com/api/auth.test"


class SlackService:
    """Service for Slack API interactions."""

    def __init__(self):
        self.enabled = settings.slack_enabled
        self.client_id = settings.SLACK_CLIENT_ID
        self.client_secret = settings.SLACK_CLIENT_SECRET
        self.bot_scopes = settings.SLACK_BOT_SCOPES

        if self.enabled:
            logger.info("Slack service initialized")
        else:
            logger.info("Slack service disabled (credentials not configured)")

    def get_oauth_url(self, redirect_uri: str, state: str) -> str:
        """Generate Slack OAuth authorization URL.

        Args:
            redirect_uri: The callback URL after authorization
            state: CSRF state parameter

        Returns:
            The full OAuth authorization URL
        """
        return (
            f"https://slack.com/oauth/v2/authorize"
            f"?client_id={self.client_id}"
            f"&scope={self.bot_scopes}"
            f"&redirect_uri={redirect_uri}"
            f"&state={state}"
        )

    def get_user_oauth_url(self, redirect_uri: str, state: str) -> str:
        """Generate Slack OAuth URL for user identity linking.

        Args:
            redirect_uri: The callback URL after authorization
            state: CSRF state parameter

        Returns:
            The full OAuth authorization URL with identity scopes
        """
        return (
            f"https://slack.com/oauth/v2/authorize"
            f"?client_id={self.client_id}"
            f"&user_scope=identity.basic,identity.email"
            f"&redirect_uri={redirect_uri}"
            f"&state={state}"
        )

    async def exchange_code_for_token(
        self, code: str, redirect_uri: str
    ) -> Tuple[bool, dict]:
        """Exchange OAuth code for access token.

        Args:
            code: The authorization code from Slack
            redirect_uri: The redirect URI used in authorization

        Returns:
            Tuple of (success, data). Data contains token info on success,
            error info on failure.
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                SLACK_OAUTH_URL,
                data={
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
            )
            data = response.json()

            if not data.get("ok"):
                logger.error(f"Slack OAuth error: {data.get('error')}")
                return False, {"error": data.get("error", "Unknown error")}

            return True, data

    async def verify_token(self, encrypted_token: str) -> bool:
        """Verify that a stored token is still valid.

        Args:
            encrypted_token: The encrypted bot access token

        Returns:
            True if token is valid, False otherwise
        """
        try:
            token = decrypt_token(encrypted_token)
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    SLACK_AUTH_TEST_URL,
                    headers={"Authorization": f"Bearer {token}"},
                )
                data = response.json()
                return data.get("ok", False)
        except Exception as e:
            logger.error(f"Error verifying Slack token: {e}")
            return False

    async def lookup_user_by_email(
        self, encrypted_token: str, email: str
    ) -> Optional[str]:
        """Find Slack user ID by email address.

        Args:
            encrypted_token: The encrypted bot access token
            email: The email address to look up

        Returns:
            Slack user ID if found, None otherwise
        """
        try:
            token = decrypt_token(encrypted_token)
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    SLACK_USERS_LOOKUP_URL,
                    headers={"Authorization": f"Bearer {token}"},
                    params={"email": email},
                )
                data = response.json()

                if data.get("ok"):
                    return data.get("user", {}).get("id")
                else:
                    logger.debug(f"User not found in Slack for email {email}: {data.get('error')}")
                    return None
        except Exception as e:
            logger.error(f"Error looking up Slack user by email: {e}")
            return None

    async def send_dm(
        self,
        encrypted_token: str,
        slack_user_id: str,
        blocks: List[dict],
        fallback_text: str,
    ) -> bool:
        """Send a direct message to a Slack user.

        Args:
            encrypted_token: The encrypted bot access token
            slack_user_id: The Slack user ID to message
            blocks: Slack Block Kit message blocks
            fallback_text: Plain text fallback for notifications

        Returns:
            True if message was sent successfully, False otherwise
        """
        try:
            token = decrypt_token(encrypted_token)
            async with httpx.AsyncClient() as client:
                # First, open a DM channel with the user
                open_response = await client.post(
                    SLACK_CONVERSATIONS_OPEN_URL,
                    headers={"Authorization": f"Bearer {token}"},
                    json={"users": slack_user_id},
                )
                open_data = open_response.json()

                if not open_data.get("ok"):
                    logger.error(f"Failed to open DM channel: {open_data.get('error')}")
                    return False

                channel_id = open_data.get("channel", {}).get("id")

                # Send the message
                message_response = await client.post(
                    SLACK_CHAT_POST_URL,
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "channel": channel_id,
                        "blocks": blocks,
                        "text": fallback_text,
                    },
                )
                message_data = message_response.json()

                if message_data.get("ok"):
                    logger.info(f"Slack DM sent to user {slack_user_id}")
                    return True
                else:
                    logger.error(f"Failed to send Slack DM: {message_data.get('error')}")
                    return False

        except Exception as e:
            logger.error(f"Error sending Slack DM: {e}", exc_info=True)
            return False

    async def list_channels(
        self,
        encrypted_token: str,
        include_private: bool = True,
    ) -> List[dict]:
        """List channels the bot has access to.

        Args:
            encrypted_token: The encrypted bot access token
            include_private: Whether to include private channels

        Returns:
            List of channel dicts with id, name, is_private
        """
        channels = []
        try:
            token = decrypt_token(encrypted_token)

            # Build channel types param
            types = "public_channel"
            if include_private:
                types += ",private_channel"

            cursor = None
            async with httpx.AsyncClient() as client:
                while True:
                    params = {
                        "types": types,
                        "exclude_archived": "true",
                        "limit": 200,
                    }
                    if cursor:
                        params["cursor"] = cursor

                    response = await client.get(
                        SLACK_CONVERSATIONS_LIST_URL,
                        headers={"Authorization": f"Bearer {token}"},
                        params=params,
                    )
                    data = response.json()

                    if not data.get("ok"):
                        logger.error(f"Failed to list Slack channels: {data.get('error')}")
                        break

                    for channel in data.get("channels", []):
                        channels.append({
                            "id": channel.get("id"),
                            "name": channel.get("name"),
                            "is_private": channel.get("is_private", False),
                        })

                    # Handle pagination
                    cursor = data.get("response_metadata", {}).get("next_cursor")
                    if not cursor:
                        break

            # Sort channels alphabetically by name
            channels.sort(key=lambda c: c["name"].lower())
            return channels

        except Exception as e:
            logger.error(f"Error listing Slack channels: {e}", exc_info=True)
            return []

    async def send_channel_message(
        self,
        encrypted_token: str,
        channel_id: str,
        blocks: List[dict],
        fallback_text: str,
    ) -> bool:
        """Send a message to a Slack channel.

        Args:
            encrypted_token: The encrypted bot access token
            channel_id: The Slack channel ID to post to
            blocks: Slack Block Kit message blocks
            fallback_text: Plain text fallback for notifications

        Returns:
            True if message was sent successfully, False otherwise
        """
        try:
            token = decrypt_token(encrypted_token)
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    SLACK_CHAT_POST_URL,
                    headers={"Authorization": f"Bearer {token}"},
                    json={
                        "channel": channel_id,
                        "blocks": blocks,
                        "text": fallback_text,
                    },
                )
                data = response.json()

                if data.get("ok"):
                    logger.info(f"Slack message sent to channel {channel_id}")
                    return True
                else:
                    logger.error(f"Failed to send Slack channel message: {data.get('error')}")
                    return False

        except Exception as e:
            logger.error(f"Error sending Slack channel message: {e}", exc_info=True)
            return False

    def build_invitation_message(
        self,
        conversation_title: str,
        inviter_name: Optional[str],
        join_url: str,
    ) -> Tuple[List[dict], str]:
        """Build Slack Block Kit message for conversation invitation.

        Args:
            conversation_title: Title of the conversation
            inviter_name: Name of the person who invited them
            join_url: URL to join the conversation

        Returns:
            Tuple of (blocks, fallback_text)
        """
        inviter_text = f" by {inviter_name}" if inviter_name else ""
        fallback_text = f"You've been invited{inviter_text} to: {conversation_title}"

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*You've been invited{inviter_text} to a conversation*",
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{conversation_title}*",
                },
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Join Conversation"},
                        "url": join_url,
                        "style": "primary",
                    }
                ],
            },
        ]

        return blocks, fallback_text

    def build_closing_warning_message(
        self,
        conversation_title: str,
        closes_at: datetime,
        respond_url: str,
    ) -> Tuple[List[dict], str]:
        """Build Slack Block Kit message for closing warning.

        Args:
            conversation_title: Title of the conversation
            closes_at: When the conversation closes
            respond_url: URL to respond to the conversation

        Returns:
            Tuple of (blocks, fallback_text)
        """
        # Calculate time remaining
        now = datetime.utcnow()
        delta = closes_at - now
        minutes_remaining = int(delta.total_seconds() / 60)

        if minutes_remaining < 60:
            time_text = f"{minutes_remaining} minutes"
        else:
            hours = minutes_remaining // 60
            time_text = f"{hours} hour{'s' if hours != 1 else ''}"

        fallback_text = f"Reminder: \"{conversation_title}\" closes in {time_text}. You haven't responded yet."

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":clock3: *Reminder: Conversation closing soon*",
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{conversation_title}*\nCloses in {time_text}",
                },
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "You haven't responded yet.",
                    }
                ],
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Respond Now"},
                        "url": respond_url,
                        "style": "primary",
                    }
                ],
            },
        ]

        return blocks, fallback_text

    def build_analysis_ready_message(
        self,
        conversation_title: str,
        results_url: str,
    ) -> Tuple[List[dict], str]:
        """Build Slack Block Kit message for analysis completion.

        Args:
            conversation_title: Title of the conversation
            results_url: URL to view analysis results

        Returns:
            Tuple of (blocks, fallback_text)
        """
        fallback_text = f"Analysis is ready for \"{conversation_title}\"!"

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":bar_chart: *Analysis Ready!*",
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"The analysis for *{conversation_title}* is complete. See what insights emerged from the conversation.",
                },
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "View Analysis"},
                        "url": results_url,
                        "style": "primary",
                    }
                ],
            },
        ]

        return blocks, fallback_text

    def build_response_confirmation_message(
        self,
        conversation_title: str,
        results_url: str,
    ) -> Tuple[List[dict], str]:
        """Build Slack Block Kit message for response submission confirmation.

        Args:
            conversation_title: Title of the conversation
            results_url: URL to view analysis results

        Returns:
            Tuple of (blocks, fallback_text)
        """
        fallback_text = f"Thanks for submitting your response to \"{conversation_title}\"!"

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":white_check_mark: *Thanks for your response!*",
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"Your response to *{conversation_title}* has been received.",
                },
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "Once the conversation closes and analysis is complete, you can view the results below.",
                    }
                ],
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "View Results"},
                        "url": results_url,
                    }
                ],
            },
        ]

        return blocks, fallback_text

    def build_reminder_message(
        self,
        conversation_title: str,
        respond_url: str,
        closes_at: Optional[datetime] = None,
    ) -> Tuple[List[dict], str]:
        """Build Slack Block Kit message for reminder notification.

        Args:
            conversation_title: Title of the conversation
            respond_url: URL to respond to the conversation
            closes_at: Optional closing time

        Returns:
            Tuple of (blocks, fallback_text)
        """
        fallback_text = f"Reminder: Your response is requested for \"{conversation_title}\""

        deadline_text = ""
        if closes_at:
            now = datetime.utcnow()
            delta = closes_at - now
            minutes_remaining = int(delta.total_seconds() / 60)

            if minutes_remaining < 60:
                deadline_text = f"\nDeadline: {minutes_remaining} minutes remaining"
            elif minutes_remaining < 1440:  # Less than a day
                hours = minutes_remaining // 60
                deadline_text = f"\nDeadline: {hours} hour{'s' if hours != 1 else ''} remaining"
            else:
                days = minutes_remaining // 1440
                deadline_text = f"\nDeadline: {days} day{'s' if days != 1 else ''} remaining"

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":bell: *Reminder: Your response is requested*",
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*{conversation_title}*{deadline_text}",
                },
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": "The creator of this conversation has sent you a reminder to participate.",
                    }
                ],
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Respond Now"},
                        "url": respond_url,
                        "style": "primary",
                    }
                ],
            },
        ]

        return blocks, fallback_text

    def build_announcement_message(
        self,
        conversation_title: str,
        announcement_message: str,
        respond_url: str,
        announcement_date: datetime,
    ) -> Tuple[List[dict], str]:
        """Build Slack Block Kit message for announcement.

        Args:
            conversation_title: Title of the conversation
            announcement_message: The announcement text
            respond_url: URL to the conversation
            announcement_date: When the announcement was created

        Returns:
            Tuple of (blocks, fallback_text)
        """
        fallback_text = f"Announcement for \"{conversation_title}\": {announcement_message[:100]}..."

        # Format date
        date_formatted = announcement_date.strftime("%B %d, %Y at %I:%M %p UTC")

        # Truncate message if too long for Slack
        display_message = announcement_message
        if len(display_message) > 2000:
            display_message = display_message[:1997] + "..."

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":mega: *Announcement*",
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"From *{conversation_title}*:",
                },
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f">{display_message.replace(chr(10), chr(10) + '>')}",
                },
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"Posted on {date_formatted}",
                    }
                ],
            },
            {
                "type": "actions",
                "elements": [
                    {
                        "type": "button",
                        "text": {"type": "plain_text", "text": "Go to Conversation"},
                        "url": respond_url,
                    }
                ],
            },
        ]

        return blocks, fallback_text

    def build_conversation_activated_message(
        self,
        conversation_title: str,
        respond_url: str,
        closes_at: Optional[datetime] = None,
    ) -> Tuple[List[dict], str]:
        """Build Slack Block Kit message for conversation activation announcement.

        Args:
            conversation_title: Title of the conversation
            respond_url: URL to respond to the conversation
            closes_at: Optional closing time

        Returns:
            Tuple of (blocks, fallback_text)
        """
        deadline_text = ""
        if closes_at:
            # Format as Slack timestamp for auto-localization
            unix_ts = int(closes_at.timestamp())
            deadline_text = f"\nCloses <!date^{unix_ts}^{{date_short_pretty}} at {{time}}|{closes_at.strftime('%B %d at %I:%M %p UTC')}>"

        fallback_text = f"New conversation open: {conversation_title}"

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":speech_balloon: *New Conversation Open*\n\n*{conversation_title}*{deadline_text}\n\n<{respond_url}|Respond Now>",
                },
            },
        ]

        return blocks, fallback_text

    def build_conversation_closed_message(
        self,
        conversation_title: str,
        response_count: int,
        results_url: str,
    ) -> Tuple[List[dict], str]:
        """Build Slack Block Kit message for conversation closed announcement.

        Args:
            conversation_title: Title of the conversation
            response_count: Number of responses collected
            results_url: URL to view results

        Returns:
            Tuple of (blocks, fallback_text)
        """
        response_text = f"{response_count} response{'s' if response_count != 1 else ''}"
        fallback_text = f"Conversation closed: {conversation_title} ({response_text} collected)"

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":checkered_flag: *Conversation Closed*\n\n*{conversation_title}*\n{response_text} collected\n\n<{results_url}|View Results>",
                },
            },
        ]

        return blocks, fallback_text

    def build_channel_analysis_complete_message(
        self,
        conversation_title: str,
        results_url: str,
        response_count: int,
    ) -> Tuple[List[dict], str]:
        """Build Slack Block Kit message for analysis complete announcement.

        Args:
            conversation_title: Title of the conversation
            results_url: URL to view analysis results
            response_count: Number of responses analyzed

        Returns:
            Tuple of (blocks, fallback_text)
        """
        response_text = f"{response_count} response{'s' if response_count != 1 else ''}"
        fallback_text = f"Analysis complete: {conversation_title}"

        blocks = [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f":bar_chart: *Analysis Complete*\n\nThe analysis for *{conversation_title}* is ready.\n{response_text} analyzed.\n\n<{results_url}|View Analysis>",
                },
            },
        ]

        return blocks, fallback_text


# Singleton instance
slack_service = SlackService()
