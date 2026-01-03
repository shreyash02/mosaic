"""Series model."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Series(Base):
    """Series model for grouping related conversations."""

    __tablename__ = "series"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)

    # Ownership
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    creator = relationship("User", back_populates="series")
    organization = relationship("Organization", back_populates="series")
    conversations = relationship("Conversation", back_populates="series", foreign_keys="Conversation.series_id")
    templates = relationship("Conversation", back_populates="series_template_rel", foreign_keys="Conversation.template_series_id")
    analysis = relationship("CollectionAnalysis", back_populates="series", uselist=False)

    def __repr__(self):
        return f"<Series(id={self.id}, name={self.name})>"

