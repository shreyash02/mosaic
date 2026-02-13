"""ConversationAnnouncement model."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class ConversationAnnouncement(Base):
    """ConversationAnnouncement model for broadcast messages to participants."""

    __tablename__ = "conversation_announcements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)

    # Content
    message = Column(Text, nullable=False)  # The announcement text (max 2000 chars enforced in schema)

    # Tracking
    sent_at = Column(DateTime, nullable=True)
    recipients_count = Column(Integer, default=0)  # Number of recipients at send time

    # Metadata
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    conversation = relationship("Conversation", backref="announcements")
    created_by = relationship("User", backref="announcements_created")

    def __repr__(self):
        return f"<ConversationAnnouncement(id={self.id}, conversation_id={self.conversation_id})>"


# Indexes for efficient querying
Index("idx_conversation_announcements_conversation", ConversationAnnouncement.conversation_id)
Index("idx_conversation_announcements_sent_at", ConversationAnnouncement.sent_at)
