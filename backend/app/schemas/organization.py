"""Organization schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field, EmailStr

from app.schemas.user import User


# Organization schemas
class OrganizationBase(BaseModel):
    """Base organization schema."""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    brand_logo_url: Optional[str] = Field(None, max_length=500, description="Brand logo URL for QR code posters and other branding")
    brand_name: Optional[str] = Field(None, max_length=255, description="Brand name displayed on QR code posters")


class OrganizationCreate(OrganizationBase):
    """Schema for creating an organization."""

    pass


class OrganizationUpdate(BaseModel):
    """Schema for updating an organization."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    brand_logo_url: Optional[str] = Field(None, max_length=500, description="Brand logo URL for QR code posters and other branding")
    brand_name: Optional[str] = Field(None, max_length=255, description="Brand name displayed on QR code posters")


class Organization(OrganizationBase):
    """Organization schema returned in responses."""

    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Organization Member schemas
class OrganizationMemberBase(BaseModel):
    """Base organization member schema."""

    role: str = Field(default="member", pattern="^(admin|member)$")


class OrganizationMemberCreate(BaseModel):
    """Schema for adding a member to an organization."""

    user_id: UUID
    role: str = Field(default="member", pattern="^(admin|member)$")


class OrganizationMemberUpdate(BaseModel):
    """Schema for updating organization membership."""

    role: str = Field(..., pattern="^(admin|member)$")


class OrganizationMember(OrganizationMemberBase):
    """Organization member schema returned in responses."""

    id: UUID
    organization_id: UUID
    user_id: UUID
    joined_at: datetime
    user: Optional[User] = None

    model_config = {"from_attributes": True}


# Organization with members
class OrganizationWithMembers(Organization):
    """Organization schema with member list."""

    members: List[OrganizationMember] = []

    model_config = {"from_attributes": True}


# Organization Invitation schemas
class InviteToOrganizationRequest(BaseModel):
    """Schema for inviting users to an organization."""

    emails: List[EmailStr] = Field(..., min_items=1, max_items=50)
    role: str = Field(default="member", pattern="^(admin|member)$")


class OrganizationInvitation(BaseModel):
    """Organization invitation schema returned in responses."""

    id: UUID
    organization_id: UUID
    email: EmailStr
    invited_by_id: Optional[UUID]
    invited_user_id: Optional[UUID]
    invitation_token: str
    role: str
    is_accepted: bool
    accepted_at: Optional[datetime]
    created_at: datetime
    expires_at: Optional[datetime]

    model_config = {"from_attributes": True}


class InviteToOrganizationResponse(BaseModel):
    """Response after sending organization invitations."""

    organization_id: UUID
    invitations_created: int
    invitations: List[OrganizationInvitation]


class OrganizationInvitationListResponse(BaseModel):
    """Response for listing all invitations for an organization."""

    organization_id: UUID
    total_invitations: int
    accepted_invitations: int
    pending_invitations: int
    invitations: List[OrganizationInvitation]
