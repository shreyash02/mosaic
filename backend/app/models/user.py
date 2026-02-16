"""User model."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class User(Base):
    """User model for authentication and ownership."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth users
    full_name = Column(String(255), nullable=True)
    profile_image_url = Column(String(500), nullable=True)  # Profile picture URL
    google_id = Column(String(255), nullable=True, unique=True, index=True)  # Google OAuth ID

    # Email preferences - JSON with boolean flags for each email type
    # Default: all enabled (None means use defaults)
    email_preferences = Column(JSON, nullable=True)

    # Onboarding progress - tracks completion of getting started steps
    onboarding_progress = Column(JSON, nullable=True)

    # Password reset fields
    password_reset_token = Column(String(255), nullable=True, index=True)
    password_reset_expires = Column(DateTime, nullable=True)

    # Email verification fields
    email_verified = Column(Boolean, default=False, nullable=False)
    email_verification_token = Column(String(64), nullable=True, index=True)
    email_verification_expires = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    conversations = relationship("Conversation", back_populates="creator", cascade="all, delete-orphan")
    organizations_created = relationship("Organization", back_populates="creator", cascade="all, delete-orphan")
    organization_memberships = relationship("OrganizationMember", back_populates="user", cascade="all, delete-orphan")
    responses = relationship("Response", back_populates="participant", cascade="all, delete-orphan")
    series = relationship("Series", back_populates="creator", cascade="all, delete-orphan")
    subscription = relationship("Subscription", back_populates="user", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email})>"
