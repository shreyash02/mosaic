"""Utility functions for checking email preferences."""

from sqlalchemy.orm import Session
from app.schemas.user import get_email_preferences


def should_send_email(db: Session, to_email: str, preference_key: str) -> bool:
    """
    Check if email should be sent based on user preferences.

    Args:
        db: Database session
        to_email: Recipient email address
        preference_key: Type of email (conversation_invitations, organization_invitations,
                    closing_reminders, announcements, conversation_closed, analysis_ready,
                    periodic_analysis, recurring_instances)

    Returns:
        True if email should be sent, False if user has opted out
    """
    from app.models.user import User

    # Look up user by email
    user = db.query(User).filter(User.email == to_email).first()

    # If user not found (not registered), send email
    if not user:
        return True

    # Get preferences with defaults
    prefs = get_email_preferences(user.email_preferences)

    # Check the specific preference
    return getattr(prefs, preference_key, True)
