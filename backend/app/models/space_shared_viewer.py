"""SpaceSharedViewer model for sharing spaces with specific users by email."""

from datetime import datetime
from sqlalchemy import Boolean, Column, String, DateTime, ForeignKey, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class SpaceSharedViewer(Base):
    """Tracks users who have been granted read-only access to a space.

    access_level controls what the viewer can see:
    - 'space': Full read-only access to the space (themes, ideas, graph, synthesis)
    - 'snapshots': Can only view snapshots, not the live space
    """

    __tablename__ = "space_shared_viewers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    email = Column(String(255), nullable=False, index=True)
    shared_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    shared_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    access_level = Column(String(20), nullable=False, default="snapshots")
    can_export = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    space = relationship("Space", back_populates="shared_viewers")
    shared_by = relationship("User", foreign_keys=[shared_by_id])
    shared_user = relationship("User", foreign_keys=[shared_user_id])

    __table_args__ = (
        UniqueConstraint("space_id", "email", name="uq_space_shared_viewers_space_email"),
        Index("idx_space_shared_viewers_space", "space_id"),
    )

    def __repr__(self):
        return f"<SpaceSharedViewer(id={self.id}, space_id={self.space_id}, email={self.email}, access_level={self.access_level})>"
