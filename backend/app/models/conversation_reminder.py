"""ConversationReminder model."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class ConversationReminder(Base):
    """ConversationReminder model for tracking reminders sent to non-responders."""

    __tablename__ = "conversation_reminders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)

    # Reminder configuration
    reminder_type = Column(String(50), nullable=False)  # 'manual' or 'scheduled'
    scheduled_at = Column(DateTime, nullable=True)  # When to send (UTC), null for manual/immediate

    # Status tracking
    status = Column(String(50), default="pending", nullable=False)  # 'pending', 'sent', 'cancelled'
    sent_at = Column(DateTime, nullable=True)

    # Tracking
    recipients_count = Column(Integer, default=0)  # Number of non-responders at send time

    # Metadata
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    conversation = relationship("Conversation", backref="reminders")
    created_by = relationship("User", backref="reminders_created")

    def __repr__(self):
        return f"<ConversationReminder(id={self.id}, type={self.reminder_type}, status={self.status})>"


# Indexes for efficient querying
Index("idx_conversation_reminders_conversation", ConversationReminder.conversation_id)
Index("idx_conversation_reminders_status_scheduled", ConversationReminder.status, ConversationReminder.scheduled_at)
