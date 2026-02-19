"""Feature flag models."""

import re
from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, UniqueConstraint, CheckConstraint, Index, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from a name."""
    # Lowercase and replace spaces/special chars with underscores
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9]+', '_', slug)
    # Strip leading/trailing underscores
    slug = slug.strip('_')
    return slug


class FeatureFlag(Base):
    """Global feature flag definition."""

    __tablename__ = "feature_flags"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)  # Human-readable name
    slug = Column(String(100), unique=True, nullable=False, index=True)  # URL-friendly identifier
    description = Column(Text, nullable=True)

    # Default state
    enabled = Column(Boolean, nullable=False, default=False)

    # Default configuration (JSONB for flexible key-value pairs)
    config = Column(JSONB, nullable=False, default=dict)

    # Display ordering for admin UI
    display_order = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    overrides = relationship("FeatureFlagOverride", back_populates="flag", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<FeatureFlag(slug={self.slug}, enabled={self.enabled})>"


class FeatureFlagOverride(Base):
    """Tier, organization, or user-level override for a feature flag."""

    __tablename__ = "feature_flag_overrides"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    flag_id = Column(UUID(as_uuid=True), ForeignKey("feature_flags.id", ondelete="CASCADE"), nullable=False)

    # Scope: at least one must be set (tier, org, or user)
    tier = Column(String(20), nullable=True)  # 'free', 'basic', 'pro', 'enterprise'
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)

    # Override values (null = inherit from parent level)
    enabled = Column(Boolean, nullable=True)

    # Partial config override (deep merged with parent config)
    config_override = Column(JSONB, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    flag = relationship("FeatureFlag", back_populates="overrides")
    organization = relationship("Organization")
    user = relationship("User")

    __table_args__ = (
        # Ensure at least one scope is set (tier, org_id, or user_id)
        CheckConstraint(
            "(tier IS NOT NULL) OR (organization_id IS NOT NULL) OR (user_id IS NOT NULL)",
            name="ck_override_has_scope"
        ),
        # Unique constraint: one override per flag/scope combination
        UniqueConstraint("flag_id", "tier", "organization_id", "user_id", name="uq_flag_override_scope"),
        # Indexes for efficient lookups
        Index("idx_override_flag_tier", "flag_id", "tier"),
        Index("idx_override_flag_org", "flag_id", "organization_id"),
        Index("idx_override_flag_user", "flag_id", "user_id"),
    )

    def __repr__(self):
        scope_parts = []
        if self.tier:
            scope_parts.append(f"tier={self.tier}")
        if self.organization_id:
            scope_parts.append(f"org={self.organization_id}")
        if self.user_id:
            scope_parts.append(f"user={self.user_id}")
        scope = ", ".join(scope_parts)
        return f"<FeatureFlagOverride(flag_id={self.flag_id}, {scope}, enabled={self.enabled})>"


class FeatureUsage(Base):
    """Track feature usage for limit enforcement."""

    __tablename__ = "feature_usage"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Either user_id OR organization_id, not both
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)

    feature_slug = Column(String(100), nullable=False)
    period = Column(String(7), nullable=False)  # 'YYYY-MM' format
    usage_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User")
    organization = relationship("Organization")

    __table_args__ = (
        # Either user_id OR organization_id, not both
        CheckConstraint(
            "(user_id IS NOT NULL AND organization_id IS NULL) OR (user_id IS NULL AND organization_id IS NOT NULL)",
            name="ck_usage_scope"
        ),
    )

    def __repr__(self):
        scope = f"user={self.user_id}" if self.user_id else f"org={self.organization_id}"
        return f"<FeatureUsage({scope}, {self.feature_slug}, {self.period}, count={self.usage_count})>"
