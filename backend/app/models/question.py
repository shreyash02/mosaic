"""Question model."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Question(Base):
    """Question model for conversations."""

    __tablename__ = "questions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)

    question_text = Column(Text, nullable=False)
    question_type = Column(String(50), default="text", nullable=False)
    # 'text', 'rating', 'single_choice', 'multiple_choice' (future)

    question_order = Column(Integer, nullable=False)

    # For future rating/poll support
    options = Column(JSONB, nullable=True)
    # e.g., [{"label": "Option 1", "value": 1}, ...]

    is_required = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="questions")
    responses = relationship("Response", back_populates="question", cascade="all, delete-orphan")

    # Constraints
    __table_args__ = (
        UniqueConstraint("conversation_id", "question_order", name="uq_conversation_question_order"),
    )

    def __repr__(self):
        return f"<Question(id={self.id}, conversation_id={self.conversation_id}, order={self.question_order})>"
