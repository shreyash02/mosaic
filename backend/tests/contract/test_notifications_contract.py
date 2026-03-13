"""Contract tests for notification endpoints.

Validates that backend responses match the shapes expected by
the frontend TypeScript types in frontend/src/types/index.ts.
"""
import pytest
from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from tests.contract.shapes import (
    assert_shape,
    NOTIFICATION_SHAPE,
    NOTIFICATION_LIST_RESPONSE_SHAPE,
    UNREAD_COUNT_RESPONSE_SHAPE,
)


class TestListNotificationsContract:
    """GET /api/notifications → NotificationListResponse shape"""

    def test_list_returns_shape(self, client, test_user, test_notifications):
        headers = get_auth_headers(test_user.id)
        response = client.get("/api/notifications", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert_shape(data, NOTIFICATION_LIST_RESPONSE_SHAPE, "notification list")
        assert isinstance(data["notifications"], list)
        for n in data["notifications"]:
            assert_shape(n, NOTIFICATION_SHAPE, "notification item")

    def test_list_has_correct_total(self, client, test_user, test_notifications):
        headers = get_auth_headers(test_user.id)
        data = client.get("/api/notifications", headers=headers).json()
        assert data["total"] == 5


class TestUnreadCountContract:
    """GET /api/notifications/unread-count → {count: number} shape"""

    def test_unread_count_shape(self, client, test_user, test_notifications):
        headers = get_auth_headers(test_user.id)
        response = client.get("/api/notifications/unread-count", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), UNREAD_COUNT_RESPONSE_SHAPE, "unread count")

    def test_unread_count_is_correct(self, client, test_user, test_notifications):
        headers = get_auth_headers(test_user.id)
        data = client.get("/api/notifications/unread-count", headers=headers).json()
        assert data["count"] == 3  # 3 unread in fixture


class TestMarkReadContract:
    """POST /api/notifications/{id}/read → Notification shape"""

    def test_mark_read_returns_notification_shape(self, client, test_user, test_notifications):
        headers = get_auth_headers(test_user.id)
        unread = next(n for n in test_notifications if not n.read)
        response = client.post(
            f"/api/notifications/{unread.id}/read", headers=headers
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert_shape(data, NOTIFICATION_SHAPE, "marked notification")
        assert data["read"] is True


class TestMarkAllReadContract:
    """POST /api/notifications/mark-all-read → {updated_count: number}"""

    def test_mark_all_read_shape(self, client, test_user, test_notifications):
        headers = get_auth_headers(test_user.id)
        response = client.post("/api/notifications/mark-all-read", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "updated_count" in data
        assert isinstance(data["updated_count"], int)
        assert data["updated_count"] == 3
