"""InviteCode model."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class InviteCode(Base):
    """InviteCode model for tracking unique codes in fully_anonymous mode."""

    __tablename__ = "invite_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)

    # Unique code for this participant
    code = Column(String(100), unique=True, nullable=False, index=True)

    # Track usage
    is_used = Column(Boolean, default=False, nullable=False)
    used_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="invite_codes")

    def __repr__(self):
        return f"<InviteCode(id={self.id}, code={self.code}, is_used={self.is_used})>"


# Indexes for efficient querying
Index("idx_invite_codes_conversation", InviteCode.conversation_id)
Index("idx_invite_codes_code", InviteCode.code)
