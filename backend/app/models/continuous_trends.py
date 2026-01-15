"""Continuous trends model for tracking evolution across periodic analyses."""

from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class ContinuousTrends(Base):
    """Tracks theme/sentiment evolution across periodic analyses for a continuous conversation.

    This model aggregates insights from multiple periodic analyses to show
    how themes and sentiments change over time within a single long-running conversation.
    """

    __tablename__ = "continuous_trends"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)

    # Trends data (similar structure to CollectionAnalysis.trends)
    trends = Column(JSONB, nullable=True)
    # Structure:
    # {
    #   "period_type": "weekly",
    #   "themes": [
    #     {
    #       "theme_id": "communication",
    #       "theme_name": "Communication",
    #       "question_text": "What could we improve?",
    #       "data_points": [
    #         {
    #           "period": "2024-W01",
    #           "period_start": "2024-01-01T00:00:00Z",
    #           "period_end": "2024-01-07T23:59:59Z",
    #           "normalized_score": 0.45,
    #           "frequency": 23,
    #           "response_count": 50
    #         },
    #         ...
    #       ]
    #     }
    #   ]
    # }

    # Metadata
    periods_analyzed = Column(Integer, default=0, nullable=False)
    last_computed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    computation_duration_ms = Column(Integer, nullable=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="continuous_trends")

    __table_args__ = (
        UniqueConstraint("conversation_id", name="uq_continuous_trends_conversation"),
        Index("idx_continuous_trends_conversation", "conversation_id"),
    )

    def __repr__(self):
        return f"<ContinuousTrends(id={self.id}, conversation_id={self.conversation_id}, periods={self.periods_analyzed})>"
