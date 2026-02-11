"""Slack integration schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class SlackInstallInitiate(BaseModel):
    """Response when initiating Slack OAuth flow."""

    redirect_url: str


class SlackWorkspaceStatus(BaseModel):
    """Slack workspace connection status."""

    connected: bool
    slack_team_id: Optional[str] = None
    slack_team_name: Optional[str] = None
    installed_at: Optional[datetime] = None
    installed_by_name: Optional[str] = None


class SlackWorkspaceConnection(BaseModel):
    """Slack workspace connection returned in responses."""

    id: UUID
    organization_id: UUID
    slack_team_id: str
    slack_team_name: Optional[str]
    installed_at: datetime
    is_active: bool

    model_config = {"from_attributes": True}


class UserSlackStatus(BaseModel):
    """User's Slack connection status."""

    linked: bool
    slack_user_id: Optional[str] = None
    slack_team_id: Optional[str] = None
    slack_display_name: Optional[str] = None
    connected_at: Optional[datetime] = None


class UserSlackConnection(BaseModel):
    """User Slack connection returned in responses."""

    id: UUID
    user_id: UUID
    slack_user_id: str
    slack_team_id: str
    slack_display_name: Optional[str]
    connected_at: datetime
    is_active: bool

    model_config = {"from_attributes": True}


class SlackCallbackResponse(BaseModel):
    """Response after successful Slack OAuth callback."""

    success: bool
    message: str
    workspace_name: Optional[str] = None
