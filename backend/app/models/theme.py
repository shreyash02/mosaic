"""Theme model for AI-generated or user-created groupings within a Space."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Theme(Base):
    """A theme that groups related ideas within a space."""

    __tablename__ = "themes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    name = Column(String(200), nullable=False)
    summary = Column(Text, nullable=True)
    color = Column(String(7), nullable=True)  # hex color e.g. #3B82F6
    is_ai_generated = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    space = relationship("Space", back_populates="themes")
    idea_assignments = relationship("IdeaTheme", back_populates="theme", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_themes_space", "space_id"),
    )

    def __repr__(self):
        return f"<Theme(id={self.id}, name={self.name}, space_id={self.space_id})>"
