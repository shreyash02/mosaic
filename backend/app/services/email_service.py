"""Email service for sending invitations and notifications."""

import logging
from datetime import datetime
from typing import Optional
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending emails via SMTP."""
    
    def __init__(self):
        self.enabled = settings.EMAIL_ENABLED
        if self.enabled and settings.SMTP_USER and settings.SMTP_PASSWORD:
            try:
                # Format from address with name: "Name <email@example.com>"
                from_address = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM or settings.SMTP_USER}>"
                self.fastmail = FastMail(
                    ConnectionConfig(
                        MAIL_USERNAME=settings.SMTP_USER,
                        MAIL_PASSWORD=settings.SMTP_PASSWORD,
                        MAIL_FROM=settings.EMAIL_FROM or settings.SMTP_USER,
                        MAIL_PORT=settings.SMTP_PORT,
                        MAIL_SERVER=settings.SMTP_HOST,
                        MAIL_STARTTLS=settings.SMTP_USE_TLS,
                        MAIL_SSL_TLS=False,
                        USE_CREDENTIALS=True,
                    )
                )
                logger.info("Email service initialized with SMTP")
            except Exception as e:
                logger.error(f"Failed to initialize email service: {str(e)}")
                self.enabled = False
                self.fastmail = None
        else:
            logger.warning("Email service disabled or SMTP credentials not configured")
            self.enabled = False
            self.fastmail = None
    
    async def send_invitation_email(
        self,
        to_email: str,
        conversation_title: str,
        conversation_description: Optional[str],
        access_code: str,
        invitation_token: Optional[str] = None,
        inviter_name: Optional[str] = None,
    ) -> bool:
        """
        Send invitation email to a user.
        
        Args:
            to_email: Recipient email address
            conversation_title: Title of the conversation
            conversation_description: Optional description
            access_code: Access code for the conversation
            invitation_token: Optional invitation token for direct access
            inviter_name: Name of the person sending the invitation
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.enabled or not self.fastmail:
            logger.info(f"Email disabled or not configured, skipping invitation to {to_email}")
            return False
        
        try:
            # Construct invitation link
            if invitation_token:
                # Use token-based link for direct access
                invite_link = f"{settings.FRONTEND_URL}/join/{access_code}?token={invitation_token}"
            else:
                # Fallback to access code only
                invite_link = f"{settings.FRONTEND_URL}/join/{access_code}"
            
            # Email subject
            subject = f"You're invited to join a conversation on Mosaic: {conversation_title}"
            
            # Email body (HTML)
            inviter_text = f" by {inviter_name}" if inviter_name else ""
            body_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <!-- Header Banner matching app header -->
                    <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                        <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                            <table cellpadding="0" cellspacing="0" border="0"><tr>
                                <td style="vertical-align: middle; padding-right: 10px;">
                                    <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                        <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                                    </div>
                                </td>
                                <td style="vertical-align: middle;">
                                    <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                                </td>
                            </tr></table>
                        </a>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #1a1a2e; margin-top: 0;">You're Invited!</h2>
                        <p style="color: #6b7280; font-size: 16px;">You've been invited{inviter_text} to participate in a conversation:</p>
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{conversation_title}</h3>
                            {f'<p style="color: #6b7280; margin-bottom: 0;">{conversation_description}</p>' if conversation_description else ''}
                        </div>
                        <p style="color: #6b7280; font-size: 16px;">Click the button below to join the conversation:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{invite_link}"
                               style="background-color: #1a1a2e; color: white; padding: 14px 32px;
                                      text-decoration: none; border-radius: 6px; display: inline-block;
                                      font-weight: 600; font-size: 16px;">
                                Join Conversation
                            </a>
                        </div>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                <strong>Or copy and paste this link into your browser:</strong>
                            </p>
                            <p style="color: #2563eb; font-size: 14px; margin: 0; word-break: break-all;">
                                {invite_link}
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Plain text version
            body_text = f"""You're Invited!

You've been invited{inviter_text} to participate in a conversation:

{conversation_title}
{conversation_description or ''}

Join the conversation by clicking this link:
{invite_link}
            """
            
            message = MessageSchema(
                subject=subject,
                recipients=[to_email],
                body=body_html,
                subtype=MessageType.html,
            )
            
            await self.fastmail.send_message(message)
            logger.info(f"Invitation email sent successfully to {to_email}")
            return True
                
        except Exception as e:
            logger.error(f"Failed to send invitation email to {to_email}: {str(e)}", exc_info=True)
            return False

    async def send_organization_invitation_email(
        self,
        to_email: str,
        organization_name: str,
        organization_description: Optional[str],
        invitation_token: str,
        inviter_name: Optional[str] = None,
        role: str = "member"
    ) -> bool:
        """
        Send organization invitation email.

        Args:
            to_email: Recipient email address
            organization_name: Name of the organization
            organization_description: Optional description
            invitation_token: Token for accepting invitation
            inviter_name: Name of the person sending the invitation
            role: Role the user will have (admin or member)

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.enabled or not self.fastmail:
            logger.info(f"Email disabled or not configured, skipping org invitation to {to_email}")
            return False

        try:
            # Construct invitation link
            accept_url = f"{settings.FRONTEND_URL}/organizations/accept-invite/{invitation_token}"

            # Email subject
            subject = f"You've been invited to join {organization_name}"

            # Role display
            role_display = "Admin" if role == "admin" else "Member"

            # Inviter text
            inviter_text = f" by {inviter_name}" if inviter_name else ""

            # Email body (HTML)
            body_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <!-- Header Banner -->
                    <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                        <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                            <table cellpadding="0" cellspacing="0" border="0"><tr>
                                <td style="vertical-align: middle; padding-right: 10px;">
                                    <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                        <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                                    </div>
                                </td>
                                <td style="vertical-align: middle;">
                                    <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                                </td>
                            </tr></table>
                        </a>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #1a1a2e; margin-top: 0;">Organization Invitation</h2>
                        <p style="color: #6b7280; font-size: 16px;">You've been invited{inviter_text} to join an organization on Mosaic:</p>
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{organization_name}</h3>
                            {f'<p style="color: #6b7280; margin-bottom: 10px;">{organization_description}</p>' if organization_description else ''}
                            <p style="color: #6b7280; font-size: 14px; margin: 0;">
                                <strong>Role:</strong> <span style="background-color: #f3f4f6; color: #1a1a2e; padding: 4px 8px; border-radius: 4px; font-size: 13px;">{role_display}</span>
                            </p>
                        </div>
                        <p style="color: #6b7280; font-size: 16px;">Click the button below to accept the invitation:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{accept_url}"
                               style="background-color: #1a1a2e; color: white; padding: 14px 32px;
                                      text-decoration: none; border-radius: 6px; display: inline-block;
                                      font-weight: 600; font-size: 16px;">
                                Accept Invitation
                            </a>
                        </div>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                <strong>Or copy and paste this link into your browser:</strong>
                            </p>
                            <p style="color: #2563eb; font-size: 14px; margin: 0; word-break: break-all;">
                                {accept_url}
                            </p>
                        </div>
                        <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
                            If you did not expect this invitation, you can safely ignore this email.
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """

            # Plain text version
            body_text = f"""Organization Invitation

You've been invited{inviter_text} to join an organization on Mosaic:

{organization_name}
{organization_description or ''}

Role: {role_display}

Accept the invitation by clicking this link:
{accept_url}

If you did not expect this invitation, you can safely ignore this email.
            """

            message = MessageSchema(
                subject=subject,
                recipients=[to_email],
                body=body_html,
                subtype=MessageType.html,
            )

            await self.fastmail.send_message(message)
            logger.info(f"Organization invitation email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send organization invitation email to {to_email}: {str(e)}", exc_info=True)
            return False

    async def send_closing_warning_email(
        self,
        to_email: str,
        conversation_title: str,
        closes_at: datetime,
        respond_url: str,
    ) -> bool:
        """
        Send closing warning email when a conversation is about to close.

        Args:
            to_email: Recipient email address
            conversation_title: Title of the conversation
            closes_at: When the conversation will close (UTC)
            respond_url: URL to respond to the conversation

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.enabled or not self.fastmail:
            logger.info(f"Email disabled or not configured, skipping closing warning to {to_email}")
            return False

        try:
            # Format the closing time
            closes_at_formatted = closes_at.strftime("%B %d, %Y at %I:%M %p UTC")

            subject = f"Reminder: '{conversation_title}' is closing soon"

            body_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <!-- Header Banner -->
                    <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                        <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                            <table cellpadding="0" cellspacing="0" border="0"><tr>
                                <td style="vertical-align: middle; padding-right: 10px;">
                                    <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                        <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                                    </div>
                                </td>
                                <td style="vertical-align: middle;">
                                    <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                                </td>
                            </tr></table>
                        </a>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #1a1a2e; margin-top: 0;">Reminder: Closing Soon</h2>
                        <p style="color: #6b7280; font-size: 16px;">The following conversation is closing soon and we haven't received your response yet:</p>
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{conversation_title}</h3>
                            <p style="color: #6b7280; margin-bottom: 0;">
                                <strong>Closes:</strong> {closes_at_formatted}
                            </p>
                        </div>
                        <p style="color: #6b7280; font-size: 16px;">Please submit your response before the deadline:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{respond_url}"
                               style="background-color: #1a1a2e; color: white; padding: 14px 32px;
                                      text-decoration: none; border-radius: 6px; display: inline-block;
                                      font-weight: 600; font-size: 16px;">
                                Respond Now
                            </a>
                        </div>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                <strong>Or copy and paste this link into your browser:</strong>
                            </p>
                            <p style="color: #2563eb; font-size: 14px; margin: 0; word-break: break-all;">
                                {respond_url}
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            message = MessageSchema(
                subject=subject,
                recipients=[to_email],
                body=body_html,
                subtype=MessageType.html,
            )

            await self.fastmail.send_message(message)
            logger.info(f"Closing warning email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send closing warning email to {to_email}: {str(e)}", exc_info=True)
            return False

    async def send_conversation_closed_email(
        self,
        to_email: str,
        conversation_title: str,
        response_count: int,
        results_url: Optional[str] = None,
        is_creator: bool = False,
    ) -> bool:
        """
        Send notification that a conversation has closed.

        Args:
            to_email: Recipient email address
            conversation_title: Title of the conversation
            response_count: Number of responses received
            results_url: URL to view results (if available)
            is_creator: Whether the recipient is the creator

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.enabled or not self.fastmail:
            logger.info(f"Email disabled or not configured, skipping closed notification to {to_email}")
            return False

        try:
            subject = f"'{conversation_title}' has closed"

            if is_creator:
                intro_text = "Your conversation has closed and feedback collection is complete."
                response_text = f"<strong>{response_count}</strong> response{'s' if response_count != 1 else ''} received"
            else:
                intro_text = "The following conversation has closed."
                response_text = ""

            results_section = ""
            if results_url and is_creator:
                results_section = f"""
                        <p style="color: #6b7280; font-size: 16px;">You can now run the analysis to discover insights:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{results_url}"
                               style="background-color: #1a1a2e; color: white; padding: 14px 32px;
                                      text-decoration: none; border-radius: 6px; display: inline-block;
                                      font-weight: 600; font-size: 16px;">
                                View Conversation
                            </a>
                        </div>
                """

            body_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <!-- Header Banner -->
                    <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                        <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                            <table cellpadding="0" cellspacing="0" border="0"><tr>
                                <td style="vertical-align: middle; padding-right: 10px;">
                                    <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                        <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                                    </div>
                                </td>
                                <td style="vertical-align: middle;">
                                    <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                                </td>
                            </tr></table>
                        </a>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #1a1a2e; margin-top: 0;">Conversation Closed</h2>
                        <p style="color: #6b7280; font-size: 16px;">{intro_text}</p>
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{conversation_title}</h3>
                            {f'<p style="color: #6b7280; margin-bottom: 0;">{response_text}</p>' if response_text else ''}
                        </div>
                        {results_section}
                    </div>
                </div>
            </body>
            </html>
            """

            message = MessageSchema(
                subject=subject,
                recipients=[to_email],
                body=body_html,
                subtype=MessageType.html,
            )

            await self.fastmail.send_message(message)
            logger.info(f"Conversation closed email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send conversation closed email to {to_email}: {str(e)}", exc_info=True)
            return False

    async def send_analysis_ready_email(
        self,
        to_email: str,
        conversation_title: str,
        results_url: str,
    ) -> bool:
        """
        Send notification that analysis is ready.

        Args:
            to_email: Recipient email address
            conversation_title: Title of the conversation
            results_url: URL to view analysis results

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.enabled or not self.fastmail:
            logger.info(f"Email disabled or not configured, skipping analysis ready to {to_email}")
            return False

        try:
            subject = f"Analysis ready for '{conversation_title}'"

            body_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <!-- Header Banner -->
                    <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                        <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                            <table cellpadding="0" cellspacing="0" border="0"><tr>
                                <td style="vertical-align: middle; padding-right: 10px;">
                                    <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                        <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                                    </div>
                                </td>
                                <td style="vertical-align: middle;">
                                    <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                                </td>
                            </tr></table>
                        </a>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #1a1a2e; margin-top: 0;">Analysis Complete!</h2>
                        <p style="color: #6b7280; font-size: 16px;">The analysis for your conversation is now ready to view:</p>
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{conversation_title}</h3>
                            <p style="color: #6b7280; margin-bottom: 0;">Themes, insights, and patterns have been identified.</p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{results_url}"
                               style="background-color: #1a1a2e; color: white; padding: 14px 32px;
                                      text-decoration: none; border-radius: 6px; display: inline-block;
                                      font-weight: 600; font-size: 16px;">
                                View Analysis
                            </a>
                        </div>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                <strong>Or copy and paste this link into your browser:</strong>
                            </p>
                            <p style="color: #2563eb; font-size: 14px; margin: 0; word-break: break-all;">
                                {results_url}
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            message = MessageSchema(
                subject=subject,
                recipients=[to_email],
                body=body_html,
                subtype=MessageType.html,
            )

            await self.fastmail.send_message(message)
            logger.info(f"Analysis ready email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send analysis ready email to {to_email}: {str(e)}", exc_info=True)
            return False

    async def send_periodic_analysis_ready_email(
        self,
        to_email: str,
        conversation_title: str,
        period_label: str,
        results_url: str,
        responses_analyzed: int,
    ) -> bool:
        """
        Send notification that periodic analysis is ready for a continuous conversation.

        Args:
            to_email: Recipient email address
            conversation_title: Title of the conversation
            period_label: Label for the analysis period (e.g., "2024-W01")
            results_url: URL to view analysis results
            responses_analyzed: Number of responses in this period

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.enabled or not self.fastmail:
            logger.info(f"Email disabled or not configured, skipping periodic analysis email to {to_email}")
            return False

        try:
            subject = f"New insights for '{conversation_title}' ({period_label})"

            body_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <!-- Header Banner -->
                    <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                        <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                            <table cellpadding="0" cellspacing="0" border="0"><tr>
                                <td style="vertical-align: middle; padding-right: 10px;">
                                    <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                        <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                                    </div>
                                </td>
                                <td style="vertical-align: middle;">
                                    <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                                </td>
                            </tr></table>
                        </a>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #1a1a2e; margin-top: 0;">New Periodic Insights</h2>
                        <p style="color: #6b7280; font-size: 16px;">A new analysis period has completed for your continuous feedback conversation:</p>
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{conversation_title}</h3>
                            <p style="color: #6b7280; margin-bottom: 5px;">
                                <strong>Period:</strong> {period_label}
                            </p>
                            <p style="color: #6b7280; margin-bottom: 0;">
                                <strong>Responses analyzed:</strong> {responses_analyzed}
                            </p>
                        </div>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{results_url}"
                               style="background-color: #1a1a2e; color: white; padding: 14px 32px;
                                      text-decoration: none; border-radius: 6px; display: inline-block;
                                      font-weight: 600; font-size: 16px;">
                                View Insights
                            </a>
                        </div>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                <strong>Or copy and paste this link into your browser:</strong>
                            </p>
                            <p style="color: #2563eb; font-size: 14px; margin: 0; word-break: break-all;">
                                {results_url}
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            message = MessageSchema(
                subject=subject,
                recipients=[to_email],
                body=body_html,
                subtype=MessageType.html,
            )

            await self.fastmail.send_message(message)
            logger.info(f"Periodic analysis ready email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send periodic analysis ready email to {to_email}: {str(e)}", exc_info=True)
            return False

    async def send_recurring_instance_created_email(
        self,
        to_email: str,
        conversation_title: str,
        instance_number: int,
        join_url: str,
        is_creator: bool = False,
    ) -> bool:
        """
        Send notification that a new recurring conversation instance has been created.

        Args:
            to_email: Recipient email address
            conversation_title: Title of the new conversation instance
            instance_number: Instance number in the series
            join_url: URL to join the conversation
            is_creator: Whether the recipient is the creator

        Returns:
            True if email was sent successfully, False otherwise
        """
        if not self.enabled or not self.fastmail:
            logger.info(f"Email disabled or not configured, skipping recurring instance email to {to_email}")
            return False

        try:
            subject = f"New round started: {conversation_title}"

            if is_creator:
                intro_text = f"A new instance of your recurring conversation has been created (Round #{instance_number})."
                action_text = "Review and activate the conversation:"
                button_text = "Review Conversation"
            else:
                intro_text = f"A new round of feedback collection has started (Round #{instance_number})."
                action_text = "You're invited to participate:"
                button_text = "Join Conversation"

            body_html = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <!-- Header Banner -->
                    <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                        <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                            <table cellpadding="0" cellspacing="0" border="0"><tr>
                                <td style="vertical-align: middle; padding-right: 10px;">
                                    <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                        <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                                    </div>
                                </td>
                                <td style="vertical-align: middle;">
                                    <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                                </td>
                            </tr></table>
                        </a>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #1a1a2e; margin-top: 0;">New Round Started</h2>
                        <p style="color: #6b7280; font-size: 16px;">{intro_text}</p>
                        <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{conversation_title}</h3>
                            <p style="color: #6b7280; margin-bottom: 0;">
                                Round #{instance_number}
                            </p>
                        </div>
                        <p style="color: #6b7280; font-size: 16px;">{action_text}</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{join_url}"
                               style="background-color: #1a1a2e; color: white; padding: 14px 32px;
                                      text-decoration: none; border-radius: 6px; display: inline-block;
                                      font-weight: 600; font-size: 16px;">
                                {button_text}
                            </a>
                        </div>
                        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                                <strong>Or copy and paste this link into your browser:</strong>
                            </p>
                            <p style="color: #2563eb; font-size: 14px; margin: 0; word-break: break-all;">
                                {join_url}
                            </p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            message = MessageSchema(
                subject=subject,
                recipients=[to_email],
                body=body_html,
                subtype=MessageType.html,
            )

            await self.fastmail.send_message(message)
            logger.info(f"Recurring instance created email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send recurring instance created email to {to_email}: {str(e)}", exc_info=True)
            return False


# Singleton instance
email_service = EmailService()
