"""IdeaTheme junction model for many-to-many idea-theme assignments."""

from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class IdeaTheme(Base):
    """Many-to-many relationship between ideas and themes with confidence score."""

    __tablename__ = "idea_themes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    idea_id = Column(
        UUID(as_uuid=True),
        ForeignKey("ideas.id", ondelete="CASCADE"),
        nullable=False,
    )
    theme_id = Column(
        UUID(as_uuid=True),
        ForeignKey("themes.id", ondelete="CASCADE"),
        nullable=False,
    )
    confidence = Column(Float, default=1.0, nullable=False)  # 0-1
    assigned_by = Column(String(10), default="ai", nullable=False)  # 'ai' or 'user'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    idea = relationship("Idea", back_populates="theme_assignments")
    theme = relationship("Theme", back_populates="idea_assignments")

    __table_args__ = (
        UniqueConstraint("idea_id", "theme_id", name="uq_idea_theme"),
        Index("idx_idea_themes_idea", "idea_id"),
        Index("idx_idea_themes_theme", "theme_id"),
    )

    def __repr__(self):
        return f"<IdeaTheme(idea_id={self.idea_id}, theme_id={self.theme_id}, confidence={self.confidence})>"
