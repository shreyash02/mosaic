"""Contract tests for authentication endpoints.

Validates that backend responses match the shapes expected by
the frontend TypeScript types in frontend/src/types/index.ts.
"""
import pytest
from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from tests.contract.shapes import (
    assert_shape,
    USER_SHAPE,
    AUTH_RESPONSE_SHAPE,
    USER_WITH_AUTH_INFO_SHAPE,
    EMAIL_PREFERENCES_SHAPE,
    ONBOARDING_PROGRESS_SHAPE,
)


class TestRegisterContract:
    """POST /api/auth/register → User shape"""

    def test_register_returns_user_shape(self, client):
        payload = {
            "email": "contract@example.com",
            "password": "testpassword123",
            "full_name": "Contract User",
        }
        response = client.post("/api/auth/register", json=payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert_shape(response.json(), USER_SHAPE, "register response")

    def test_register_does_not_expose_password(self, client):
        payload = {
            "email": "nopw@example.com",
            "password": "testpassword123",
            "full_name": "No PW User",
        }
        data = client.post("/api/auth/register", json=payload).json()
        assert "password" not in data
        assert "password_hash" not in data


class TestLoginContract:
    """POST /api/auth/login → AuthResponse shape"""

    def test_login_returns_auth_response_shape(self, client, test_user):
        payload = {"email": "test@example.com", "password": "testpassword123"}
        response = client.post("/api/auth/login", json=payload)
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), AUTH_RESPONSE_SHAPE, "login response")

    def test_login_token_type_is_bearer(self, client, test_user):
        payload = {"email": "test@example.com", "password": "testpassword123"}
        data = client.post("/api/auth/login", json=payload).json()
        assert data["token_type"] == "bearer"


class TestGetCurrentUserContract:
    """GET /api/auth/me → User shape"""

    def test_me_returns_user_shape(self, client, test_user):
        headers = get_auth_headers(test_user.id)
        response = client.get("/api/auth/me", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), USER_SHAPE, "me response")

    def test_me_unauthenticated_returns_error(self, client):
        response = client.get("/api/auth/me")
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )


class TestProfileContract:
    """GET /api/auth/me/profile → UserWithAuthInfo shape"""

    def test_profile_returns_auth_info_shape(self, client, test_user):
        headers = get_auth_headers(test_user.id)
        response = client.get("/api/auth/me/profile", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), USER_WITH_AUTH_INFO_SHAPE, "profile response")


class TestEmailPreferencesContract:
    """GET/PUT /api/auth/email-preferences → EmailPreferences shape"""

    def test_get_email_preferences_shape(self, client, test_user):
        headers = get_auth_headers(test_user.id)
        response = client.get("/api/auth/email-preferences", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), EMAIL_PREFERENCES_SHAPE, "email prefs")

    def test_update_email_preferences_returns_same_shape(self, client, test_user):
        headers = get_auth_headers(test_user.id)
        payload = {
            "conversation_invitations": False,
            "organization_invitations": True,
            "closing_reminders": False,
            "announcements": True,
            "conversation_closed": True,
            "analysis_ready": False,
            "periodic_analysis": True,
            "recurring_instances": True,
        }
        response = client.put("/api/auth/email-preferences", json=payload, headers=headers)
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), EMAIL_PREFERENCES_SHAPE, "updated email prefs")


class TestOnboardingContract:
    """GET/PUT /api/auth/onboarding → OnboardingProgress shape"""

    def test_get_onboarding_shape(self, client, test_user):
        headers = get_auth_headers(test_user.id)
        response = client.get("/api/auth/onboarding", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), ONBOARDING_PROGRESS_SHAPE, "onboarding")
