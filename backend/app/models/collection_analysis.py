"""Collection analysis model."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class CollectionAnalysis(Base):
    """Analysis model for collections (series)."""

    __tablename__ = "collection_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    series_id = Column(UUID(as_uuid=True), ForeignKey("series.id", ondelete="CASCADE"), nullable=False)

    # Summary and insights
    overall_summary = Column(Text, nullable=True)  # AI-generated collection summary
    surprising_insights = Column(JSONB, nullable=True)  # Cross-conversation insights
    # Structure: [{"title": "...", "description": "..."}, ...]

    # Aggregated question insights (for matching questions across conversations)
    question_insights = Column(JSONB, nullable=True)
    # Structure: [
    #   {
    #     "question_text": "What did you like?",
    #     "question_type": "text",
    #     "total_responses": 150,
    #     "themes": [...],  # Aggregated themes
    #     "rating_stats": {...},  # For rating questions
    #     "poll_stats": {...}  # For poll questions
    #   },
    #   ...
    # ]

    # Trends data
    trends = Column(JSONB, nullable=True)
    # Structure: {
    #   "period": "monthly",  # or "weekly", "daily"
    #   "themes": [
    #     {
    #       "theme_id": "communication",
    #       "theme_name": "Communication",  # 3 words or less
    #       "question_text": "What could we improve?",
    #       "data_points": [
    #         {
    #           "period": "2024-01",
    #           "period_start": "2024-01-01T00:00:00Z",
    #           "period_end": "2024-01-31T23:59:59Z",
    #           "normalized_score": 0.45,  # 0-1 scale
    #           "frequency": 23,
    #           "conversation_count": 2
    #         },
    #         ...
    #       ]
    #     },
    #     ...
    #   ]
    # }

    # Metadata
    total_conversations = Column(Integer, nullable=False)
    total_responses = Column(Integer, nullable=False)
    conversations_analyzed = Column(Integer, nullable=False)  # How many had analysis
    conversation_ids = Column(JSONB, nullable=False)  # List of conversation IDs included
    # Store which conversations were analyzed for cache invalidation

    computed_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    computation_duration_ms = Column(Integer, nullable=True)

    # Relationships
    series = relationship("Series", back_populates="analysis")

    # Table constraints
    __table_args__ = (
        UniqueConstraint("series_id", name="uq_collection_analyses_series"),
        Index("idx_collection_analyses_series", "series_id"),
    )

    def __repr__(self):
        return f"<CollectionAnalysis(id={self.id}, series_id={self.series_id}, computed_at={self.computed_at})>"

