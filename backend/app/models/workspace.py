"""Workspace models."""

from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from app.core.database import Base

# Ordered from least to most privileged
WORKSPACE_ROLES = ["viewer", "editor", "admin"]


def has_minimum_role(member_role: str, required_role: str) -> bool:
    """Check if member_role meets or exceeds the required_role level."""
    if member_role not in WORKSPACE_ROLES or required_role not in WORKSPACE_ROLES:
        return False
    return WORKSPACE_ROLES.index(member_role) >= WORKSPACE_ROLES.index(required_role)


class Workspace(Base):
    """Workspace model — first-class container for conversations, journals, spaces."""

    __tablename__ = "workspaces"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(String(50), nullable=False)  # 'personal' or 'organization'
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_default = Column(Boolean, nullable=False, default=True)
    visibility = Column(String(20), nullable=False, default="open")

    __table_args__ = (
        CheckConstraint("visibility IN ('open', 'private')", name="ck_workspace_visibility"),
    )

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="workspaces")
    owner = relationship("User", back_populates="workspaces_owned")
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Workspace(id={self.id}, type={self.type}, name={self.name})>"


class WorkspaceMember(Base):
    """Workspace membership model."""

    __tablename__ = "workspace_members"

    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role = Column(String(50), nullable=False, default="editor")
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_memberships")

    def __repr__(self):
        return f"<WorkspaceMember(workspace_id={self.workspace_id}, user_id={self.user_id}, role={self.role})>"
