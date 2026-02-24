"""SpaceActivityLog model for tracking general space activity (idea adds/removes, organizes, etc.)."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class SpaceActivityLog(Base):
    """Chronological activity log for collaborative spaces."""

    __tablename__ = "space_activity_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(UUID(as_uuid=True), nullable=True)  # null for system events
    user_name = Column(String(255), nullable=True)  # denormalized for display permanence
    event_type = Column(String(50), nullable=False)
    detail = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_space_activity_logs_space_created", "space_id", "created_at"),
        Index("ix_space_activity_logs_event_type", "event_type"),
    )
