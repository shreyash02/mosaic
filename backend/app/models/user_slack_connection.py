"""User Slack connection model."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class UserSlackConnection(Base):
    """User's linked Slack account for reliable DM delivery."""

    __tablename__ = "user_slack_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Slack user info
    slack_user_id = Column(String(50), nullable=False)
    slack_team_id = Column(String(50), nullable=False)
    slack_display_name = Column(String(255), nullable=True)

    # Connection metadata
    connected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="slack_connections")

    # Constraints - one connection per user per workspace
    __table_args__ = (
        UniqueConstraint("user_id", "slack_team_id", name="uq_user_slack_team"),
    )

    def __repr__(self):
        return f"<UserSlackConnection(user_id={self.user_id}, slack_user_id={self.slack_user_id})>"
