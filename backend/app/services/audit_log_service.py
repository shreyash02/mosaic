"""Lightweight helper for logging admin actions to the database."""

import logging
from typing import Optional
from uuid import UUID

logger = logging.getLogger(__name__)


def log_audit(
    admin_id: UUID,
    admin_username: str,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    details: Optional[dict] = None,
) -> None:
    """
    Log a single admin action. Creates its own DB session. Errors logged, not raised.

    Services call this after each admin mutation. It's fire-and-forget -- failures
    in logging never break the calling service.
    """
    try:
        from app.core.database import SessionLocal
        from app.models.audit_log import AuditLog

        db = SessionLocal()
        try:
            log_entry = AuditLog(
                admin_id=admin_id,
                admin_username=admin_username,
                action=action,
                entity_type=entity_type,
                entity_id=entity_id,
                details=details,
            )
            db.add(log_entry)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Failed to log audit ({action} by {admin_username}): {e}")
