"""Idea model for individual thoughts dropped into a Space."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Idea(Base):
    """A single idea/thought within a space."""

    __tablename__ = "ideas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    text = Column(Text, nullable=False)
    image_url = Column(String(500), nullable=True)
    embedding = Column(JSONB, nullable=True)  # 1536-dim float array
    status = Column(String(20), default="active", nullable=False)
    reviewed_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    space = relationship("Space", back_populates="ideas")
    author = relationship("User", foreign_keys=[author_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    theme_assignments = relationship("IdeaTheme", back_populates="idea", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_ideas_space", "space_id"),
        Index("idx_ideas_author", "author_id"),
        Index("idx_ideas_status", "status"),
    )

    def __repr__(self):
        return f"<Idea(id={self.id}, space_id={self.space_id})>"
