"""Conversation preset model."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class ConversationPreset(Base):
    """Conversation preset model for saving reusable privacy/access settings."""

    __tablename__ = "conversation_presets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Ownership (personal or org-level)
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="SET NULL"), nullable=False, index=True)

    # Preset info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(50), default='clipboard', nullable=False)
    # Valid icons: clipboard, lightning, chart, chat, target, users, lock, globe, inbox, sparkles

    # Privacy/access configuration
    anonymity_level = Column(String(50), nullable=False)
    # 'fully_anonymous', 'platform_tracked', 'revealable'
    results_access = Column(String(50), nullable=False)
    # 'creator_only', 'participants', 'public_link'
    show_verbatim_responses = Column(Boolean, default=False, nullable=False)
    invite_only = Column(Boolean, default=True, nullable=False)

    # Step behavior
    skip_steps = Column(ARRAY(String), nullable=True)
    # e.g., ['timing', 'notifications']

    # Metadata
    is_archived = Column(Boolean, default=False, nullable=False)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    creator = relationship("User", back_populates="conversation_presets")
    organization = relationship("Organization", back_populates="conversation_presets")
    workspace = relationship("Workspace")

    def __repr__(self):
        return f"<ConversationPreset(id={self.id}, name={self.name})>"
