"""Journal model for individual mode."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Journal(Base):
    """Journal entity backed by a Conversation.

    Journals are personal, single-owner entities. The backing Conversation
    holds shared infrastructure (questions, responses, state, title, etc.),
    while this model holds journal-specific settings.
    """

    __tablename__ = "journals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Entry frequency (how often the user should write)
    # 'daily', 'weekly', 'biweekly', 'monthly', None=unlimited
    entry_frequency = Column(String(50), nullable=True)

    # If True, enforce max one entry per period (based on entry_frequency)
    strict_frequency = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="journal", uselist=False)
    owner = relationship("User", foreign_keys=[owner_id])
    shares = relationship("JournalShare", back_populates="journal", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_journals_owner", "owner_id"),
    )

    def __repr__(self):
        return f"<Journal(id={self.id}, conversation_id={self.conversation_id}, owner_id={self.owner_id})>"
