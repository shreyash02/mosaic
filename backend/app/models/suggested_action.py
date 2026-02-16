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

    # Status
    status = Column(String(50), nullable=False, default="suggested")
    dismissed_reason = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    dismissed_at = Column(DateTime, nullable=True)
    deferred_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, nullable=True)

    # Who created (for manual actions)
    created_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    analysis = relationship("Analysis", backref="suggested_actions")
    conversation = relationship("Conversation")
    created_by = relationship("User", foreign_keys=[created_by_id])

    def __repr__(self):
        return f"<SuggestedAction(id={self.id}, title={self.title}, priority={self.priority})>"


Index("idx_suggested_actions_analysis", SuggestedAction.analysis_id)
Index("idx_suggested_actions_conversation", SuggestedAction.conversation_id)
Index("idx_suggested_actions_status", SuggestedAction.status)
