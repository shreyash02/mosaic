"""SpaceSnapshot model for point-in-time space snapshots."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class SpaceSnapshot(Base):
    """A point-in-time snapshot of a space's state (themes, ideas, graph, synthesis)."""

    __tablename__ = "space_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    title = Column(String(200), nullable=True)
    snapshot_type = Column(String(20), nullable=False, default="manual")  # 'manual' or 'organize'
    snapshot_data = Column(JSONB, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    space = relationship("Space", foreign_keys=[space_id])
    created_by = relationship("User", foreign_keys=[created_by_id])

    __table_args__ = (
        Index("idx_space_snapshots_space", "space_id"),
    )

    def __repr__(self):
        return f"<SpaceSnapshot(id={self.id}, space_id={self.space_id})>"
