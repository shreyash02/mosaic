"""ConversationInvitation model."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class ConversationInvitation(Base):
    """ConversationInvitation model for tracking user invitations to conversations."""

    __tablename__ = "conversation_invitations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    
    # Invitation details
    email = Column(String(255), nullable=False, index=True)
    invited_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Optional: link to user if they have an account
    invited_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Invitation token for direct access (optional, can use access_code + email match)
    invitation_token = Column(String(100), unique=True, nullable=True, index=True)
    
    # Status tracking
    is_accepted = Column(Boolean, default=False, nullable=False)
    accepted_at = Column(DateTime, nullable=True)

    # Notification tracking
    closing_warning_sent_at = Column(DateTime, nullable=True)  # When closing warning email was sent

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)  # Optional expiration

    # Relationships
    conversation = relationship("Conversation", back_populates="invitations")
    invited_by = relationship("User", foreign_keys=[invited_by_id], backref="invitations_sent")
    invited_user = relationship("User", foreign_keys=[invited_user_id], backref="invitations_received")

    def __repr__(self):
        return f"<ConversationInvitation(id={self.id}, email={self.email}, is_accepted={self.is_accepted})>"


# Indexes for efficient querying
Index("idx_conversation_invitations_conversation", ConversationInvitation.conversation_id)
Index("idx_conversation_invitations_email", ConversationInvitation.email)
Index("idx_conversation_invitations_token", ConversationInvitation.invitation_token)

