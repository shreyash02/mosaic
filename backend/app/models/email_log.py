"""Email Log model for tracking email send attempts."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class EmailLog(Base):
    """Tracks every email send attempt (sent or failed)."""

    __tablename__ = "email_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    recipient_email = Column(String, nullable=False)
    email_type = Column(String, nullable=False)  # e.g. "invitation", "password_reset"
    subject = Column(String, nullable=True)
    status = Column(String, nullable=False)  # "sent" or "failed"
    error_message = Column(Text, nullable=True)
    conversation_id = Column(UUID(as_uuid=True), nullable=True)
    organization_id = Column(UUID(as_uuid=True), nullable=True)
    user_id = Column(UUID(as_uuid=True), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_email_logs_created_at", "created_at"),
        Index("ix_email_logs_email_type", "email_type"),
        Index("ix_email_logs_status", "status"),
    )
