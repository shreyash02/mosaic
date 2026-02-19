"""JournalShare model for sharing journals with other users."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class JournalShare(Base):
    """Tracks journal sharing invitations and access.

    Journal owners can invite others to view their journals with two access tiers:
    - analysis_only: Can see AI insights but not raw entries
    - full: Can see everything (entries + insights)
    """

    __tablename__ = "journal_shares"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    journal_id = Column(
        UUID(as_uuid=True),
        ForeignKey("journals.id", ondelete="CASCADE"),
        nullable=False,
    )
    email = Column(String(255), nullable=False, index=True)
    shared_by_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    shared_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    share_type = Column(String(20), nullable=False, default="analysis_only")
    invitation_token = Column(String(100), unique=True, nullable=False, index=True)

    is_accepted = Column(Boolean, default=False, nullable=False)
    accepted_at = Column(DateTime, nullable=True)
    is_revoked = Column(Boolean, default=False, nullable=False)
    revoked_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    journal = relationship("Journal", back_populates="shares")
    shared_by = relationship("User", foreign_keys=[shared_by_id])
    shared_user = relationship("User", foreign_keys=[shared_user_id])

    __table_args__ = (
        Index("idx_journal_shares_journal", "journal_id"),
    )

    def __repr__(self):
        return f"<JournalShare(id={self.id}, journal_id={self.journal_id}, email={self.email}, share_type={self.share_type})>"
