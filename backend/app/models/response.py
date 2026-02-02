"""Response model."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Response(Base):
    """Response model for user submissions."""

    __tablename__ = "responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(UUID(as_uuid=True), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)

    # Response content
    response_text = Column(Text, nullable=True)
    response_data = Column(JSONB, nullable=True)  # for structured responses (ratings, polls)

    # Anonymity handling
    anonymity_level = Column(String(50), nullable=False)
    # mirrors the conversation's anonymity_level at submission time

    # Optional tracking (ONLY if anonymity_level != 'fully_anonymous')
    # This field is NULL for fully_anonymous responses
    participant_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # For fully_anonymous: unique participant code per participant
    # Each participant gets a unique code, used once
    participant_code_used = Column(String(100), nullable=True)

    # Consent for revealing (only for 'revealable' anonymity_level)
    reveal_consent = Column(Boolean, default=False, nullable=False)

    # Draft status: 'draft' or 'submitted'
    status = Column(String(20), default="draft", nullable=False)

    # When the draft was last saved (for drafts)
    last_saved_at = Column(DateTime, nullable=True)

    # When response was submitted (null for drafts)
    submitted_at = Column(DateTime, nullable=True)

    # Flag for test/generated data (for cleanup purposes)
    is_test_data = Column(Boolean, default=False, nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="responses")
    question = relationship("Question", back_populates="responses")
    participant = relationship("User", back_populates="responses")

    def __repr__(self):
        return f"<Response(id={self.id}, conversation_id={self.conversation_id}, anonymity={self.anonymity_level})>"


# Indexes for efficient querying
Index("idx_responses_conversation", Response.conversation_id)
Index("idx_responses_participant", Response.participant_id)
Index("idx_responses_participant_code", Response.participant_code_used)
Index("idx_responses_status", Response.status)
Index("idx_responses_draft_lookup", Response.conversation_id, Response.participant_code_used, Response.status)
Index("idx_responses_draft_lookup_user", Response.conversation_id, Response.participant_id, Response.status)
Index("idx_responses_is_test_data", Response.is_test_data)
