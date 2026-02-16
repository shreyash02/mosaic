"""Notification model for in-app notifications."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class Notification(Base):
    """In-app notification model."""

    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Notification content
    notification_type = Column(String(50), nullable=False)  # response_submitted, analysis_ready, etc.
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)

    # Related entity (optional)
    entity_type = Column(String(50), nullable=True)  # 'conversation', 'analysis', etc.
    entity_id = Column(UUID(as_uuid=True), nullable=True)

    # Additional data (action_url, metadata)
    data = Column(JSON, nullable=True)

    # Read status
    read = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="notifications")

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type={self.notification_type})>"


# Indexes for efficient querying
Index("idx_notifications_user_id", Notification.user_id)
Index("idx_notifications_type", Notification.notification_type)
Index("idx_notifications_read", Notification.read)
Index("idx_notifications_created_at", Notification.created_at)
Index("idx_notifications_user_read", Notification.user_id, Notification.read)
