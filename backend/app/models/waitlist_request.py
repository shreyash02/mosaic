"""Waitlist request model for access requests."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class WaitlistRequest(Base):
    """Access requests from the public waitlist."""

    __tablename__ = "waitlist_requests"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    message = Column(String(1000), nullable=True)
    status = Column(String(20), nullable=False, default="pending")  # "pending" / "approved" / "rejected"
    processed_by_admin_id = Column(UUID(as_uuid=True), ForeignKey("admins.id"), nullable=True)
    processed_at = Column(DateTime, nullable=True)
    admin_note = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        Index("ix_waitlist_requests_email", "email"),
        Index("ix_waitlist_requests_status", "status"),
    )
