"""SynthesisAction model for persisting completed/dismissed synthesis notes across regenerations."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class SynthesisAction(Base):
    """Records completed/dismissed synthesis notes so they persist across re-organizes."""

    __tablename__ = "synthesis_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    theme_name = Column(String(200), nullable=False)
    note_text = Column(Text, nullable=False)
    action = Column(String(20), nullable=False)  # 'completed' | 'dismissed'
    detail = Column(Text, nullable=True)  # outcome (completed) or reason (dismissed)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_synthesis_actions_space_created", "space_id", "created_at"),
    )
