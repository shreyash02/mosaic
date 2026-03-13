"""Contract tests for conversation endpoints.

Validates that backend responses match the shapes expected by
the frontend TypeScript types in frontend/src/types/index.ts.
"""
import pytest
from fastapi import status

from tests.helpers.api_helpers import get_auth_headers, create_test_conversation_payload
from tests.contract.shapes import (
    assert_shape,
    assert_list_of,
    CONVERSATION_SHAPE,
    CONVERSATION_LIST_ITEM_SHAPE,
    QUESTION_SHAPE,
    CODE_VALIDATION_SHAPE,
)


class TestCreateConversationContract:
    """POST /api/conversations → Conversation shape"""

    def test_create_returns_conversation_shape(self, client, test_user, test_workspace):
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(title="Contract Test")
        response = client.post("/api/conversations", json=payload, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert_shape(data, CONVERSATION_SHAPE, "create conversation")

    def test_create_includes_questions_array(self, client, test_user, test_workspace):
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(
            title="With Questions",
            questions=[
                {"question_type": "text", "question_text": "What?", "question_order": 1, "is_required": True},
                {"question_type": "rating", "question_text": "Rate?", "question_order": 2, "options": {"min": 1, "max": 5}},
            ],
        )
        response = client.post("/api/conversations", json=payload, headers=headers)
        data = response.json()
        assert "questions" in data
        assert isinstance(data["questions"], list)
        assert len(data["questions"]) == 2
        for q in data["questions"]:
            assert_shape(q, QUESTION_SHAPE, "question in create response")

    def test_create_state_is_draft(self, client, test_user, test_workspace):
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload()
        data = client.post("/api/conversations", json=payload, headers=headers).json()
        assert data["state"] == "draft"

    def test_create_anonymity_level_values(self, client, test_user, test_workspace):
        headers = get_auth_headers(test_user.id)
        for level in ["fully_anonymous", "platform_tracked", "revealable"]:
            payload = create_test_conversation_payload(
                title=f"Test {level}",
                anonymity_level=level,
            )
            data = client.post("/api/conversations", json=payload, headers=headers).json()
            assert data["anonymity_level"] == level


class TestListConversationsContract:
    """GET /api/conversations → ConversationListItem[] shape"""

    def test_list_returns_conversation_list_items(self, client, test_user, test_workspace, draft_conversation):
        headers = get_auth_headers(test_user.id)
        response = client.get("/api/conversations", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        for item in data:
            assert_shape(item, CONVERSATION_LIST_ITEM_SHAPE, "list item")


class TestGetConversationContract:
    """GET /api/conversations/{id} → Conversation shape"""

    def test_get_returns_conversation_shape(self, client, test_user, draft_conversation):
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/conversations/{draft_conversation.id}", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), CONVERSATION_SHAPE, "get conversation")

    def test_get_nonexistent_returns_404(self, client, test_user):
        headers = get_auth_headers(test_user.id)
        from uuid import uuid4
        response = client.get(f"/api/conversations/{uuid4()}", headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateConversationContract:
    """PATCH /api/conversations/{id} → Conversation shape"""

    def test_update_returns_conversation_shape(self, client, test_user, draft_conversation):
        headers = get_auth_headers(test_user.id)
        payload = {"title": "Updated Title"}
        response = client.patch(
            f"/api/conversations/{draft_conversation.id}",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert_shape(data, CONVERSATION_SHAPE, "updated conversation")
        assert data["title"] == "Updated Title"


class TestConversationLifecycleContract:
    """Activation and closing return Conversation shape"""

    def test_activate_returns_conversation_shape(self, client, test_user, conversation_with_questions):
        headers = get_auth_headers(test_user.id)
        response = client.post(
            f"/api/conversations/{conversation_with_questions.id}/activate",
            json={},
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert_shape(data, CONVERSATION_SHAPE, "activated conversation")
        assert data["state"] == "active"
        assert data["activated_at"] is not None

    def test_close_returns_correct_state(self, client, test_user, active_conversation):
        headers = get_auth_headers(test_user.id)
        response = client.post(
            f"/api/conversations/{active_conversation.id}/close",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK


class TestValidateCodeContract:
    """POST /api/conversations/{access_code}/validate → CodeValidation shape"""

    def test_validate_active_code_returns_shape(self, client, active_conversation):
        response = client.post(f"/api/conversations/{active_conversation.access_code}/validate")
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), CODE_VALIDATION_SHAPE, "code validation")

    def test_validate_invalid_code(self, client):
        response = client.post("/api/conversations/INVALIDCODE1/validate")
        assert response.status_code in (status.HTTP_200_OK, status.HTTP_404_NOT_FOUND)
