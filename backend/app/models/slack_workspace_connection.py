"""Slack workspace connection model."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base


class SlackWorkspaceConnection(Base):
    """Slack workspace connection for an organization."""

    __tablename__ = "slack_workspace_connections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )

    # Slack workspace info
    slack_team_id = Column(String(50), nullable=False, unique=True)
    slack_team_name = Column(String(255), nullable=True)

    # Bot token (encrypted)
    bot_access_token_encrypted = Column(Text, nullable=False)
    bot_user_id = Column(String(50), nullable=True)

    # Installation metadata
    installed_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    installed_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)
    last_verified_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship("Organization", backref="slack_connection", uselist=False)
    installed_by = relationship("User")

    def __repr__(self):
        return f"<SlackWorkspaceConnection(org_id={self.organization_id}, team={self.slack_team_name})>"
