"""Tests for notification management routes."""
import pytest
from datetime import datetime
from uuid import uuid4

from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from app.models.notification import Notification


class TestListNotifications:
    """Tests for GET /api/notifications"""

    def test_list_success(self, client, test_user, test_notifications):
        """Should return user's notifications."""
        headers = get_auth_headers(test_user.id)

        response = client.get("/api/notifications", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 5
        assert len(data["notifications"]) == 5

    def test_list_empty(self, client, second_test_user):
        """Should return empty for user with no notifications."""
        headers = get_auth_headers(second_test_user.id)

        response = client.get("/api/notifications", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 0
        assert data["notifications"] == []

    def test_list_unread_only(self, client, test_user, test_notifications):
        """Should filter to unread-only notifications."""
        headers = get_auth_headers(test_user.id)

        response = client.get("/api/notifications?unread_only=true", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # 3 unread out of 5 total
        assert data["total"] == 3
        for n in data["notifications"]:
            assert n["read"] is False

    def test_list_pagination(self, client, test_user, test_notifications):
        """Should support limit and offset."""
        headers = get_auth_headers(test_user.id)

        response = client.get("/api/notifications?limit=2&offset=0", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["notifications"]) == 2
        assert data["has_more"] is True

    def test_list_unauthenticated(self, client):
        """Should reject unauthenticated requests."""
        response = client.get("/api/notifications")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]


class TestUnreadCount:
    """Tests for GET /api/notifications/unread-count"""

    def test_unread_count(self, client, test_user, test_notifications):
        """Should return correct unread count."""
        headers = get_auth_headers(test_user.id)

        response = client.get("/api/notifications/unread-count", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["count"] == 3  # 3 unread

    def test_unread_count_zero(self, client, second_test_user):
        """Should return zero for user with no notifications."""
        headers = get_auth_headers(second_test_user.id)

        response = client.get("/api/notifications/unread-count", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["count"] == 0


class TestMarkRead:
    """Tests for POST /api/notifications/{notification_id}/read"""

    def test_mark_read_success(self, client, test_user, test_notifications):
        """Should mark a notification as read."""
        # Find an unread notification
        unread = [n for n in test_notifications if not n.read][0]
        headers = get_auth_headers(test_user.id)

        response = client.post(
            f"/api/notifications/{unread.id}/read", headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["read"] is True

    def test_mark_read_wrong_user(self, client, second_test_user, test_notifications):
        """Should return 404 for another user's notification."""
        notif = test_notifications[0]
        headers = get_auth_headers(second_test_user.id)

        response = client.post(
            f"/api/notifications/{notif.id}/read", headers=headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_mark_already_read(self, client, test_user, test_notifications):
        """Should be idempotent for already-read notifications."""
        read_notif = [n for n in test_notifications if n.read][0]
        headers = get_auth_headers(test_user.id)

        response = client.post(
            f"/api/notifications/{read_notif.id}/read", headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["read"] is True


class TestMarkAllRead:
    """Tests for POST /api/notifications/mark-all-read"""

    def test_mark_all_read(self, client, test_user, test_notifications):
        """Should mark all user's notifications as read."""
        headers = get_auth_headers(test_user.id)

        response = client.post("/api/notifications/mark-all-read", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["updated_count"] == 3  # 3 were unread

    def test_mark_all_read_none_unread(self, client, second_test_user):
        """Should return 0 when no unread notifications."""
        headers = get_auth_headers(second_test_user.id)

        response = client.post("/api/notifications/mark-all-read", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["updated_count"] == 0


class TestDeleteNotification:
    """Tests for DELETE /api/notifications/{notification_id}"""

    def test_delete_success(self, client, test_user, test_notifications):
        """Should delete a notification."""
        notif = test_notifications[0]
        headers = get_auth_headers(test_user.id)

        response = client.delete(
            f"/api/notifications/{notif.id}", headers=headers
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_wrong_user(self, client, second_test_user, test_notifications):
        """Should return 404 for another user's notification."""
        notif = test_notifications[0]
        headers = get_auth_headers(second_test_user.id)

        response = client.delete(
            f"/api/notifications/{notif.id}", headers=headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_nonexistent(self, client, test_user):
        """Should return 404 for non-existent notification."""
        headers = get_auth_headers(test_user.id)

        response = client.delete(
            f"/api/notifications/{uuid4()}", headers=headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
