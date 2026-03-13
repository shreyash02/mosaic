"""Contract tests for analysis endpoints.

Validates that backend responses match the shapes expected by
the frontend TypeScript types in frontend/src/types/index.ts.
"""
import pytest
from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from tests.contract.shapes import (
    assert_shape,
    ANALYSIS_SHAPE,
    ANALYSIS_LIST_RESPONSE_SHAPE,
    SUGGESTED_ACTION_SHAPE,
    SUGGESTED_ACTIONS_RESPONSE_SHAPE,
    INSIGHT_ANNOTATION_SHAPE,
    ANNOTATIONS_LIST_RESPONSE_SHAPE,
)


class TestGetAnalysisContract:
    """GET /api/conversations/{id}/analyses/{analysis_id} → Analysis shape"""

    def test_get_analysis_returns_shape(self, client, test_user, active_conversation, test_analysis):
        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/conversations/{active_conversation.id}/analyses/{test_analysis.id}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), ANALYSIS_SHAPE, "analysis")

    def test_analysis_has_required_fields(self, client, test_user, active_conversation, test_analysis):
        headers = get_auth_headers(test_user.id)
        data = client.get(
            f"/api/conversations/{active_conversation.id}/analyses/{test_analysis.id}",
            headers=headers,
        ).json()
        assert data["conversation_id"] == str(active_conversation.id)
        assert isinstance(data["themes"], list)
        assert isinstance(data["question_analyses"], list)
        assert isinstance(data["total_responses_analyzed"], int)


class TestListAnalysesContract:
    """GET /api/conversations/{id}/analyses → AnalysisListResponse shape"""

    def test_list_analyses_returns_shape(self, client, test_user, active_conversation, test_analysis):
        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/conversations/{active_conversation.id}/analyses",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), ANALYSIS_LIST_RESPONSE_SHAPE, "analysis list")

    def test_list_empty_analyses(self, client, test_user, draft_conversation):
        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/conversations/{draft_conversation.id}/analyses",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 0
        assert data["analyses"] == []


class TestSuggestedActionsContract:
    """GET /api/conversations/{id}/analyses/{aid}/suggested-actions → SuggestedActionsResponse shape"""

    def test_get_suggested_actions_shape(
        self, client, test_user, active_conversation, test_analysis, test_suggested_action,
    ):
        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/conversations/{active_conversation.id}/analyses/{test_analysis.id}/suggested-actions",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert_shape(data, SUGGESTED_ACTIONS_RESPONSE_SHAPE, "suggested actions response")
        assert len(data["actions"]) >= 1
        assert_shape(data["actions"][0], SUGGESTED_ACTION_SHAPE, "suggested action item")

    def test_action_status_values(
        self, client, test_user, active_conversation, test_analysis, test_suggested_action,
    ):
        headers = get_auth_headers(test_user.id)
        data = client.get(
            f"/api/conversations/{active_conversation.id}/analyses/{test_analysis.id}/suggested-actions",
            headers=headers,
        ).json()
        action = data["actions"][0]
        assert action["status"] in ["suggested", "accepted", "deferred", "dismissed", "completed", "converted_to_goal"]
        assert action["action_type"] in ["investigate", "communicate", "change", "celebrate", "monitor"]
        assert action["priority"] in ["high", "medium", "low"]

    def test_update_action_status_returns_shape(
        self, client, test_user, active_conversation, test_analysis, test_suggested_action,
    ):
        headers = get_auth_headers(test_user.id)
        response = client.patch(
            f"/api/conversations/{active_conversation.id}/analyses/{test_analysis.id}"
            f"/suggested-actions/{test_suggested_action.id}/status",
            json={"status": "accepted"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), SUGGESTED_ACTION_SHAPE, "updated action")


class TestInsightAnnotationsContract:
    """Insight annotation endpoints → annotation shapes"""

    def test_get_annotations_returns_shape(
        self, client, test_user, active_conversation, test_analysis,
    ):
        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/conversations/{active_conversation.id}/analyses/{test_analysis.id}/annotations",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), ANNOTATIONS_LIST_RESPONSE_SHAPE, "annotations list")

    def test_upsert_annotation_returns_shape(
        self, client, test_user, active_conversation, test_analysis,
    ):
        headers = get_auth_headers(test_user.id)
        payload = {
            "target_type": "theme",
            "target_key": {"theme": "Communication"},
            "starred": True,
            "note": "Important theme",
        }
        response = client.put(
            f"/api/conversations/{active_conversation.id}/analyses/{test_analysis.id}/annotations",
            json=payload,
            headers=headers,
        )
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED)
        assert_shape(response.json(), INSIGHT_ANNOTATION_SHAPE, "upserted annotation")
