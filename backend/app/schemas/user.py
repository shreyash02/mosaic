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
    profile_image_url: Optional[str] = None


# User creation schema (registration)
class UserCreate(UserBase):
    """Schema for user registration."""

    password: str = Field(..., min_length=8, max_length=100)
    invite_code: Optional[str] = None


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
    email_verified: bool = False
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
    email_verified: bool


class ProfileUpdate(BaseModel):
    """Schema for updating user profile."""

    full_name: Optional[str] = Field(None, max_length=255)
    profile_image_url: Optional[str] = Field(None, max_length=500)


class PasswordChangeRequest(BaseModel):
    """Schema for changing password (users with existing password)."""

    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)


class PasswordSetRequest(BaseModel):
    """Schema for setting password (OAuth-only users)."""

    new_password: str = Field(..., min_length=8, max_length=100)


class ForgotPasswordRequest(BaseModel):
    """Schema for requesting password reset."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Schema for resetting password with token."""

    token: str
    new_password: str = Field(..., min_length=8, max_length=100)


class VerifyEmailRequest(BaseModel):
    """Schema for verifying email with token."""

    token: str


class ResendVerificationRequest(BaseModel):
    """Schema for requesting a new verification email."""

    email: EmailStr


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


# Onboarding progress
class OnboardingProgress(BaseModel):
    """User onboarding progress for the getting started checklist."""

    # Step completion status: step_id -> completed
    steps: dict[str, bool] = {}

    # Step completion timestamps: step_id -> ISO timestamp
    completed_at: dict[str, str] = {}

    # Whether the checklist has been dismissed
    dismissed: bool = False

    # When the user started onboarding
    started_at: Optional[str] = None


# Default onboarding progress (all steps incomplete)
DEFAULT_ONBOARDING_PROGRESS = OnboardingProgress()


def get_onboarding_progress(progress_dict: Optional[dict]) -> OnboardingProgress:
    """Get onboarding progress from dict, using defaults for missing values."""
    if progress_dict is None:
        return DEFAULT_ONBOARDING_PROGRESS
    return OnboardingProgress(**{**DEFAULT_ONBOARDING_PROGRESS.model_dump(), **progress_dict})
