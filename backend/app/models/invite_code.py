"""Invite code model for registration gating."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class InviteCode(Base):
    """Invite codes for gated registration."""

    __tablename__ = "invite_codes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(20), unique=True, nullable=False, index=True)
    code_type = Column(String(20), nullable=False)  # "admin" / "referral" / "waitlist"
    status = Column(String(20), nullable=False, default="available")  # "available" / "used" / "revoked"
    created_by_admin_id = Column(UUID(as_uuid=True), ForeignKey("admins.id"), nullable=True)
    created_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    used_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    used_at = Column(DateTime, nullable=True)
    label = Column(String(255), nullable=True)
    waitlist_request_id = Column(UUID(as_uuid=True), ForeignKey("waitlist_requests.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_invite_codes_status", "status"),
    )
