"""Email service for sending invitations and notifications."""

import logging
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
                    <div style="background-color: white; border-bottom: 1px solid #e2e8f0; padding: 1rem 2rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
                        <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                            <div style="font-size: 2rem; font-weight: 600; color: #000000; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;">
                                Mosaic
                            </div>
                        </a>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #2d3748; margin-top: 0;">You're Invited!</h2>
                        <p style="color: #4a5568; font-size: 16px;">You've been invited{inviter_text} to participate in a conversation:</p>
                        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4299e1;">
                            <h3 style="margin-top: 0; color: #2d3748; font-size: 20px;">{conversation_title}</h3>
                            {f'<p style="color: #718096; margin-bottom: 0;">{conversation_description}</p>' if conversation_description else ''}
                        </div>
                        <p style="color: #4a5568; font-size: 16px;">Click the button below to join the conversation:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{invite_link}" 
                               style="background-color: #4299e1; color: white; padding: 14px 32px; 
                                      text-decoration: none; border-radius: 6px; display: inline-block; 
                                      font-weight: 600; font-size: 16px;">
                                Join Conversation
                            </a>
                        </div>
                        <div style="background-color: #edf2f7; padding: 15px; border-radius: 6px; margin: 25px 0;">
                            <p style="color: #718096; font-size: 14px; margin: 0 0 10px 0;">
                                <strong>Or copy and paste this link into your browser:</strong>
                            </p>
                            <p style="color: #4299e1; font-size: 14px; margin: 0; word-break: break-all;">
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
                    <div style="background-color: white; border-bottom: 1px solid #e2e8f0; padding: 1rem 2rem; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);">
                        <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                            <div style="font-size: 2rem; font-weight: 600; color: #000000; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;">
                                Mosaic
                            </div>
                        </a>
                    </div>
                    <div style="padding: 30px 20px;">
                        <h2 style="color: #2d3748; margin-top: 0;">Organization Invitation</h2>
                        <p style="color: #4a5568; font-size: 16px;">You've been invited{inviter_text} to join an organization on Mosaic:</p>
                        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #4299e1;">
                            <h3 style="margin-top: 0; color: #2d3748; font-size: 20px;">{organization_name}</h3>
                            {f'<p style="color: #718096; margin-bottom: 10px;">{organization_description}</p>' if organization_description else ''}
                            <p style="color: #4a5568; font-size: 14px; margin: 0;">
                                <strong>Role:</strong> <span style="background-color: #bee3f8; color: #2c5282; padding: 4px 8px; border-radius: 4px; font-size: 13px;">{role_display}</span>
                            </p>
                        </div>
                        <p style="color: #4a5568; font-size: 16px;">Click the button below to accept the invitation:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{accept_url}"
                               style="background-color: #4299e1; color: white; padding: 14px 32px;
                                      text-decoration: none; border-radius: 6px; display: inline-block;
                                      font-weight: 600; font-size: 16px;">
                                Accept Invitation
                            </a>
                        </div>
                        <div style="background-color: #edf2f7; padding: 15px; border-radius: 6px; margin: 25px 0;">
                            <p style="color: #718096; font-size: 14px; margin: 0 0 10px 0;">
                                <strong>Or copy and paste this link into your browser:</strong>
                            </p>
                            <p style="color: #4299e1; font-size: 14px; margin: 0; word-break: break-all;">
                                {accept_url}
                            </p>
                        </div>
                        <p style="color: #a0aec0; font-size: 12px; margin-top: 30px;">
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


# Singleton instance
email_service = EmailService()
