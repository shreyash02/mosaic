"""LLM Usage Log model for tracking API calls to LLM providers."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Float, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class LLMUsageLog(Base):
    """Tracks individual LLM API calls across all services."""

    __tablename__ = "llm_usage_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    operation_type = Column(String, nullable=False)  # e.g. "cluster_theme_analysis", "embedding"
    entity_id = Column(UUID(as_uuid=True), nullable=True)  # conversation_id, journal_id, etc.
    user_id = Column(UUID(as_uuid=True), nullable=True)
    provider = Column(String, nullable=False)  # "anthropic" or "openai"
    model = Column(String, nullable=False)
    input_tokens = Column(Integer, nullable=True)
    output_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)  # for embeddings
    estimated_cost_usd = Column(Float, nullable=False, default=0.0)
    latency_ms = Column(Integer, nullable=True)
    status = Column(String, nullable=False, default="success")  # "success" or "error"
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_llm_usage_logs_created_at", "created_at"),
        Index("ix_llm_usage_logs_operation_type", "operation_type"),
    )
