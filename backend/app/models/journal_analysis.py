"""Journal analysis model for individual mode temporal insights."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class JournalAnalysis(Base):
    """Cumulative analysis for individual journal entries.

    Stores AI-generated insights that span across multiple journal entries,
    tracking how themes, mood, and patterns evolve over time. Distinct from
    PeriodicAnalysis (which snapshots a time window) -- JournalAnalysis
    provides the holistic, cumulative view.
    """

    __tablename__ = "journal_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)

    # Temporal theme tracking
    # [{ "theme": str, "first_seen": datetime, "last_seen": datetime,
    #    "entry_count": int, "trajectory": "growing|stable|declining|resolved",
    #    "summary": str }]
    theme_timeline = Column(JSONB, nullable=True)

    # Mood/sentiment trajectory
    # { "data_points": [{ "date": str, "sentiment_score": float,
    #   "dominant_mood": str, "entry_id": uuid }],
    #   "overall_trend": "improving|stable|declining", "summary": str }
    mood_trajectory = Column(JSONB, nullable=True)

    # Patterns and insights
    # [{ "pattern_type": "recurring_concern|positive_shift|correlation|cyclical",
    #    "title": str, "description": str, "confidence": float }]
    patterns = Column(JSONB, nullable=True)

    # Overall reflective summary
    overall_summary = Column(Text, nullable=True)

    # Entry statistics (cached for quick display)
    total_entries_analyzed = Column(Integer, nullable=False, default=0)
    date_range_start = Column(DateTime, nullable=True)
    date_range_end = Column(DateTime, nullable=True)

    # LLM metadata
    llm_provider = Column(String(50), nullable=True)
    llm_model = Column(String(100), nullable=True)
    analysis_duration_ms = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="journal_analyses")

    __table_args__ = (
        Index("idx_journal_analyses_conversation", "conversation_id"),
    )

    def __repr__(self):
        return f"<JournalAnalysis(id={self.id}, conversation_id={self.conversation_id}, entries={self.total_entries_analyzed})>"
