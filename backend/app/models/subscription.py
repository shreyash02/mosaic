"""Subscription model for tier management."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, CheckConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Subscription(Base):
    """Subscription model for user or organization tier management."""

    __tablename__ = "subscriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Either user_id OR organization_id, not both
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)

    # Tier: 'free', 'basic', 'pro', 'enterprise'
    tier = Column(String(20), default='free', nullable=False)

    # Status: 'active', 'cancelled', 'expired'
    status = Column(String(20), default='active', nullable=False)

    # Subscription period
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)  # NULL = no expiration

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="subscription")
    organization = relationship("Organization", back_populates="subscription")

    __table_args__ = (
        CheckConstraint(
            "(user_id IS NOT NULL AND organization_id IS NULL) OR (user_id IS NULL AND organization_id IS NOT NULL)",
            name="ck_subscription_scope"
        ),
        Index("idx_subscription_user", "user_id", postgresql_where=user_id.isnot(None)),
        Index("idx_subscription_org", "organization_id", postgresql_where=organization_id.isnot(None)),
    )

    def __repr__(self):
        scope = f"user={self.user_id}" if self.user_id else f"org={self.organization_id}"
        return f"<Subscription({scope}, tier={self.tier}, status={self.status})>"
