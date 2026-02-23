"""SpaceMember model for collaborative spaces."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class SpaceMember(Base):
    """Space membership model."""

    __tablename__ = "space_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), default="member", nullable=False)  # owner, member

    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    space = relationship("Space", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])

    # Constraints
    __table_args__ = (
        UniqueConstraint("space_id", "user_id", name="uq_space_user"),
    )

    def __repr__(self):
        return f"<SpaceMember(space_id={self.space_id}, user_id={self.user_id}, role={self.role})>"
