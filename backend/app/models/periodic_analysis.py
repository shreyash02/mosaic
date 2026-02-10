"""Periodic analysis model for continuous conversations."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class PeriodicAnalysis(Base):
    """Periodic analysis model for time-windowed analysis snapshots.

    Used for continuous conversations that need periodic analysis without closing.
    Each periodic analysis covers responses from a specific time window.
    """

    __tablename__ = "periodic_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)

    # Time window for this analysis
    period_start = Column(DateTime, nullable=False)  # Start of analysis window (UTC)
    period_end = Column(DateTime, nullable=False)    # End of analysis window (UTC)
    period_label = Column(String(50), nullable=False)  # e.g., "2024-W01", "2024-01", "2024-01-15"
    period_type = Column(String(20), nullable=False)   # 'daily', 'weekly', 'biweekly', 'monthly'
    trigger_type = Column(String(20), nullable=False, default='scheduled')  # 'scheduled', 'manual', 'manual_incremental'

    # Analysis results (same structure as Analysis model)
    overall_summary = Column(Text, nullable=True)
    themes = Column(JSONB, nullable=True)  # For backwards compatibility
    surprising_insights = Column(JSONB, nullable=True)
    # Structure:
    # [
    #   {
    #     "title": "The Recommendation Paradox",
    #     "description": "Perhaps the most striking finding is..."
    #   },
    #   ...
    # ]

    # Per-question analysis
    question_analyses = Column(JSONB, nullable=True)
    # Structure:
    # [
    #   {
    #     "question_id": "uuid",
    #     "question_text": "What did you like?",
    #     "question_type": "text",
    #     "response_count": 45,
    #     "themes": [...],  # For text questions
    #     "rating_stats": {...},  # For rating questions
    #     "poll_stats": {...}  # For poll questions
    #   },
    #   ...
    # ]

    # Metadata
    embedding_provider = Column(String(50), nullable=True)  # 'openai'
    embedding_model = Column(String(100), nullable=True)  # 'text-embedding-3-small'
    clustering_algorithm = Column(String(50), nullable=True)  # 'dbscan'
    llm_provider = Column(String(50), nullable=True)  # 'anthropic'
    llm_model = Column(String(100), nullable=True)  # 'claude-sonnet-4-5-20250929'

    total_responses_analyzed = Column(Integer, nullable=True)
    num_clusters_found = Column(Integer, nullable=True)
    analysis_duration_ms = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="periodic_analyses")

    __table_args__ = (
        UniqueConstraint("conversation_id", "period_label", name="uq_periodic_analyses_label"),
        Index("idx_periodic_analyses_conversation", "conversation_id"),
        Index("idx_periodic_analyses_period", "conversation_id", "period_start"),
    )

    def __repr__(self):
        return f"<PeriodicAnalysis(id={self.id}, conversation_id={self.conversation_id}, period={self.period_label})>"
