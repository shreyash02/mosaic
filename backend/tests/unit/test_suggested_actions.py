"""Tests for suggested actions routes."""
import pytest
from datetime import datetime
from uuid import uuid4

from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from app.models.suggested_action import SuggestedAction


class TestGetSuggestedActions:
    """Tests for GET /api/conversations/{cid}/analyses/{aid}/suggested-actions"""

    def test_get_actions_success(self, client, test_user, active_conversation, test_analysis, test_suggested_action):
        """Creator should get list of suggested actions."""
        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        response = client.get(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions",
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 1
        assert data["actions"][0]["title"] == test_suggested_action.title

    def test_get_actions_empty(self, client, test_user, active_conversation, test_analysis):
        """Should return empty actions list when none exist."""
        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        # No actions created — just the analysis fixture
        # Need to remove the test_suggested_action dependency
        response = client.get(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions",
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 0
        assert data["actions"] == []

    def test_get_actions_non_creator_creator_only(self, client, second_test_user, active_conversation, test_analysis):
        """Non-creator should be blocked when results_access is creator_only."""
        headers = get_auth_headers(second_test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        response = client.get(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions",
            headers=headers,
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_actions_conversation_not_found(self, client, test_user, test_analysis):
        """Should return 404 for non-existent conversation."""
        headers = get_auth_headers(test_user.id)
        fake_cid = uuid4()

        response = client.get(
            f"/api/conversations/{fake_cid}/analyses/{test_analysis.id}/suggested-actions",
            headers=headers,
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_actions_analysis_not_found(self, client, test_user, active_conversation):
        """Should return 404 for non-existent analysis."""
        headers = get_auth_headers(test_user.id)
        fake_aid = uuid4()

        response = client.get(
            f"/api/conversations/{active_conversation.id}/analyses/{fake_aid}/suggested-actions",
            headers=headers,
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateActionStatus:
    """Tests for PATCH .../suggested-actions/{action_id}/status"""

    def test_accept_action(self, client, test_user, active_conversation, test_analysis, test_suggested_action):
        """Should transition suggested -> accepted."""
        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id
        action_id = test_suggested_action.id

        response = client.patch(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions/{action_id}/status",
            json={"status": "accepted"},
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "accepted"
        assert data["accepted_at"] is not None

    def test_dismiss_action(self, client, test_user, active_conversation, test_analysis, test_suggested_action):
        """Should transition suggested -> dismissed."""
        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id
        action_id = test_suggested_action.id

        response = client.patch(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions/{action_id}/status",
            json={"status": "dismissed", "dismissed_reason": "Not relevant"},
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "dismissed"
        assert data["dismissed_reason"] == "Not relevant"

    def test_invalid_transition_blocked(self, client, test_user, active_conversation, test_analysis, test_suggested_action):
        """Should reject invalid status transition (suggested -> completed)."""
        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id
        action_id = test_suggested_action.id

        response = client.patch(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions/{action_id}/status",
            json={"status": "completed"},
            headers=headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "cannot transition" in response.json()["detail"].lower()

    def test_non_creator_blocked(self, client, second_test_user, active_conversation, test_analysis, test_suggested_action):
        """Non-creator should be blocked from updating status."""
        headers = get_auth_headers(second_test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id
        action_id = test_suggested_action.id

        response = client.patch(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions/{action_id}/status",
            json={"status": "accepted"},
            headers=headers,
        )

        assert response.status_code in [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
        ]


class TestEditAction:
    """Tests for PATCH .../suggested-actions/{action_id}"""

    def test_edit_title(self, client, test_user, active_conversation, test_analysis, test_suggested_action):
        """Should update action title."""
        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id
        action_id = test_suggested_action.id

        response = client.patch(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions/{action_id}",
            json={"title": "Updated Title"},
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["title"] == "Updated Title"

    def test_edit_dismissed_blocked(self, client, test_user, active_conversation, test_analysis, test_suggested_action, db_session):
        """Should reject editing a dismissed action."""
        test_suggested_action.status = "dismissed"
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id
        action_id = test_suggested_action.id

        response = client.patch(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions/{action_id}",
            json={"title": "Can't Edit This"},
            headers=headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "dismissed" in response.json()["detail"].lower()

    def test_edit_non_creator_blocked(self, client, second_test_user, active_conversation, test_analysis, test_suggested_action):
        """Non-creator should be blocked from editing."""
        headers = get_auth_headers(second_test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id
        action_id = test_suggested_action.id

        response = client.patch(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions/{action_id}",
            json={"title": "Hacked"},
            headers=headers,
        )

        assert response.status_code in [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
        ]


class TestCreateManualAction:
    """Tests for POST .../suggested-actions/manual"""

    def test_create_manual_action(self, client, test_user, active_conversation, test_analysis):
        """Creator should create a manual action."""
        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        payload = {
            "title": "Manual Action",
            "description": "Do this manually",
            "action_type": "investigate",
            "priority": "medium",
        }

        response = client.post(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions/manual",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "Manual Action"
        assert data["source"] == "manual"
        assert data["status"] == "suggested"

    def test_create_missing_title(self, client, test_user, active_conversation, test_analysis):
        """Should reject when title is missing."""
        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        payload = {"description": "No title"}

        response = client.post(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions/manual",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_non_creator_blocked(self, client, second_test_user, active_conversation, test_analysis):
        """Non-creator should be blocked."""
        headers = get_auth_headers(second_test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        payload = {
            "title": "Blocked Action",
            "description": "Should not work",
        }

        response = client.post(
            f"/api/conversations/{cid}/analyses/{aid}/suggested-actions/manual",
            json=payload,
            headers=headers,
        )

        assert response.status_code in [
            status.HTTP_403_FORBIDDEN,
            status.HTTP_404_NOT_FOUND,
        ]
