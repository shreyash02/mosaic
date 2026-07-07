"""Tests for conversation CRUD operations."""
import pytest
from fastapi import status
from datetime import datetime, timedelta

from tests.helpers.api_helpers import (
    get_auth_headers,
    create_test_conversation_payload,
    create_multiple_question_payload,
    assert_conversation_response,
    assert_error_response
)


def _ws_id(test_workspace):
    """Helper to get workspace_id from test_workspace fixture."""
    return test_workspace.id


@pytest.mark.usefixtures("test_workspace")
class TestCreateConversation:
    """Tests for POST /api/conversations"""

    def test_create_basic_conversation(self, client, test_user):
        """Should create conversation with default settings."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload()

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert_conversation_response(data, expected_title="Test Conversation", expected_state="draft")
        assert data["anonymity_level"] == "platform_tracked"
        assert len(data["access_code"]) == 12
        assert len(data["questions"]) == 1
        assert data["creator_id"] == str(test_user.id)

    def test_create_with_multiple_questions(self, client, test_user):
        """Should create conversation with multiple question types."""
        headers = get_auth_headers(test_user.id)
        questions = create_multiple_question_payload(num_text=2, num_rating=1, num_choice=1)
        payload = create_test_conversation_payload(questions=questions)

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert len(data["questions"]) == 4
        assert data["questions"][0]["question_type"] == "text"
        assert data["questions"][2]["question_type"] == "rating"
        assert data["questions"][3]["question_type"] == "single_choice"

    def test_create_with_scheduled_activation(self, client, test_user):
        """Should schedule activation for future time."""
        headers = get_auth_headers(test_user.id)
        future_time = datetime.utcnow() + timedelta(hours=24)
        payload = create_test_conversation_payload(scheduled_activate_at=future_time)

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["scheduled_activate_at"] is not None
        assert data["state"] == "draft"  # Should remain draft until scheduled time

    def test_create_with_auto_close(self, client, test_user):
        """Should set auto-close time."""
        headers = get_auth_headers(test_user.id)
        close_time = datetime.utcnow() + timedelta(days=7)
        payload = create_test_conversation_payload(auto_close_at=close_time)

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["auto_close_at"] is not None

    def test_create_fully_anonymous(self, client, test_user):
        """Should create fully anonymous conversation."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(anonymity_level="fully_anonymous")

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["anonymity_level"] == "fully_anonymous"

    def test_create_platform_tracked(self, client, test_user):
        """Should create platform-tracked conversation."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(anonymity_level="platform_tracked")

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["anonymity_level"] == "platform_tracked"

    def test_create_revealable(self, client, test_user):
        """Should create revealable conversation."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(anonymity_level="revealable")

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["anonymity_level"] == "revealable"

    def test_create_invite_only(self, client, test_user):
        """Should create invite-only conversation."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(invite_only=True)

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["invite_only"] is True

    def test_create_with_organization(self, client, test_user, test_organization):
        """Should create conversation within organization."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(organization_id=str(test_organization.id))

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["organization_id"] == str(test_organization.id)

    def test_create_without_auth_fails(self, client):
        """Should reject unauthenticated request."""
        payload = create_test_conversation_payload()

        response = client.post("/api/conversations", json=payload)

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]

    def test_create_without_questions_fails(self, client, test_user):
        """Should reject conversation with no questions."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(questions=[])

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_with_invalid_anonymity_level_fails(self, client, test_user):
        """Should reject invalid anonymity level."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload()
        payload["anonymity_level"] = "invalid_level"

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_with_nonexistent_organization_fails(self, client, test_user):
        """Should reject non-existent organization."""
        from uuid import uuid4
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(organization_id=str(uuid4()))

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    def test_access_code_is_unique(self, client, test_user, test_workspace, db_session):
        """Should generate unique access codes."""
        headers = get_auth_headers(test_user.id)

        # Create multiple conversations
        codes = set()
        for i in range(5):
            payload = create_test_conversation_payload(title=f"Conversation {i}")
            response = client.post("/api/conversations", json=payload, headers=headers)
            assert response.status_code == status.HTTP_201_CREATED
            code = response.json()["access_code"]
            codes.add(code)

        # All codes should be unique
        assert len(codes) == 5

    def test_access_code_format(self, client, test_user):
        """Should generate access code with correct format."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload()

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        code = response.json()["access_code"]

        # Should be 12 characters
        assert len(code) == 12

        # Should be uppercase alphanumeric
        assert code.isalnum()
        assert code.isupper()

        # Should not contain confusing characters
        assert 'O' not in code
        assert '0' not in code
        assert 'I' not in code
        assert '1' not in code


@pytest.mark.usefixtures("test_workspace")
class TestListConversations:
    """Tests for GET /api/conversations"""

    def test_list_user_conversations(self, client, test_user, draft_conversation, active_conversation):
        """Should return user's conversations."""
        headers = get_auth_headers(test_user.id)

        response = client.get("/api/conversations", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 2

    def test_list_empty_for_new_user(self, client, second_test_user):
        """Should return empty list for user with no conversations."""
        headers = get_auth_headers(second_test_user.id)

        response = client.get("/api/conversations", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 0

    def test_list_excludes_deleted(self, client, test_user, test_workspace, db_session):
        """Should not return deleted conversations."""
        from app.models.conversation import Conversation
        from app.schemas.conversation import ConversationState
        from uuid import uuid4

        # Create a deleted conversation
        deleted = Conversation(
            id=uuid4(),
            title="Deleted",
            creator_id=test_user.id,
            workspace_id=test_workspace.id,
            access_code="DLTDABCDEFGH",
            anonymity_level="platform_tracked",
            results_access="creator_only",
            state=ConversationState.DELETED,
            timezone="UTC"
        )
        db_session.add(deleted)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get("/api/conversations", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Should not include deleted conversation
        for conv in data:
            assert conv["state"] != "deleted"
            assert conv["id"] != str(deleted.id)

    def test_list_with_state_filter(self, client, test_user, draft_conversation, active_conversation):
        """Should filter by state."""
        headers = get_auth_headers(test_user.id)

        response = client.get("/api/conversations?state=draft", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # All returned conversations should be draft
        for conv in data:
            assert conv["state"] == "draft"

    def test_list_with_organization_filter(self, client, test_user, test_organization):
        """Should filter by organization."""
        # Create conversation in organization
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(
            title="Org Conversation",
            organization_id=str(test_organization.id)
        )
        client.post("/api/conversations", json=payload, headers=headers)

        # Filter by organization
        response = client.get(f"/api/conversations?organization_id={test_organization.id}", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # All returned conversations should be in the organization
        for conv in data:
            assert conv.get("organization_id") == str(test_organization.id)

    def test_list_pagination_limit(self, client, test_user, test_workspace, db_session):
        """Should support limit parameter."""
        from app.models.conversation import Conversation
        from uuid import uuid4

        # Create 15 conversations
        for i in range(15):
            conv = Conversation(
                id=uuid4(),
                title=f"Conv {i}",
                creator_id=test_user.id,
                workspace_id=test_workspace.id,
                access_code=f"CD{i:010d}",
                anonymity_level="platform_tracked",
                results_access="creator_only",
                timezone="UTC"
            )
            db_session.add(conv)
        db_session.commit()

        headers = get_auth_headers(test_user.id)

        # Request with limit=10
        response = client.get("/api/conversations?limit=10", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 10

    def test_list_pagination_skip(self, client, test_user, test_workspace, db_session):
        """Should support skip parameter."""
        from app.models.conversation import Conversation
        from uuid import uuid4

        # Create 25 conversations
        for i in range(25):
            conv = Conversation(
                id=uuid4(),
                title=f"Conv {i}",
                creator_id=test_user.id,
                workspace_id=test_workspace.id,
                access_code=f"CD{i:010d}",
                anonymity_level="platform_tracked",
                results_access="creator_only",
                timezone="UTC"
            )
            db_session.add(conv)
        db_session.commit()

        headers = get_auth_headers(test_user.id)

        # Get first page
        response1 = client.get("/api/conversations?limit=10", headers=headers)
        page1 = response1.json()

        # Get second page
        response2 = client.get("/api/conversations?skip=10&limit=10", headers=headers)
        page2 = response2.json()

        # Pages should not overlap
        page1_ids = {c["id"] for c in page1}
        page2_ids = {c["id"] for c in page2}
        assert len(page1_ids & page2_ids) == 0

    def test_list_excludes_other_users(self, client, test_user, second_test_user, test_workspace, db_session):
        """Should not return other users' conversations."""
        from app.models.conversation import Conversation
        from app.models.workspace import Workspace, WorkspaceMember
        from uuid import uuid4

        # Create a separate workspace for second user
        other_ws = Workspace(id=uuid4(), type="personal", name="Other Personal", owner_id=second_test_user.id, is_default=True)
        db_session.add(other_ws)
        db_session.flush()
        db_session.add(WorkspaceMember(workspace_id=other_ws.id, user_id=second_test_user.id, role="admin"))
        db_session.flush()

        # Create conversation for second user in their own workspace
        other_conv = Conversation(
            id=uuid4(),
            title="Other User Conv",
            creator_id=second_test_user.id,
            workspace_id=other_ws.id,
            access_code="OTHRCONVABCD",
            anonymity_level="platform_tracked",
            results_access="creator_only",
            timezone="UTC"
        )
        db_session.add(other_conv)
        db_session.commit()

        # List as first user
        headers = get_auth_headers(test_user.id)
        response = client.get("/api/conversations", headers=headers)

        data = response.json()
        # Should not include other user's conversation
        for conv in data:
            assert conv["id"] != str(other_conv.id)

    def test_list_without_auth_fails(self, client):
        """Should reject unauthenticated request."""
        response = client.get("/api/conversations")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]


@pytest.mark.usefixtures("test_workspace")
class TestGetConversation:
    """Tests for GET /api/conversations/{id}"""

    def test_get_own_conversation(self, client, test_user, conversation_with_questions):
        """Should return conversation with questions."""
        headers = get_auth_headers(test_user.id)
        conv_id = conversation_with_questions.id

        response = client.get(f"/api/conversations/{conv_id}", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(conv_id)
        assert len(data["questions"]) == 3
        assert_conversation_response(data)

    def test_get_includes_question_details(self, client, test_user, conversation_with_questions):
        """Should include full question details."""
        headers = get_auth_headers(test_user.id)

        response = client.get(f"/api/conversations/{conversation_with_questions.id}", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        questions = response.json()["questions"]

        # Should have all question fields
        for q in questions:
            assert "id" in q
            assert "question_type" in q
            assert "question_text" in q

    def test_get_other_users_conversation_fails(self, client, test_user, second_test_user, test_workspace, db_session):
        """Should return 404 for other users' conversations."""
        from app.models.conversation import Conversation
        from uuid import uuid4

        # Create conversation owned by second user
        other_conv = Conversation(
            id=uuid4(),
            title="Other",
            creator_id=second_test_user.id,
            workspace_id=test_workspace.id,
            access_code="OTHRCONVABCD",
            anonymity_level="platform_tracked",
            results_access="creator_only",
            timezone="UTC"
        )
        db_session.add(other_conv)
        db_session.commit()

        # Try to get as first user
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/conversations/{other_conv.id}", headers=headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_deleted_conversation_fails(self, client, test_user, test_workspace, db_session):
        """Should return 404 for deleted conversations."""
        from app.models.conversation import Conversation
        from app.schemas.conversation import ConversationState
        from uuid import uuid4

        # Create deleted conversation
        deleted = Conversation(
            id=uuid4(),
            title="Deleted",
            creator_id=test_user.id,
            workspace_id=test_workspace.id,
            access_code="DLTDCONVABCD",
            anonymity_level="platform_tracked",
            results_access="creator_only",
            state=ConversationState.DELETED,
            timezone="UTC"
        )
        db_session.add(deleted)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/conversations/{deleted.id}", headers=headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_nonexistent_conversation_fails(self, client, test_user):
        """Should return 404 for non-existent conversation."""
        from uuid import uuid4
        headers = get_auth_headers(test_user.id)
        fake_id = uuid4()

        response = client.get(f"/api/conversations/{fake_id}", headers=headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_without_auth_fails(self, client, draft_conversation):
        """Should reject unauthenticated request."""
        response = client.get(f"/api/conversations/{draft_conversation.id}")

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]


@pytest.mark.usefixtures("test_workspace")
class TestGetConversationByCode:
    """Tests for GET /api/conversations/by-code/{access_code}"""

    def test_get_by_access_code(self, client, test_user, test_workspace, db_session):
        """Should return conversation by access code with auth."""
        from app.models.conversation import Conversation
        from app.schemas.conversation import ConversationState
        from uuid import uuid4
        from datetime import datetime

        # Create an active, platform_tracked conversation (auth headers suffice)
        conv = Conversation(
            id=uuid4(),
            title="By-Code Test",
            creator_id=test_user.id,
            workspace_id=test_workspace.id,
            access_code="BYCODETEST01",
            anonymity_level="platform_tracked",
            results_access="creator_only",
            state=ConversationState.ACTIVE,
            activated_at=datetime.utcnow(),
            timezone="UTC",
        )
        db_session.add(conv)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/conversations/by-code/{conv.access_code}",
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(conv.id)
        assert data["access_code"] == conv.access_code

    def test_get_by_code_includes_questions(self, client, test_user, test_workspace, db_session):
        """Should include questions in response."""
        from app.models.conversation import Conversation
        from app.models.question import Question
        from app.schemas.conversation import ConversationState
        from uuid import uuid4
        from datetime import datetime

        # Create an active, platform_tracked conversation with questions
        conv = Conversation(
            id=uuid4(),
            title="By-Code Questions Test",
            creator_id=test_user.id,
            workspace_id=test_workspace.id,
            access_code="BYCODEQUST01",
            anonymity_level="platform_tracked",
            results_access="creator_only",
            state=ConversationState.ACTIVE,
            activated_at=datetime.utcnow(),
            timezone="UTC",
        )
        db_session.add(conv)
        db_session.flush()

        questions = [
            Question(id=uuid4(), conversation_id=conv.id, question_type="text",
                     question_text="What went well?", question_order=1, is_required=True),
            Question(id=uuid4(), conversation_id=conv.id, question_type="rating",
                     question_text="Rate the sprint", question_order=2,
                     options={"min": 1, "max": 5}, is_required=True),
            Question(id=uuid4(), conversation_id=conv.id, question_type="single_choice",
                     question_text="Choose one", question_order=3,
                     options={"choices": ["A", "B", "C"]}, is_required=False),
        ]
        db_session.add_all(questions)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/conversations/by-code/{conv.access_code}",
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data["questions"]) == 3

    def test_get_by_invalid_code_fails(self, client):
        """Should return 404 for invalid access code."""
        response = client.get("/api/conversations/by-code/INVALIDCODEX")

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.usefixtures("test_workspace")
class TestUpdateConversation:
    """Tests for PATCH /api/conversations/{id}"""

    def test_update_duration_up_to_eight_days(self, client, test_user, draft_conversation):
        """Should accept durations up to 192 hours (regression: cap was 48h while UI offered more)."""
        headers = get_auth_headers(test_user.id)

        response = client.patch(
            f"/api/conversations/{draft_conversation.id}",
            json={"duration_minutes": 192 * 60},
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["duration_minutes"] == 11520

        response = client.patch(
            f"/api/conversations/{draft_conversation.id}",
            json={"duration_minutes": 193 * 60},
            headers=headers,
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_update_title(self, client, test_user, draft_conversation):
        """Should update conversation title."""
        headers = get_auth_headers(test_user.id)
        payload = {"title": "Updated Title"}

        response = client.patch(f"/api/conversations/{draft_conversation.id}", json=payload, headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["title"] == "Updated Title"

    def test_update_description(self, client, test_user, draft_conversation):
        """Should update conversation description."""
        headers = get_auth_headers(test_user.id)
        payload = {"description": "New description"}

        response = client.patch(f"/api/conversations/{draft_conversation.id}", json=payload, headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["description"] == "New description"

    def test_update_other_users_conversation_fails(self, client, test_user, second_test_user, test_workspace, db_session):
        """Should fail to update other user's conversation."""
        from app.models.conversation import Conversation
        from uuid import uuid4

        other_conv = Conversation(
            id=uuid4(),
            title="Other",
            creator_id=second_test_user.id,
            workspace_id=test_workspace.id,
            access_code="OTHRCONVABCD",
            anonymity_level="platform_tracked",
            results_access="creator_only",
            timezone="UTC"
        )
        db_session.add(other_conv)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        payload = {"title": "Hacked Title"}

        response = client.patch(f"/api/conversations/{other_conv.id}", json=payload, headers=headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.usefixtures("test_workspace")
class TestDeleteConversation:
    """Tests for DELETE /api/conversations/{id}"""

    def test_delete_conversation(self, client, test_user, draft_conversation, db_session):
        """Should soft delete conversation."""
        headers = get_auth_headers(test_user.id)

        response = client.delete(f"/api/conversations/{draft_conversation.id}", headers=headers)

        assert response.status_code == status.HTTP_200_OK

        # Verify soft delete (state changed to deleted)
        db_session.refresh(draft_conversation)
        from app.schemas.conversation import ConversationState
        assert draft_conversation.state == ConversationState.DELETED

    def test_delete_other_users_conversation_fails(self, client, test_user, second_test_user, test_workspace, db_session):
        """Should fail to delete other user's conversation."""
        from app.models.conversation import Conversation
        from uuid import uuid4

        other_conv = Conversation(
            id=uuid4(),
            title="Other",
            creator_id=second_test_user.id,
            workspace_id=test_workspace.id,
            access_code="OTHRCONVABCD",
            anonymity_level="platform_tracked",
            results_access="creator_only",
            timezone="UTC"
        )
        db_session.add(other_conv)
        db_session.commit()

        headers = get_auth_headers(test_user.id)

        response = client.delete(f"/api/conversations/{other_conv.id}", headers=headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND
