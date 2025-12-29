"""Analysis model."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Analysis(Base):
    """Analysis model for storing LLM-generated insights."""

    __tablename__ = "analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)

    # Analysis results
    overall_summary = Column(Text, nullable=True)
    themes = Column(JSONB, nullable=True)  # Deprecated: kept for backwards compatibility
    # Structure:
    # [
    #   {
    #     "theme": "Communication",
    #     "frequency": 15,
    #     "clusters": [
    #       {"sentiment": "positive", "summary": "...", "count": 8},
    #       {"sentiment": "negative", "summary": "...", "count": 5},
    #       {"sentiment": "neutral", "summary": "...", "count": 2}
    #     ]
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
    llm_provider = Column(String(50), nullable=True)  # 'claude'
    llm_model = Column(String(100), nullable=True)  # 'claude-3-5-sonnet-20241022'

    total_responses_analyzed = Column(Integer, nullable=True)
    num_clusters_found = Column(Integer, nullable=True)
    analysis_duration_ms = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="analyses")

    def __repr__(self):
        return f"<Analysis(id={self.id}, conversation_id={self.conversation_id}, responses={self.total_responses_analyzed})>"


# Index for efficient querying
Index("idx_analyses_conversation", Analysis.conversation_id)
