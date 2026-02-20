"""Lightweight helper for logging email send attempts to the database."""

import logging
from typing import Optional
from uuid import UUID

logger = logging.getLogger(__name__)


def log_email(
    recipient_email: str,
    email_type: str,
    status: str,
    subject: Optional[str] = None,
    error_message: Optional[str] = None,
    conversation_id: Optional[UUID] = None,
    organization_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
) -> None:
    """
    Log a single email send attempt. Creates its own DB session. Errors logged, not raised.

    Services call this after each email send. It's fire-and-forget -- failures
    in logging never break the calling service.
    """
    try:
        from app.core.database import SessionLocal
        from app.models.email_log import EmailLog

        db = SessionLocal()
        try:
            log_entry = EmailLog(
                recipient_email=recipient_email,
                email_type=email_type,
                status=status,
                subject=subject,
                error_message=error_message,
                conversation_id=conversation_id,
                organization_id=organization_id,
                user_id=user_id,
            )
            db.add(log_entry)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Failed to log email ({email_type} to {recipient_email}): {e}")
