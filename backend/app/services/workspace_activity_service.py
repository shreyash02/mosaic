"""Service for logging workspace-level activity."""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.workspace_activity_log import WorkspaceActivityLog

logger = logging.getLogger(__name__)


def log_activity(
    db: Session,
    workspace_id: UUID,
    event_type: str,
    user_id: Optional[UUID] = None,
    user_name: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    entity_name: Optional[str] = None,
    detail: Optional[str] = None,
) -> WorkspaceActivityLog:
    """Create a workspace activity log entry.

    Args:
        db: Database session.
        workspace_id: The workspace this activity belongs to.
        event_type: Type of event (e.g. conversation_created, member_joined).
        user_id: ID of the user who performed the action (None for system events).
        user_name: Denormalized display name for the actor.
        entity_type: Type of the affected entity (conversation, space, journal, member).
        entity_id: ID of the affected entity.
        entity_name: Denormalized name/title of the affected entity.
        detail: Additional detail text.

    Returns:
        The created WorkspaceActivityLog entry.
    """
    entry = WorkspaceActivityLog(
        workspace_id=workspace_id,
        user_id=user_id,
        user_name=user_name,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        detail=detail,
    )
    db.add(entry)
    # Don't commit here — let the caller's transaction handle it
    return entry
