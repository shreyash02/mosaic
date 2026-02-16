"""Suggested action model."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Float, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class SuggestedAction(Base):
    """AI-suggested action based on analysis results."""

    __tablename__ = "suggested_actions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)

    # Action content
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=False)
    action_type = Column(String(50), nullable=False)  # investigate, communicate, change, celebrate, monitor
    priority = Column(String(20), nullable=False)  # high, medium, low
    sentiment = Column(String(20), nullable=False)  # positive, negative, neutral, mixed

    # Linkage to analysis data
    related_cluster_ids = Column(JSONB, nullable=True)
    response_percentage = Column(Float, nullable=True)

    # Source: how this action was created
    source = Column(String(20), nullable=False, default="user_requested")  # user_requested, auto_generated

    # Status (Phase 1: always 'suggested'; Phase 2+: accepted, dismissed, converted_to_goal)
    status = Column(String(50), nullable=False, default="suggested")
    dismissed_reason = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    analysis = relationship("Analysis", backref="suggested_actions")
    conversation = relationship("Conversation")

    def __repr__(self):
        return f"<SuggestedAction(id={self.id}, title={self.title}, priority={self.priority})>"


Index("idx_suggested_actions_analysis", SuggestedAction.analysis_id)
Index("idx_suggested_actions_conversation", SuggestedAction.conversation_id)
