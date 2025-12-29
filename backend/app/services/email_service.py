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
            subject = f"You're invited to join: {conversation_title}"
            
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
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
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
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                            <p style="color: #718096; font-size: 14px; margin: 0;">
                                <strong>Access Code:</strong> <code style="background-color: #edf2f7; padding: 4px 8px; border-radius: 4px; font-family: monospace; color: #2d3748;">{access_code}</code>
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

Access Code: {access_code}
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


# Singleton instance
email_service = EmailService()

