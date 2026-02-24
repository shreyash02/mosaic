"""SpaceInvitation model for tracking invitations to spaces."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class SpaceInvitation(Base):
    """SpaceInvitation model for tracking user invitations to spaces."""

    __tablename__ = "space_invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(UUID(as_uuid=True), ForeignKey("spaces.id", ondelete="CASCADE"), nullable=False)

    # Invitation details
    email = Column(String(255), nullable=False, index=True)
    invited_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Optional: link to user if they have an account
    invited_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Invitation token for direct access
    invitation_token = Column(String(100), unique=True, nullable=True, index=True)

    # Role to assign when invitation is accepted
    role = Column(String(50), default="editor", nullable=False)

    # Status tracking
    is_accepted = Column(Boolean, default=False, nullable=False)
    accepted_at = Column(DateTime, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)

    # Relationships
    space = relationship("Space", back_populates="invitations")
    invited_by = relationship("User", foreign_keys=[invited_by_id])
    invited_user = relationship("User", foreign_keys=[invited_user_id])

    def __repr__(self):
        return f"<SpaceInvitation(id={self.id}, email={self.email}, is_accepted={self.is_accepted})>"


# Indexes for efficient querying
Index("idx_space_invitations_space", SpaceInvitation.space_id)
Index("idx_space_invitations_email", SpaceInvitation.email)
Index("idx_space_invitations_token", SpaceInvitation.invitation_token)
