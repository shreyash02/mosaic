"""ParticipantCode model."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class ParticipantCode(Base):
    """ParticipantCode model for tracking unique codes in fully_anonymous mode."""

    __tablename__ = "participant_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)

    # Unique code for this participant
    participant_code = Column(String(100), unique=True, nullable=False, index=True)

    # Track usage
    is_used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="participant_codes")

    def __repr__(self):
        return f"<ParticipantCode(id={self.id}, participant_code={self.participant_code}, is_used={self.is_used})>"


# Indexes for efficient querying
Index("idx_participant_codes_conversation", ParticipantCode.conversation_id)
Index("idx_participant_codes_code", ParticipantCode.participant_code)

