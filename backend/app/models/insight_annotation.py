"""Insight annotation model."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class InsightAnnotation(Base):
    """Personal creator annotation (star/note) on an analysis element."""

    __tablename__ = "insight_annotations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    analysis_id = Column(UUID(as_uuid=True), ForeignKey("analyses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # What this annotation targets
    target_type = Column(String(30), nullable=False)  # theme, surprising_insight, question, overall_summary
    target_key = Column(JSONB, nullable=False)  # composite key identifying the element

    # Annotation content
    starred = Column(Boolean, nullable=False, default=False)
    note = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, nullable=True)

    # Relationships
    analysis = relationship("Analysis", backref="annotations")
    user = relationship("User")

    __table_args__ = (
        UniqueConstraint('analysis_id', 'user_id', 'target_type', 'target_key', name='uq_insight_annotation_target'),
        Index('idx_insight_annotations_analysis_user', 'analysis_id', 'user_id'),
        Index('idx_insight_annotations_user', 'user_id'),
    )

    def __repr__(self):
        return f"<InsightAnnotation(id={self.id}, target_type={self.target_type}, starred={self.starred})>"
