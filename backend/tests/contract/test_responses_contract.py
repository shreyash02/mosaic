"""Contract tests for response endpoints.

Validates that backend responses match the shapes expected by
the frontend TypeScript types in frontend/src/types/index.ts.
"""
import pytest
from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from tests.contract.shapes import (
    assert_shape,
    RESPONSE_STATS_SHAPE,
    RESPONSE_CHECK_SHAPE,
    DRAFT_SAVE_RESPONSE_SHAPE,
    DRAFT_LOAD_RESPONSE_SHAPE,
)


class TestResponseStatsContract:
    """GET /api/conversations/{id}/responses/stats → ResponseStats shape"""

    def test_stats_returns_shape(self, client, test_user, active_conversation):
        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/conversations/{active_conversation.id}/responses/stats",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), RESPONSE_STATS_SHAPE, "response stats")

    def test_stats_zero_when_no_responses(self, client, test_user, active_conversation):
        headers = get_auth_headers(test_user.id)
        data = client.get(
            f"/api/conversations/{active_conversation.id}/responses/stats",
            headers=headers,
        ).json()
        assert data["total_responses"] == 0
        assert data["unique_participants"] == 0


class TestResponseCheckContract:
    """GET /api/conversations/{access_code}/responses/check → ResponseCheck shape"""

    def test_check_returns_shape(self, client, test_user, active_conversation):
        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/conversations/{active_conversation.access_code}/responses/check",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), RESPONSE_CHECK_SHAPE, "response check")


class TestSubmitResponseContract:
    """POST /api/conversations/{access_code}/responses → SuccessResponse shape"""

    def test_submit_text_response_shape(
        self, client, second_test_user, active_conversation_with_questions, db_session,
    ):
        headers = get_auth_headers(second_test_user.id)
        questions = active_conversation_with_questions.questions
        payload = {
            "responses": [
                {"question_id": str(questions[0].id), "response_text": "Things went great"},
                {"question_id": str(questions[1].id), "response_data": {"rating": 4}},
            ]
        }
        response = client.post(
            f"/api/conversations/{active_conversation_with_questions.access_code}/responses",
            json=payload,
            headers=headers,
        )
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED)
        data = response.json()
        # Should have success indicator
        assert "success" in data or "id" in data or "message" in data


class TestGetResponsesContract:
    """GET /api/conversations/{id}/responses → {responses: ResponseWithQuestion[]} shape"""

    def test_get_responses_returns_list(self, client, test_user, active_conversation):
        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/conversations/{active_conversation.id}/responses",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "responses" in data
        assert isinstance(data["responses"], list)


class TestDraftContract:
    """Draft save/load endpoints → DraftSave/DraftLoad shapes"""

    def test_save_draft_returns_shape(
        self, client, second_test_user, active_conversation_with_questions,
    ):
        headers = get_auth_headers(second_test_user.id)
        questions = active_conversation_with_questions.questions
        payload = {
            "responses": [
                {"question_id": str(questions[0].id), "response_text": "draft text"},
            ]
        }
        response = client.post(
            f"/api/conversations/{active_conversation_with_questions.access_code}/responses/draft",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), DRAFT_SAVE_RESPONSE_SHAPE, "draft save")

    def test_load_draft_returns_shape(
        self, client, second_test_user, active_conversation_with_questions,
    ):
        headers = get_auth_headers(second_test_user.id)
        # Save a draft first
        questions = active_conversation_with_questions.questions
        client.post(
            f"/api/conversations/{active_conversation_with_questions.access_code}/responses/draft",
            json={"responses": [{"question_id": str(questions[0].id), "response_text": "saved"}]},
            headers=headers,
        )
        # Load it back
        response = client.get(
            f"/api/conversations/{active_conversation_with_questions.access_code}/responses/draft",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), DRAFT_LOAD_RESPONSE_SHAPE, "draft load")

    def test_load_empty_draft_returns_shape(
        self, client, second_test_user, active_conversation_with_questions,
    ):
        headers = get_auth_headers(second_test_user.id)
        response = client.get(
            f"/api/conversations/{active_conversation_with_questions.access_code}/responses/draft",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert_shape(data, DRAFT_LOAD_RESPONSE_SHAPE, "empty draft")
        assert data["has_draft"] is False
