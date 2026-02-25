"""SpaceSynthesis model — stores each purpose synthesis as a dedicated row."""

from datetime import datetime

from sqlalchemy import Boolean, Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.core.database import Base


class SpaceSynthesis(Base):
    """A single synthesis result for a space + purpose combination.

    Every organize / resynthesize creates a new row.  The previous row's
    ``is_current`` flag is set to False so only one synthesis per
    space + purpose is active at a time.  Old rows are kept for history.
    """

    __tablename__ = "space_syntheses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    purpose = Column(String(20), nullable=False)
    space_summary = Column(Text, nullable=True)
    theme_notes = Column(JSONB, nullable=True, default=dict)
    note_states = Column(JSONB, nullable=True, default=dict)
    dismiss_reasons = Column(JSONB, nullable=True, default=dict)
    completion_outcomes = Column(JSONB, nullable=True, default=dict)
    completion_outcome_images = Column(JSONB, nullable=True, default=dict)
    is_current = Column(Boolean, default=True, nullable=False)
    generated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("idx_space_syntheses_space_purpose", "space_id", "purpose"),
        Index("idx_space_syntheses_current", "space_id", "purpose", "is_current"),
    )

    def __repr__(self):
        return (
            f"<SpaceSynthesis(id={self.id}, space_id={self.space_id}, "
            f"purpose={self.purpose}, is_current={self.is_current})>"
        )
