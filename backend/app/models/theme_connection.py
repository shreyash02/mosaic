"""ThemeConnection model for theme-to-theme edges in the network graph."""

from datetime import datetime
from sqlalchemy import Column, Float, Text, DateTime, ForeignKey, CheckConstraint, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class ThemeConnection(Base):
    """An edge between two themes representing their relatedness."""

    __tablename__ = "theme_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    theme_a_id = Column(
        UUID(as_uuid=True),
        ForeignKey("themes.id", ondelete="CASCADE"),
        nullable=False,
    )
    theme_b_id = Column(
        UUID(as_uuid=True),
        ForeignKey("themes.id", ondelete="CASCADE"),
        nullable=False,
    )
    strength = Column(Float, default=0.0, nullable=False)  # 0-1
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    space = relationship("Space", back_populates="theme_connections")
    theme_a = relationship("Theme", foreign_keys=[theme_a_id])
    theme_b = relationship("Theme", foreign_keys=[theme_b_id])

    __table_args__ = (
        CheckConstraint("theme_a_id < theme_b_id", name="ck_theme_connection_ordered"),
        UniqueConstraint("theme_a_id", "theme_b_id", name="uq_theme_connection_pair"),
        Index("idx_theme_connections_space", "space_id"),
    )

    def __repr__(self):
        return f"<ThemeConnection(theme_a={self.theme_a_id}, theme_b={self.theme_b_id}, strength={self.strength})>"
