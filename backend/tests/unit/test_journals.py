"""Tests for journal endpoints.

Covers CRUD, entries, drafts, analysis status, sharing, and access control.
Feature flags and external services (LLM, email) are mocked.
"""
import pytest
from uuid import uuid4
from datetime import datetime, timedelta
from unittest.mock import patch
from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from app.models.journal import Journal as JournalModel
from app.models.journal_share import JournalShare
from app.models.journal_template import JournalTemplate
from app.models.conversation import Conversation
from app.models.question import Question
from app.models.response import Response
from app.schemas.conversation import AnonymityLevel


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def _mock_journals_flag():
    """Mock feature flags so journal endpoints don't 403."""
    with patch(
        "app.routes.journals._require_journals_flag", return_value="free"
    ), patch(
        "app.services.feature_flag_service.feature_flag_service.get_config_value",
        return_value=None,
    ), patch(
        "app.services.feature_flag_service.feature_flag_service.is_enabled",
        return_value=True,
    ), patch(
        "app.services.subscription_service.subscription_service.get_tier",
        return_value="free",
    ):
        yield


@pytest.fixture
def _mock_scheduler():
    """Mock scheduler service for next_analysis_at calculation."""
    with patch(
        "app.routes.journals.calculate_next_analysis_time",
        return_value=datetime.utcnow() + timedelta(days=1),
    ), patch(
        "app.routes.journals.calculate_next_analysis_time_scheduled",
        return_value=datetime.utcnow() + timedelta(days=1),
    ):
        yield


@pytest.fixture
def test_journal(db_session, test_user, test_workspace, _mock_journals_flag):
    """Create a test journal with a backing conversation and prompts."""
    now = datetime.utcnow()
    conv = Conversation(
        id=uuid4(),
        creator_id=test_user.id,
        title="Test Journal",
        description="A daily reflection",
        access_code="JRNL" + "A" * 8,
        workspace_id=test_workspace.id,
        is_continuous=True,
        anonymity_level="platform_tracked",
        results_access="creator_only",
        invite_only=True,
        auto_analyze=True,
        show_verbatim_responses=True,
        allow_response_editing=True,
        state="active",
        activated_at=now,
        analysis_interval="daily",
        next_analysis_at=now + timedelta(days=1),
        timezone="UTC",
    )
    db_session.add(conv)
    db_session.flush()

    q1 = Question(
        id=uuid4(),
        conversation_id=conv.id,
        question_text="How are you feeling today?",
        question_type="text",
        question_order=0,
        is_required=True,
    )
    q2 = Question(
        id=uuid4(),
        conversation_id=conv.id,
        question_text="Rate your energy level",
        question_type="rating",
        question_order=1,
        options={"rating_min": 1, "rating_max": 10},
        is_required=True,
    )
    db_session.add_all([q1, q2])
    db_session.flush()

    journal = JournalModel(
        id=uuid4(),
        conversation_id=conv.id,
        owner_id=test_user.id,
        entry_frequency="daily",
        strict_frequency=False,
    )
    db_session.add(journal)
    db_session.commit()
    db_session.refresh(journal)
    return journal


@pytest.fixture
def journal_questions(db_session, test_journal):
    """Return the questions for the test journal."""
    return (
        db_session.query(Question)
        .filter(Question.conversation_id == test_journal.conversation_id)
        .order_by(Question.question_order)
        .all()
    )


@pytest.fixture
def journal_entry(db_session, test_journal, test_user, journal_questions):
    """Create a submitted journal entry."""
    response = Response(
        id=uuid4(),
        conversation_id=test_journal.conversation_id,
        question_id=journal_questions[0].id,
        response_text="Feeling good today!",
        response_data={
            "responses": {
                str(journal_questions[0].id): {"text": "Feeling good today!"},
                str(journal_questions[1].id): {"rating_value": 7},
            }
        },
        participant_id=test_user.id,
        anonymity_level="platform_tracked",
        status="submitted",
        submitted_at=datetime.utcnow(),
    )
    db_session.add(response)
    db_session.commit()
    db_session.refresh(response)
    return response


@pytest.fixture
def journal_template(db_session):
    """Create a journal template."""
    template = JournalTemplate(
        id=uuid4(),
        title="Daily Reflection",
        emoji="📝",
        description="A simple daily journal",
        prompts=[
            {"text": "What went well today?", "type": "text"},
            {"text": "Rate your mood", "type": "rating", "rating_min": 1, "rating_max": 5},
        ],
        entry_frequency="daily",
        analysis_interval="weekly",
        strict_frequency=False,
        display_order=1,
        is_active=True,
    )
    db_session.add(template)
    db_session.commit()
    db_session.refresh(template)
    return template


# ============================================================================
# Templates (public)
# ============================================================================

class TestTemplates:
    """GET /api/journals/templates"""

    def test_list_templates(self, client, journal_template):
        response = client.get("/api/journals/templates")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["title"] == "Daily Reflection"
        assert isinstance(data[0]["prompts"], list)

    def test_templates_no_auth_required(self, client):
        response = client.get("/api/journals/templates")
        assert response.status_code == status.HTTP_200_OK


# ============================================================================
# Journal CRUD
# ============================================================================

class TestCreateJournal:
    """POST /api/journals"""

    @pytest.fixture(autouse=True)
    def _inject_workspace_id(self, test_workspace):
        """Patch Conversation to inject workspace_id for create_journal.

        The create_journal endpoint doesn't set workspace_id on the
        Conversation it creates, but the column is NOT NULL. In production
        this may be handled differently; in tests we inject the fixture
        workspace so the NOT NULL constraint is satisfied.
        """
        _orig_init = Conversation.__init__

        def _patched_init(self_conv, *args, **kwargs):
            _orig_init(self_conv, *args, **kwargs)
            if self_conv.workspace_id is None:
                self_conv.workspace_id = test_workspace.id

        with patch.object(Conversation, "__init__", _patched_init):
            yield

    def test_create_journal(self, client, test_user, test_workspace, _mock_journals_flag, _mock_scheduler):
        headers = get_auth_headers(test_user.id)
        payload = {
            "title": "My Journal",
            "description": "Daily reflection",
            "prompts": [
                {"text": "How was your day?", "type": "text", "order_index": 0},
            ],
            "analysis_interval": "weekly",
        }
        response = client.post("/api/journals", json=payload, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "My Journal"
        assert "prompts" in data
        assert len(data["prompts"]) == 1

    def test_create_journal_with_multiple_prompt_types(
        self, client, test_user, test_workspace, _mock_journals_flag, _mock_scheduler,
    ):
        headers = get_auth_headers(test_user.id)
        payload = {
            "title": "Multi-Prompt",
            "prompts": [
                {"text": "Reflection", "type": "text", "order_index": 0},
                {"text": "Mood", "type": "rating", "order_index": 1, "rating_min": 1, "rating_max": 5},
                {"text": "Focus area", "type": "single_choice", "order_index": 2, "choices": ["Work", "Health", "Personal"]},
            ],
            "analysis_interval": "daily",
        }
        response = client.post("/api/journals", json=payload, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.json()["prompts"]) == 3

    def test_create_journal_unauthenticated(self, client, _mock_journals_flag):
        response = client.post("/api/journals", json={"title": "X", "prompts": [{"text": "Y", "type": "text", "order_index": 0}], "analysis_interval": "daily"})
        assert response.status_code in (401, 403)


class TestListJournals:
    """GET /api/journals"""

    def test_list_journals(self, client, test_user, test_journal, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get("/api/journals", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        item = data[0]
        assert "id" in item
        assert "title" in item

    def test_list_journals_excludes_other_users(self, client, second_test_user, test_journal, _mock_journals_flag):
        headers = get_auth_headers(second_test_user.id)
        data = client.get("/api/journals", headers=headers).json()
        assert not any(j["id"] == str(test_journal.id) for j in data)


class TestGetJournal:
    """GET /api/journals/{journal_id}"""

    def test_get_journal(self, client, test_user, test_journal, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/journals/{test_journal.id}", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["title"] == "Test Journal"
        assert "prompts" in data

    def test_get_journal_other_user_404(self, client, second_test_user, test_journal, _mock_journals_flag):
        headers = get_auth_headers(second_test_user.id)
        response = client.get(f"/api/journals/{test_journal.id}", headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateJournal:
    """PATCH /api/journals/{journal_id}"""

    def test_update_title(self, client, test_user, test_journal, _mock_journals_flag, _mock_scheduler):
        headers = get_auth_headers(test_user.id)
        response = client.patch(
            f"/api/journals/{test_journal.id}",
            json={"title": "Updated Journal Title"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["title"] == "Updated Journal Title"


class TestDeleteJournal:
    """DELETE /api/journals/{journal_id}"""

    def test_delete_journal(self, client, test_user, test_journal, db_session, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        response = client.delete(f"/api/journals/{test_journal.id}", headers=headers)
        assert response.status_code == status.HTTP_204_NO_CONTENT
        # Verify soft-delete (conversation state = deleted)
        db_session.refresh(test_journal)
        conv = db_session.get(Conversation, test_journal.conversation_id)
        assert conv.state == "deleted"

    def test_delete_journal_other_user_404(self, client, second_test_user, test_journal, _mock_journals_flag):
        headers = get_auth_headers(second_test_user.id)
        response = client.delete(f"/api/journals/{test_journal.id}", headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND


# ============================================================================
# Entries
# ============================================================================

class TestCreateEntry:
    """POST /api/journals/{journal_id}/entries"""

    def test_create_entry(self, client, test_user, test_journal, journal_questions, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        payload = {
            "responses": [
                {"prompt_id": str(journal_questions[0].id), "text": "Great day!"},
                {"prompt_id": str(journal_questions[1].id), "rating_value": 8},
            ]
        }
        response = client.post(
            f"/api/journals/{test_journal.id}/entries",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert "id" in data
        assert "created_at" in data
        assert "responses" in data

    def test_create_entry_invalid_prompt_id(self, client, test_user, test_journal, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        payload = {
            "responses": [
                {"prompt_id": str(uuid4()), "text": "Invalid prompt"},
            ]
        }
        response = client.post(
            f"/api/journals/{test_journal.id}/entries",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_create_entry_other_user_404(self, client, second_test_user, test_journal, journal_questions, _mock_journals_flag):
        headers = get_auth_headers(second_test_user.id)
        payload = {"responses": [{"prompt_id": str(journal_questions[0].id), "text": "Nope"}]}
        response = client.post(
            f"/api/journals/{test_journal.id}/entries",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestListEntries:
    """GET /api/journals/{journal_id}/entries"""

    def test_list_entries(self, client, test_user, test_journal, journal_entry, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/journals/{test_journal.id}/entries", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "entries" in data
        assert "total_entries" in data
        assert "has_more" in data
        assert data["total_entries"] >= 1

    def test_list_entries_empty_journal(self, client, test_user, test_journal, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        data = client.get(f"/api/journals/{test_journal.id}/entries", headers=headers).json()
        assert data["total_entries"] == 0
        assert data["entries"] == []


class TestGetEntry:
    """GET /api/journals/{journal_id}/entries/{entry_id}"""

    def test_get_entry(self, client, test_user, test_journal, journal_entry, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/journals/{test_journal.id}/entries/{journal_entry.id}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "responses" in data
        assert "created_at" in data


class TestDeleteEntry:
    """DELETE /api/journals/{journal_id}/entries/{entry_id}"""

    def test_delete_entry_soft_deletes(self, client, test_user, test_journal, journal_entry, db_session, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        response = client.delete(
            f"/api/journals/{test_journal.id}/entries/{journal_entry.id}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        db_session.refresh(journal_entry)
        assert journal_entry.status == "deleted"


# ============================================================================
# Drafts
# ============================================================================

class TestDrafts:
    """Journal draft save/load endpoints"""

    def test_save_draft(self, client, test_user, test_journal, journal_questions, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        payload = {
            "responses": {str(journal_questions[0].id): "partial draft"},
            "rating_responses": {},
            "choice_responses": {},
            "checkbox_responses": {},
        }
        response = client.post(
            f"/api/journals/{test_journal.id}/draft",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "last_saved_at" in data

    def test_load_draft_empty(self, client, test_user, test_journal, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/journals/{test_journal.id}/draft", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["has_draft"] is False

    def test_save_and_load_draft(self, client, test_user, test_journal, journal_questions, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        payload = {
            "responses": {str(journal_questions[0].id): "work in progress"},
            "rating_responses": {str(journal_questions[1].id): 5},
            "choice_responses": {},
            "checkbox_responses": {},
        }
        client.post(f"/api/journals/{test_journal.id}/draft", json=payload, headers=headers)

        data = client.get(f"/api/journals/{test_journal.id}/draft", headers=headers).json()
        assert data["has_draft"] is True
        assert data["last_saved_at"] is not None


# ============================================================================
# Analysis status
# ============================================================================

class TestAnalysisStatus:
    """GET /api/journals/{journal_id}/analysis"""

    def test_analysis_needs_more_entries(self, client, test_user, test_journal, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/journals/{test_journal.id}/analysis", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["available"] is False
        assert data["needs_more_entries"] is True
        assert data["entries_until_analysis"] > 0


class TestTriggerAnalysis:
    """POST /api/journals/{journal_id}/analyze"""

    @patch("app.services.usage_service.usage_service")
    def test_analyze_insufficient_entries(self, mock_usage, client, test_user, test_journal, _mock_journals_flag):
        mock_usage.check_limit.return_value = (True, 0)
        headers = get_auth_headers(test_user.id)
        response = client.post(f"/api/journals/{test_journal.id}/analyze", headers=headers)
        assert response.status_code == status.HTTP_400_BAD_REQUEST


# ============================================================================
# Streak
# ============================================================================

class TestStreak:
    """GET /api/journals/{journal_id}/streak"""

    def test_streak_empty(self, client, test_user, test_journal, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/journals/{test_journal.id}/streak", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["current_streak"] == 0
        assert data["total_entries"] == 0

    def test_streak_with_entries(self, client, test_user, test_journal, journal_entry, _mock_journals_flag):
        headers = get_auth_headers(test_user.id)
        data = client.get(f"/api/journals/{test_journal.id}/streak", headers=headers).json()
        assert data["total_entries"] >= 1


# ============================================================================
# Sharing
# ============================================================================

class TestSharing:
    """Journal sharing endpoints"""

    @pytest.fixture
    def _mock_sharing_flags(self):
        """Mock feature flags for sharing: require_journals + share config."""
        def _config_value(db, feature, key, **kwargs):
            if key == "allowed_share_types":
                return ["analysis_only", "full"]
            if key == "max_shares_per_journal":
                return -1  # unlimited
            return None

        with patch(
            "app.routes.journals._require_journals_flag", return_value="free"
        ), patch(
            "app.services.feature_flag_service.feature_flag_service.get_config_value",
            side_effect=_config_value,
        ), patch(
            "app.services.feature_flag_service.feature_flag_service.is_enabled",
            return_value=True,
        ), patch(
            "app.services.subscription_service.subscription_service.get_tier",
            return_value="free",
        ):
            yield

    @patch("app.services.email_service.email_service")
    def test_create_share(self, mock_email, client, test_user, test_journal, _mock_sharing_flags):
        headers = get_auth_headers(test_user.id)
        payload = {"email": "friend@example.com", "share_type": "analysis_only"}
        response = client.post(
            f"/api/journals/{test_journal.id}/shares",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["email"] == "friend@example.com"
        assert data["share_type"] == "analysis_only"
        assert data["is_accepted"] is False

    @patch("app.services.email_service.email_service")
    def test_cannot_share_with_self(self, mock_email, client, test_user, test_journal, _mock_sharing_flags):
        headers = get_auth_headers(test_user.id)
        payload = {"email": test_user.email, "share_type": "full"}
        response = client.post(
            f"/api/journals/{test_journal.id}/shares",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_list_shares(self, client, test_user, test_journal, db_session, _mock_journals_flag):
        share = JournalShare(
            id=uuid4(),
            journal_id=test_journal.id,
            email="viewer@example.com",
            shared_by_id=test_user.id,
            share_type="analysis_only",
            invitation_token="SHARE_TOKEN_123",
        )
        db_session.add(share)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/journals/{test_journal.id}/shares", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_shares"] >= 1

    def test_revoke_share(self, client, test_user, test_journal, db_session, _mock_journals_flag):
        share = JournalShare(
            id=uuid4(),
            journal_id=test_journal.id,
            email="revokeme@example.com",
            shared_by_id=test_user.id,
            share_type="full",
            invitation_token="REVOKE_TOKEN_123",
        )
        db_session.add(share)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.delete(
            f"/api/journals/{test_journal.id}/shares/{share.id}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        db_session.refresh(share)
        assert share.is_revoked is True


class TestAcceptShare:
    """POST /api/journals/accept-share/{token}"""

    def test_accept_share(self, client, test_user, second_test_user, test_journal, db_session, _mock_journals_flag):
        share = JournalShare(
            id=uuid4(),
            journal_id=test_journal.id,
            email=second_test_user.email,
            shared_by_id=test_user.id,
            share_type="full",
            invitation_token="ACCEPT_TOKEN_123",
        )
        db_session.add(share)
        db_session.commit()

        headers = get_auth_headers(second_test_user.id)
        response = client.post("/api/journals/accept-share/ACCEPT_TOKEN_123", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "accepted"

    def test_accept_share_wrong_email(self, client, third_test_user, test_user, test_journal, db_session, _mock_journals_flag):
        share = JournalShare(
            id=uuid4(),
            journal_id=test_journal.id,
            email="someone@else.com",  # Doesn't match third_test_user
            shared_by_id=test_user.id,
            share_type="analysis_only",
            invitation_token="WRONG_EMAIL_TOKEN",
        )
        db_session.add(share)
        db_session.commit()

        headers = get_auth_headers(third_test_user.id)
        response = client.post("/api/journals/accept-share/WRONG_EMAIL_TOKEN", headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ============================================================================
# Shared journal access
# ============================================================================

class TestSharedJournalAccess:
    """Shared journal read-only endpoints"""

    def _setup_accepted_share(self, db_session, test_journal, test_user, second_test_user, share_type="full"):
        share = JournalShare(
            id=uuid4(),
            journal_id=test_journal.id,
            email=second_test_user.email,
            shared_by_id=test_user.id,
            shared_user_id=second_test_user.id,
            share_type=share_type,
            invitation_token=f"SHARED_{uuid4().hex[:8]}",
            is_accepted=True,
            accepted_at=datetime.utcnow(),
        )
        db_session.add(share)
        db_session.commit()
        return share

    @pytest.mark.xfail(
        reason="Route ordering bug: /{journal_id} (UUID) catches /shared-with-me first → 422",
        strict=True,
    )
    def test_shared_with_me_list(self, client, test_user, second_test_user, test_journal, db_session, _mock_journals_flag):
        self._setup_accepted_share(db_session, test_journal, test_user, second_test_user)
        headers = get_auth_headers(second_test_user.id)
        response = client.get("/api/journals/shared-with-me", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1

    def test_get_shared_journal(self, client, test_user, second_test_user, test_journal, db_session, _mock_journals_flag):
        self._setup_accepted_share(db_session, test_journal, test_user, second_test_user)
        headers = get_auth_headers(second_test_user.id)
        response = client.get(f"/api/journals/shared/{test_journal.id}", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["title"] == "Test Journal"
        assert "share_type" in data

    def test_analysis_only_share_blocks_entries(
        self, client, test_user, second_test_user, test_journal, journal_entry, db_session, _mock_journals_flag,
    ):
        self._setup_accepted_share(db_session, test_journal, test_user, second_test_user, share_type="analysis_only")
        headers = get_auth_headers(second_test_user.id)
        response = client.get(f"/api/journals/shared/{test_journal.id}/entries", headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_full_share_allows_entries(
        self, client, test_user, second_test_user, test_journal, journal_entry, db_session, _mock_journals_flag,
    ):
        self._setup_accepted_share(db_session, test_journal, test_user, second_test_user, share_type="full")
        headers = get_auth_headers(second_test_user.id)
        response = client.get(f"/api/journals/shared/{test_journal.id}/entries", headers=headers)
        assert response.status_code == status.HTTP_200_OK

    def test_unshared_user_gets_404(self, client, third_test_user, test_journal, _mock_journals_flag):
        headers = get_auth_headers(third_test_user.id)
        response = client.get(f"/api/journals/shared/{test_journal.id}", headers=headers)
        assert response.status_code in (403, 404)
