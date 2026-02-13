"""User schemas."""

from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


# Base User schema
class UserBase(BaseModel):
    """Base user schema."""

    email: EmailStr
    full_name: Optional[str] = None


# User creation schema (registration)
class UserCreate(UserBase):
    """Schema for user registration."""

    password: str = Field(..., min_length=8, max_length=100)


# User update schema
class UserUpdate(BaseModel):
    """Schema for user update."""

    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8, max_length=100)


# User in database
class User(UserBase):
    """User schema returned in responses."""

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Authentication schemas
class Token(BaseModel):
    """JWT token response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data."""

    user_id: Optional[UUID] = None
    email: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request schema."""

    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema."""

    refresh_token: str


# Profile and settings schemas
class UserWithAuthInfo(User):
    """User with auth method indicators for profile pages."""

    has_password: bool
    has_google: bool


class ProfileUpdate(BaseModel):
    """Schema for updating user profile."""

    full_name: Optional[str] = Field(None, max_length=255)


class PasswordChangeRequest(BaseModel):
    """Schema for changing password (users with existing password)."""

    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)


class PasswordSetRequest(BaseModel):
    """Schema for setting password (OAuth-only users)."""

    new_password: str = Field(..., min_length=8, max_length=100)


# Email preferences
class EmailPreferences(BaseModel):
    """User email notification preferences."""

    # Invitation emails
    conversation_invitations: bool = True
    organization_invitations: bool = True

    # Reminder emails
    closing_reminders: bool = True

    # Announcement emails
    announcements: bool = True

    # Results and analysis emails
    conversation_closed: bool = True
    analysis_ready: bool = True
    periodic_analysis: bool = True

    # Recurring conversation emails
    recurring_instances: bool = True


# Default preferences (all enabled)
DEFAULT_EMAIL_PREFERENCES = EmailPreferences()


def get_email_preferences(prefs_dict: Optional[dict]) -> EmailPreferences:
    """Get email preferences from dict, using defaults for missing values."""
    if prefs_dict is None:
        return DEFAULT_EMAIL_PREFERENCES
    return EmailPreferences(**{**DEFAULT_EMAIL_PREFERENCES.model_dump(), **prefs_dict})
