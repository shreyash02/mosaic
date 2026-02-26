"""Tests for authentication endpoints."""
import pytest
from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from app.core.security import create_access_token, create_refresh_token


class TestRegister:
    """Tests for POST /api/auth/register"""

    def test_register_success(self, client):
        """Should register a new user and return user data."""
        payload = {
            "email": "newuser@example.com",
            "password": "strongpassword123",
            "full_name": "New User",
        }

        response = client.post("/api/auth/register", json=payload)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["full_name"] == "New User"
        assert "id" in data
        # Password hash should not be returned
        assert "password_hash" not in data

    def test_register_duplicate_email(self, client, test_user):
        """Should reject registration with an already-used email."""
        payload = {
            "email": test_user.email,
            "password": "strongpassword123",
            "full_name": "Duplicate User",
        }

        response = client.post("/api/auth/register", json=payload)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already registered" in response.json()["detail"].lower()

    def test_register_missing_email(self, client):
        """Should reject registration without email."""
        payload = {
            "password": "strongpassword123",
            "full_name": "No Email",
        }

        response = client.post("/api/auth/register", json=payload)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_missing_password(self, client):
        """Should reject registration without password."""
        payload = {
            "email": "nopass@example.com",
            "full_name": "No Password",
        }

        response = client.post("/api/auth/register", json=payload)

        # The schema requires password with min_length=8, so it should be 422
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_weak_password(self, client):
        """Should reject password shorter than 8 characters."""
        payload = {
            "email": "weak@example.com",
            "password": "short",
            "full_name": "Weak Password",
        }

        response = client.post("/api/auth/register", json=payload)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_register_invalid_email(self, client):
        """Should reject invalid email format."""
        payload = {
            "email": "not-an-email",
            "password": "strongpassword123",
            "full_name": "Bad Email",
        }

        response = client.post("/api/auth/register", json=payload)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestLogin:
    """Tests for POST /api/auth/login"""

    def test_login_success(self, client, test_user):
        """Should return access and refresh tokens for valid credentials."""
        payload = {
            "email": "test@example.com",
            "password": "testpassword123",
        }

        response = client.post("/api/auth/login", json=payload)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, test_user):
        """Should reject login with wrong password."""
        payload = {
            "email": "test@example.com",
            "password": "wrongpassword",
        }

        response = client.post("/api/auth/login", json=payload)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_nonexistent_email(self, client):
        """Should reject login for non-existent email."""
        payload = {
            "email": "nobody@example.com",
            "password": "somepassword123",
        }

        response = client.post("/api/auth/login", json=payload)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_missing_fields(self, client):
        """Should reject login with missing fields."""
        response = client.post("/api/auth/login", json={})

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestMe:
    """Tests for GET /api/auth/me"""

    def test_get_current_user(self, client, test_user):
        """Should return current user info for valid token."""
        headers = get_auth_headers(test_user.id)

        response = client.get("/api/auth/me", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == test_user.email
        assert data["full_name"] == test_user.full_name
        assert data["id"] == str(test_user.id)

    def test_get_current_user_unauthenticated(self, client):
        """Should reject request without auth token."""
        response = client.get("/api/auth/me")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_get_current_user_invalid_token(self, client):
        """Should reject request with invalid token."""
        headers = {"Authorization": "Bearer invalid-token-here"}

        response = client.get("/api/auth/me", headers=headers)

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_refresh_token_rejected_for_auth(self, client, test_user):
        """Should reject a refresh token used as an access token."""
        refresh_token = create_refresh_token(data={"sub": str(test_user.id)})
        headers = {"Authorization": f"Bearer {refresh_token}"}

        response = client.get("/api/auth/me", headers=headers)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestRefreshToken:
    """Tests for POST /api/auth/refresh"""

    def test_refresh_success(self, client, test_user):
        """Should return new tokens for a valid refresh token."""
        refresh_token = create_refresh_token(data={"sub": str(test_user.id)})

        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_refresh_invalid_token(self, client):
        """Should reject an invalid refresh token."""
        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": "totally-invalid-token"},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_with_access_token_fails(self, client, test_user):
        """Should reject an access token used as a refresh token."""
        access_token = create_access_token(data={"sub": str(test_user.id)})

        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": access_token},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_nonexistent_user(self, client):
        """Should reject refresh token for a user that doesn't exist."""
        from uuid import uuid4

        fake_user_id = str(uuid4())
        refresh_token = create_refresh_token(data={"sub": fake_user_id})

        response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
