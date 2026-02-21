"""Space model for the second-brain ideas feature."""

from datetime import datetime
from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Space(Base):
    """A space where users drop ideas that get auto-organized into themes."""

    __tablename__ = "spaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="SET NULL"),
        nullable=True,
    )
    settings = Column(JSONB, nullable=True, default=dict)
    auto_organize = Column(Boolean, default=True, nullable=False)
    last_organized_at = Column(DateTime, nullable=True)
    ideas_at_last_organize = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", foreign_keys=[owner_id])
    organization = relationship("Organization", foreign_keys=[organization_id])
    ideas = relationship("Idea", back_populates="space", cascade="all, delete-orphan")
    themes = relationship("Theme", back_populates="space", cascade="all, delete-orphan")
    theme_connections = relationship("ThemeConnection", back_populates="space", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_spaces_owner", "owner_id"),
        Index("idx_spaces_organization", "organization_id"),
    )

    def __repr__(self):
        return f"<Space(id={self.id}, title={self.title}, owner_id={self.owner_id})>"
