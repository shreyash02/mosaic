"""Per-entry analysis model for individual journal entries."""

from datetime import datetime
from sqlalchemy import Column, String, Text, Float, DateTime, ForeignKey, Integer, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class JournalEntryAnalysis(Base):
    """AI-generated analysis for a single journal entry.

    Provides immediate feedback on each entry: themes, mood, key takeaway,
    connections to previous entries, and suggested follow-up questions.
    """

    __tablename__ = "journal_entry_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    response_id = Column(
        UUID(as_uuid=True),
        ForeignKey("responses.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Analysis results
    themes = Column(JSONB, nullable=True)  # ["self-doubt", "career growth"]
    mood_score = Column(Float, nullable=True)  # -1.0 to 1.0
    mood_label = Column(String(50), nullable=True)  # "cautiously optimistic"
    key_takeaway = Column(Text, nullable=True)  # 1-2 sentence summary
    connections = Column(Text, nullable=True)  # how this relates to previous entries
    suggested_followups = Column(JSONB, nullable=True)  # ["What steps...", "How might..."]

    # LLM metadata
    llm_provider = Column(String(50), nullable=True)
    llm_model = Column(String(100), nullable=True)
    analysis_duration_ms = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    response = relationship("Response", foreign_keys=[response_id])
    conversation = relationship("Conversation", foreign_keys=[conversation_id])

    __table_args__ = (
        Index("idx_entry_analyses_response", "response_id", unique=True),
        Index("idx_entry_analyses_conversation", "conversation_id"),
    )

    def __repr__(self):
        return f"<JournalEntryAnalysis(id={self.id}, response_id={self.response_id})>"
