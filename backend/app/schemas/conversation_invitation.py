"""Conversation invitation schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr

from app.schemas.user import User as UserSchema
from app.schemas.conversation import ConversationListItem


class ConversationInvitationBase(BaseModel):
    """Base invitation schema."""

    email: EmailStr = Field(..., description="Email address of the invited user")


class ConversationInvitationCreate(ConversationInvitationBase):
    """Schema for creating an invitation."""

    pass


class ConversationInvitation(ConversationInvitationBase):
    """Schema for invitation response."""

    id: UUID
    conversation_id: UUID
    invited_by_id: Optional[UUID] = None
    invited_user_id: Optional[UUID] = None
    invitation_token: Optional[str] = None
    is_accepted: bool
    accepted_at: Optional[datetime] = None
    created_at: datetime
    expires_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ConversationInvitationWithUser(ConversationInvitation):
    """Invitation schema with user details."""

    invited_user: Optional[UserSchema] = None
    has_submitted_response: bool = Field(default=False, description="Whether the invited user has submitted a response")


class InviteUsersRequest(BaseModel):
    """Schema for inviting multiple users."""

    emails: List[EmailStr] = Field(..., min_items=1, max_items=100, description="List of email addresses to invite")


class InviteUsersResponse(BaseModel):
    """Schema for invite users response."""

    conversation_id: UUID
    invitations_created: int
    invitations: List[ConversationInvitation]


class InvitationListResponse(BaseModel):
    """Schema for listing invitations."""

    conversation_id: UUID
    total_invitations: int
    accepted_invitations: int
    pending_invitations: int
    invitations: List[ConversationInvitationWithUser]


class ConversationInvitationWithConversation(ConversationInvitation):
    """Invitation schema with conversation details."""

    conversation: ConversationListItem

