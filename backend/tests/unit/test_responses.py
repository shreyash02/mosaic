"""Tests for response submission and retrieval routes."""
import pytest
from datetime import datetime
from uuid import uuid4
from unittest.mock import patch, AsyncMock

from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from app.models.conversation import Conversation
from app.models.question import Question
from app.models.response import Response
from app.models.participant_code import ParticipantCode
from app.schemas.conversation import AnonymityLevel, ConversationState


class TestValidateCode:
    """Tests for POST /api/conversations/{access_code}/validate"""

    def test_validate_valid_code(self, client, active_conversation):
        """Should return valid=True for an active conversation."""
        response = client.post(f"/api/conversations/{active_conversation.access_code}/validate")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is True
        assert data["conversation_id"] == str(active_conversation.id)

    def test_validate_invalid_code(self, client):
        """Should return valid=False for a non-existent code."""
        response = client.post("/api/conversations/INVALIDCODEX/validate")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is False
        assert "invalid" in data["message"].lower()

    def test_validate_draft_conversation(self, client, draft_conversation):
        """Should return valid=False for a draft conversation."""
        response = client.post(f"/api/conversations/{draft_conversation.access_code}/validate")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is False
        assert "not been activated" in data["message"].lower()

    def test_validate_closed_conversation(self, client, closed_conversation):
        """Should return valid=False for a closed conversation."""
        response = client.post(f"/api/conversations/{closed_conversation.access_code}/validate")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is False
        assert "closed" in data["message"].lower()

    def test_validate_fully_anonymous_requires_participant_code(self, client, active_conversation):
        """Should indicate participant code is required for fully anonymous."""
        # active_conversation is already fully_anonymous
        response = client.post(f"/api/conversations/{active_conversation.access_code}/validate")

        data = response.json()
        assert data["valid"] is True
        assert data["requires_participant_code"] is True

    def test_validate_platform_tracked_requires_login(self, client, active_conversation_with_questions):
        """Should indicate login is required for platform_tracked."""
        response = client.post(
            f"/api/conversations/{active_conversation_with_questions.access_code}/validate"
        )

        data = response.json()
        assert data["valid"] is True
        assert data["requires_login"] is True
        assert data["requires_participant_code"] is False


class TestValidateParticipantCode:
    """Tests for POST /api/conversations/{access_code}/validate-participant"""

    def test_validate_valid_participant_code(self, client, active_conversation, participant_codes):
        """Should return valid=True for a valid, unused participant code."""
        code = participant_codes[0].participant_code
        response = client.post(
            f"/api/conversations/{active_conversation.access_code}/validate-participant",
            params={"participant_code": code},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is True
        assert data["session_token"] is not None
        assert data["has_submitted"] is False

    def test_validate_invalid_participant_code(self, client, active_conversation):
        """Should return valid=False for a bogus participant code."""
        response = client.post(
            f"/api/conversations/{active_conversation.access_code}/validate-participant",
            params={"participant_code": "BOGUS_CODE"},
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["valid"] is False

    def test_validate_used_participant_code(self, client, active_conversation, participant_codes, db_session):
        """Should return has_submitted=True for an already-used code."""
        code_obj = participant_codes[0]
        code_obj.is_used = True
        code_obj.used_at = datetime.utcnow()
        db_session.commit()

        response = client.post(
            f"/api/conversations/{active_conversation.access_code}/validate-participant",
            params={"participant_code": code_obj.participant_code},
        )

        data = response.json()
        assert data["valid"] is True
        assert data["has_submitted"] is True


class TestSubmitResponse:
    """Tests for POST /api/conversations/{access_code}/responses"""

    @patch("app.routes.responses.notification_service")
    def test_submit_platform_tracked_success(self, mock_notif, client, test_user, active_conversation_with_questions, second_test_user):
        """Should submit responses for platform_tracked conversation."""
        mock_notif.notify_response_submitted = AsyncMock()
        conv = active_conversation_with_questions
        questions = conv.questions
        headers = get_auth_headers(second_test_user.id)

        payload = {
            "responses": [
                {
                    "question_id": str(questions[0].id),
                    "response_text": "Things went great!",
                },
            ],
        }

        response = client.post(
            f"/api/conversations/{conv.access_code}/responses",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["success"] is True

    @patch("app.routes.responses.notification_service")
    def test_submit_shares_one_participation_id(self, mock_notif, client, active_conversation_with_questions, second_test_user, db_session):
        """All response rows of one submission share a single participation_id."""
        mock_notif.notify_response_submitted = AsyncMock()
        conv = active_conversation_with_questions
        questions = conv.questions
        headers = get_auth_headers(second_test_user.id)

        payload = {
            "responses": [
                {"question_id": str(questions[0].id), "response_text": "Went great"},
                {"question_id": str(questions[1].id), "response_data": {"rating": 4}},
            ],
        }

        resp = client.post(
            f"/api/conversations/{conv.access_code}/responses",
            json=payload,
            headers=headers,
        )
        assert resp.status_code == status.HTTP_201_CREATED

        rows = db_session.query(Response).filter(
            Response.conversation_id == conv.id,
            Response.status == "submitted",
        ).all()
        assert len(rows) == 2
        pids = {r.participation_id for r in rows}
        assert len(pids) == 1
        assert None not in pids

    @patch("app.routes.responses.notification_service")
    def test_submit_duplicate_blocked(self, mock_notif, client, test_user, active_conversation_with_questions, second_test_user, db_session):
        """Should reject duplicate submissions."""
        mock_notif.notify_response_submitted = AsyncMock()
        conv = active_conversation_with_questions
        questions = conv.questions
        headers = get_auth_headers(second_test_user.id)

        # Create existing submitted response
        existing = Response(
            id=uuid4(),
            conversation_id=conv.id,
            question_id=questions[0].id,
            response_text="Already submitted",
            anonymity_level=conv.anonymity_level,
            participant_id=second_test_user.id,
            status="submitted",
            submitted_at=datetime.utcnow(),
        )
        db_session.add(existing)
        db_session.commit()

        payload = {
            "responses": [
                {
                    "question_id": str(questions[0].id),
                    "response_text": "Trying again",
                },
            ],
        }

        response = client.post(
            f"/api/conversations/{conv.access_code}/responses",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already submitted" in response.json()["detail"].lower()

    def test_submit_inactive_conversation_blocked(self, client, test_user, draft_conversation, second_test_user):
        """Should reject submissions to inactive conversations."""
        headers = get_auth_headers(second_test_user.id)

        payload = {
            "responses": [
                {"question_id": str(uuid4()), "response_text": "Answer"},
            ],
        }

        response = client.post(
            f"/api/conversations/{draft_conversation.access_code}/responses",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_submit_not_found(self, client, second_test_user):
        """Should return 404 for non-existent conversation."""
        headers = get_auth_headers(second_test_user.id)

        payload = {
            "responses": [
                {"question_id": str(uuid4()), "response_text": "Answer"},
            ],
        }

        response = client.post(
            "/api/conversations/NOTEXISTCODE/responses",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    @patch("app.routes.responses.notification_service")
    def test_submit_unauthenticated_blocked_for_tracked(self, mock_notif, client, active_conversation_with_questions):
        """Should reject unauthenticated submission for platform_tracked."""
        mock_notif.notify_response_submitted = AsyncMock()
        conv = active_conversation_with_questions
        questions = conv.questions

        payload = {
            "responses": [
                {"question_id": str(questions[0].id), "response_text": "Answer"},
            ],
        }

        response = client.post(
            f"/api/conversations/{conv.access_code}/responses",
            json=payload,
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    @patch("app.routes.responses.notification_service")
    def test_submit_required_question_missing(self, mock_notif, client, active_conversation_with_questions, second_test_user):
        """Should reject if required question not answered."""
        mock_notif.notify_response_submitted = AsyncMock()
        conv = active_conversation_with_questions
        headers = get_auth_headers(second_test_user.id)

        # Submit with empty responses list (required question missing)
        payload = {"responses": []}

        response = client.post(
            f"/api/conversations/{conv.access_code}/responses",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @patch("app.routes.responses.notification_service")
    def test_submit_fully_anonymous_with_code(self, mock_notif, client, active_conversation, participant_codes, db_session):
        """Should submit fully anonymous response with participant code."""
        mock_notif.notify_response_submitted = AsyncMock()
        conv = active_conversation  # fully_anonymous

        # Add a question to the conversation
        question = Question(
            id=uuid4(),
            conversation_id=conv.id,
            question_type="text",
            question_text="How are you?",
            question_order=1,
            is_required=True,
        )
        db_session.add(question)
        db_session.commit()

        code = participant_codes[0].participant_code
        payload = {
            "responses": [
                {"question_id": str(question.id), "response_text": "I am good"},
            ],
            "participant_code": code,
        }

        response = client.post(
            f"/api/conversations/{conv.access_code}/responses",
            json=payload,
        )

        assert response.status_code == status.HTTP_201_CREATED


class TestGetResponses:
    """Tests for GET /api/conversations/{conversation_id}/responses"""

    def test_creator_gets_responses(self, client, test_user, active_conversation_with_questions, second_test_user, db_session):
        """Creator should retrieve all submitted responses."""
        conv = active_conversation_with_questions
        questions = conv.questions

        # Create a submitted response
        r = Response(
            id=uuid4(),
            conversation_id=conv.id,
            question_id=questions[0].id,
            response_text="Test answer",
            anonymity_level=conv.anonymity_level,
            participant_id=second_test_user.id,
            status="submitted",
            submitted_at=datetime.utcnow(),
        )
        db_session.add(r)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/conversations/{conv.id}/responses", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_count"] == 1
        assert len(data["responses"]) == 1

    def test_get_empty_responses(self, client, test_user, active_conversation_with_questions):
        """Creator should get empty list when no responses."""
        conv = active_conversation_with_questions
        headers = get_auth_headers(test_user.id)

        response = client.get(f"/api/conversations/{conv.id}/responses", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_count"] == 0

    def test_non_creator_blocked_creator_only(self, client, active_conversation_with_questions, second_test_user):
        """Non-creator should be blocked when results_access is creator_only."""
        conv = active_conversation_with_questions
        headers = get_auth_headers(second_test_user.id)

        response = client.get(f"/api/conversations/{conv.id}/responses", headers=headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestResponseStats:
    """Tests for GET /api/conversations/{conversation_id}/responses/stats"""

    def test_stats_success(self, client, test_user, active_conversation_with_questions, second_test_user, db_session):
        """Creator should get response statistics."""
        conv = active_conversation_with_questions
        questions = conv.questions

        # Add responses
        for i in range(3):
            r = Response(
                id=uuid4(),
                conversation_id=conv.id,
                question_id=questions[0].id,
                response_text=f"Answer {i}",
                anonymity_level=conv.anonymity_level,
                participant_id=second_test_user.id if i == 0 else test_user.id,
                status="submitted",
                submitted_at=datetime.utcnow(),
            )
            db_session.add(r)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/conversations/{conv.id}/responses/stats", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_responses"] == 3
        assert data["unique_participants"] >= 1

    def test_stats_non_creator_blocked(self, client, active_conversation_with_questions, second_test_user):
        """Non-creator should be blocked from stats."""
        conv = active_conversation_with_questions
        headers = get_auth_headers(second_test_user.id)

        response = client.get(f"/api/conversations/{conv.id}/responses/stats", headers=headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestCheckResponse:
    """Tests for GET /api/conversations/{access_code}/responses/check"""

    def test_check_no_submission(self, client, active_conversation_with_questions, second_test_user):
        """Should return has_submitted=False when user hasn't responded."""
        conv = active_conversation_with_questions
        headers = get_auth_headers(second_test_user.id)

        response = client.get(
            f"/api/conversations/{conv.access_code}/responses/check",
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["has_submitted"] is False

    def test_check_has_submitted(self, client, test_user, active_conversation_with_questions, second_test_user, db_session):
        """Should return has_submitted=True when user already responded."""
        conv = active_conversation_with_questions
        questions = conv.questions

        # Add submitted response
        r = Response(
            id=uuid4(),
            conversation_id=conv.id,
            question_id=questions[0].id,
            response_text="My answer",
            anonymity_level=conv.anonymity_level,
            participant_id=second_test_user.id,
            status="submitted",
            submitted_at=datetime.utcnow(),
        )
        db_session.add(r)
        db_session.commit()

        headers = get_auth_headers(second_test_user.id)
        response = client.get(
            f"/api/conversations/{conv.access_code}/responses/check",
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["has_submitted"] is True

    def test_check_not_found(self, client, second_test_user):
        """Should return 404 for non-existent conversation."""
        headers = get_auth_headers(second_test_user.id)

        response = client.get(
            "/api/conversations/NOTEXISTCODE/responses/check",
            headers=headers,
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateResponse:
    """Tests for PUT /api/conversations/{access_code}/responses"""

    @patch("app.routes.responses.notification_service")
    def test_update_response_editing_disabled(self, mock_notif, client, active_conversation_with_questions, second_test_user, db_session):
        """Should reject editing when allow_response_editing is off."""
        mock_notif.notify_response_submitted = AsyncMock()
        conv = active_conversation_with_questions
        conv.allow_response_editing = False
        db_session.commit()

        headers = get_auth_headers(second_test_user.id)
        questions = conv.questions

        payload = {
            "responses": [
                {"question_id": str(questions[0].id), "response_text": "Edited answer"},
            ],
        }

        response = client.put(
            f"/api/conversations/{conv.access_code}/responses",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch("app.routes.responses.notification_service")
    def test_update_no_existing_response(self, mock_notif, client, active_conversation_with_questions, second_test_user, db_session):
        """Should reject editing when user has no existing response."""
        mock_notif.notify_response_submitted = AsyncMock()
        conv = active_conversation_with_questions
        conv.allow_response_editing = True
        db_session.commit()

        headers = get_auth_headers(second_test_user.id)
        questions = conv.questions

        payload = {
            "responses": [
                {"question_id": str(questions[0].id), "response_text": "Edited answer"},
            ],
        }

        response = client.put(
            f"/api/conversations/{conv.access_code}/responses",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "no existing response" in response.json()["detail"].lower()
