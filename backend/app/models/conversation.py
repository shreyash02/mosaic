"""Conversation model."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Conversation(Base):
    """Conversation model for collecting anonymous opinions or responses to questions/polls."""

    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Ownership
    creator_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)

    # Basic info
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)

    # Invite & access
    invite_code = Column(String(50), unique=True, nullable=False, index=True)

    # Configuration
    anonymity_level = Column(String(50), nullable=False)
    # 'fully_anonymous', 'platform_tracked', 'revealable'

    max_response_length = Column(Integer, default=10000, nullable=False)

    results_access = Column(String(50), nullable=False)
    # 'invite_code_holders', 'public_link'

    auto_analyze = Column(Boolean, default=False, nullable=False)
    # if true, trigger analysis automatically when conversation closes

    # Timing
    auto_close_at = Column(DateTime, nullable=True)
    manual_close_enabled = Column(Boolean, default=True, nullable=False)
    time_extension_enabled = Column(Boolean, default=True, nullable=False)

    # State
    state = Column(String(50), default="draft", nullable=False)
    # 'draft', 'active', 'closed', 'analyzed', 'deleted'

    activated_at = Column(DateTime, nullable=True)
    closed_at = Column(DateTime, nullable=True)
    analyzed_at = Column(DateTime, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    creator = relationship("User", back_populates="conversations")
    organization = relationship("Organization", back_populates="conversations")
    questions = relationship("Question", back_populates="conversation", cascade="all, delete-orphan", order_by="Question.question_order")
    responses = relationship("Response", back_populates="conversation", cascade="all, delete-orphan")
    analyses = relationship("Analysis", back_populates="conversation", cascade="all, delete-orphan")
    invite_codes = relationship("InviteCode", back_populates="conversation", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Conversation(id={self.id}, title={self.title}, state={self.state})>"
