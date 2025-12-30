"""Organization invitation model."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class OrganizationInvitation(Base):
    """Organization invitation model for inviting users to join organizations."""

    __tablename__ = "organization_invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)

    # Invitation details
    email = Column(String(255), nullable=False, index=True)
    invited_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    invited_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Role to assign when accepted
    role = Column(String(50), default="member", nullable=False)

    # Invitation token for direct access
    invitation_token = Column(String(100), unique=True, nullable=False, index=True)

    # Status tracking
    is_accepted = Column(Boolean, default=False, nullable=False)
    accepted_at = Column(DateTime, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)  # Optional expiration

    # Relationships
    organization = relationship("Organization", backref="invitations")
    invited_by = relationship("User", foreign_keys=[invited_by_id])
    invited_user = relationship("User", foreign_keys=[invited_user_id])

    def __repr__(self):
        return f"<OrganizationInvitation(id={self.id}, email={self.email}, organization_id={self.organization_id})>"
