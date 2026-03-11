"""WorkspaceActivityLog model for tracking workspace-wide activity."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class WorkspaceActivityLog(Base):
    """Chronological activity log for workspaces."""

    __tablename__ = "workspace_activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(
        UUID(as_uuid=True),
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(UUID(as_uuid=True), nullable=True)  # null for system events
    user_name = Column(String(255), nullable=True)  # denormalized for display permanence
    event_type = Column(String(50), nullable=False)
    entity_type = Column(String(50), nullable=True)  # 'conversation', 'space', 'journal', 'member'
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    entity_name = Column(String(500), nullable=True)  # denormalized title/name
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_workspace_activity_logs_ws_created", "workspace_id", "created_at"),
        Index("ix_workspace_activity_logs_event_type", "event_type"),
    )
