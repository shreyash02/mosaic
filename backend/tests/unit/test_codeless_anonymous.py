"""Tests for codeless fully-anonymous conversations and response limits."""
import pytest
from datetime import datetime
from uuid import uuid4

from fastapi import status

from tests.helpers.api_helpers import get_auth_headers, create_test_conversation_payload
from app.models.conversation import Conversation
from app.models.question import Question
from app.models.response import Response
from app.schemas.conversation import AnonymityLevel, ConversationState


@pytest.fixture
def codeless_conversation(db_session, test_user, test_workspace) -> Conversation:
    """Active fully-anonymous conversation without participant codes, capped at 3 responses."""
    conversation = Conversation(
        id=uuid4(),
        title="Codeless Anonymous Conversation",
        creator_id=test_user.id,
        workspace_id=test_workspace.id,
        anonymity_level=AnonymityLevel.FULLY_ANONYMOUS,
        results_access="creator_only",
        state=ConversationState.ACTIVE,
        access_code="CODELESS1234",
        require_participant_codes=False,
        max_responses=3,
        activated_at=datetime.utcnow(),
        timezone="UTC",
    )
    db_session.add(conversation)
    db_session.flush()
    question = Question(
        id=uuid4(),
        conversation_id=conversation.id,
        question_text="How is it going?",
        question_type="text",
        question_order=0,
    )
    db_session.add(question)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation


def _submit(client, conversation, text="A response"):
    question_id = conversation.questions[0].id
    return client.post(
        f"/api/conversations/{conversation.access_code}/responses",
        json={"responses": [{"question_id": str(question_id), "response_text": text}]},
    )


class TestCodelessCreation:
    """POST /api/conversations validation for codeless anonymous conversations."""

    @pytest.mark.usefixtures("test_workspace")
    def test_codeless_requires_max_responses(self, client, test_user):
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(anonymity_level="fully_anonymous")
        payload["require_participant_codes"] = False

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        assert "response limit" in str(response.json()["detail"]).lower()

    @pytest.mark.usefixtures("test_workspace")
    def test_codeless_with_limit_created(self, client, test_user):
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(anonymity_level="fully_anonymous")
        payload["require_participant_codes"] = False
        payload["max_responses"] = 100

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["require_participant_codes"] is False
        assert data["max_responses"] == 100

    @pytest.mark.usefixtures("test_workspace")
    def test_max_responses_ceiling_enforced(self, client, test_user):
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(anonymity_level="fully_anonymous")
        payload["require_participant_codes"] = False
        payload["max_responses"] = 10001

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.usefixtures("test_workspace")
    def test_codeless_participants_results_access_coerced_to_public_link(self, client, test_user):
        """Codeless respondents can't prove participation, so participants access becomes public_link."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(
            anonymity_level="fully_anonymous",
            results_access="participants",
        )
        payload["require_participant_codes"] = False
        payload["max_responses"] = 100

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["results_access"] == "public_link"

    @pytest.mark.usefixtures("test_workspace")
    def test_codeless_creator_only_results_access_kept(self, client, test_user):
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(
            anonymity_level="fully_anonymous",
            results_access="creator_only",
        )
        payload["require_participant_codes"] = False
        payload["max_responses"] = 100

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["results_access"] == "creator_only"

    @pytest.mark.usefixtures("test_workspace")
    def test_coded_anonymous_does_not_require_limit(self, client, test_user):
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(anonymity_level="fully_anonymous")

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["require_participant_codes"] is True
        assert data["max_responses"] is None


class TestCodelessValidate:
    """POST /api/conversations/{access_code}/validate for codeless conversations."""

    def test_validate_codeless_needs_no_code_or_login(self, client, codeless_conversation):
        response = client.post(f"/api/conversations/{codeless_conversation.access_code}/validate")

        data = response.json()
        assert data["valid"] is True
        assert data["requires_participant_code"] is False
        assert data["requires_login"] is False

    def test_validate_reports_limit_reached(self, client, codeless_conversation, db_session):
        for i in range(3):
            db_session.add(Response(
                id=uuid4(),
                conversation_id=codeless_conversation.id,
                question_id=codeless_conversation.questions[0].id,
                response_text=f"r{i}",
                anonymity_level=AnonymityLevel.FULLY_ANONYMOUS,
                participant_code_used=f"open-{i}",
                status="submitted",
                submitted_at=datetime.utcnow(),
            ))
        db_session.commit()

        response = client.post(f"/api/conversations/{codeless_conversation.access_code}/validate")

        data = response.json()
        assert data["valid"] is False
        assert data["limit_reached"] is True
        assert "limit" in data["message"].lower()


class TestCodelessSubmit:
    """POST /api/conversations/{access_code}/responses for codeless conversations."""

    def test_submit_without_code_succeeds(self, client, codeless_conversation, db_session):
        response = _submit(client, codeless_conversation)

        assert response.status_code == status.HTTP_201_CREATED
        row = db_session.query(Response).filter(
            Response.conversation_id == codeless_conversation.id
        ).one()
        assert row.participant_code_used.startswith("open-")
        assert row.participant_id is None

    def test_authenticated_submit_records_no_identity(self, client, codeless_conversation, second_test_user, db_session):
        headers = get_auth_headers(second_test_user.id)
        question_id = codeless_conversation.questions[0].id

        response = client.post(
            f"/api/conversations/{codeless_conversation.access_code}/responses",
            json={"responses": [{"question_id": str(question_id), "response_text": "hi"}]},
            headers=headers,
        )

        assert response.status_code == status.HTTP_201_CREATED
        row = db_session.query(Response).filter(
            Response.conversation_id == codeless_conversation.id
        ).one()
        assert row.participant_id is None

    def test_each_submission_counts_separately(self, client, codeless_conversation, db_session):
        _submit(client, codeless_conversation, "first")
        _submit(client, codeless_conversation, "second")

        codes = [r.participant_code_used for r in db_session.query(Response).filter(
            Response.conversation_id == codeless_conversation.id
        ).all()]
        assert len(codes) == 2
        assert len(set(codes)) == 2

    def test_limit_blocks_further_submissions(self, client, codeless_conversation):
        for i in range(3):
            assert _submit(client, codeless_conversation, f"r{i}").status_code == status.HTTP_201_CREATED

        response = _submit(client, codeless_conversation, "one too many")

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "limit" in response.json()["detail"].lower()

    def test_coded_conversation_still_requires_code(self, client, active_conversation, db_session):
        question = Question(
            id=uuid4(),
            conversation_id=active_conversation.id,
            question_text="Q?",
            question_type="text",
            question_order=0,
        )
        db_session.add(question)
        db_session.commit()

        response = client.post(
            f"/api/conversations/{active_conversation.access_code}/responses",
            json={"responses": [{"question_id": str(question.id), "response_text": "hi"}]},
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "participant code" in response.json()["detail"].lower()


class TestResponseLimitUpdate:
    """PATCH /api/conversations/{conversation_id} for max_responses."""

    def test_creator_can_adjust_limit_while_active(self, client, test_user, codeless_conversation):
        headers = get_auth_headers(test_user.id)

        response = client.patch(
            f"/api/conversations/{codeless_conversation.id}",
            json={"max_responses": 500},
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["max_responses"] == 500

    def test_cannot_unset_limit_on_codeless(self, client, test_user, codeless_conversation):
        headers = get_auth_headers(test_user.id)

        response = client.patch(
            f"/api/conversations/{codeless_conversation.id}",
            json={"max_responses": None},
            headers=headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "response limit" in response.json()["detail"].lower()

    def test_limit_above_ceiling_rejected(self, client, test_user, codeless_conversation):
        headers = get_auth_headers(test_user.id)

        response = client.patch(
            f"/api/conversations/{codeless_conversation.id}",
            json={"max_responses": 20000},
            headers=headers,
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestMidFlightSwitchToCodeless:
    """PATCH switching an active coded conversation to codeless mode."""

    def test_switch_active_coded_to_codeless_with_limit(self, client, test_user, active_conversation):
        headers = get_auth_headers(test_user.id)

        response = client.patch(
            f"/api/conversations/{active_conversation.id}",
            json={"require_participant_codes": False, "max_responses": 200},
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["require_participant_codes"] is False
        assert data["max_responses"] == 200

        # The conversation now validates as codeless
        validate = client.post(f"/api/conversations/{active_conversation.access_code}/validate")
        assert validate.json()["requires_participant_code"] is False

    def test_switch_coerces_participants_results_access(self, client, test_user, active_conversation, db_session):
        """Mid-flight switch on a participants-visibility conversation moves it to public_link."""
        active_conversation.results_access = "participants"
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.patch(
            f"/api/conversations/{active_conversation.id}",
            json={"require_participant_codes": False, "max_responses": 200},
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["results_access"] == "public_link"

    def test_switch_without_limit_rejected(self, client, test_user, active_conversation):
        headers = get_auth_headers(test_user.id)

        response = client.patch(
            f"/api/conversations/{active_conversation.id}",
            json={"require_participant_codes": False},
            headers=headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "response limit" in response.json()["detail"].lower()

    def test_cannot_reenable_codes_after_activation(self, client, test_user, codeless_conversation):
        headers = get_auth_headers(test_user.id)

        response = client.patch(
            f"/api/conversations/{codeless_conversation.id}",
            json={"require_participant_codes": True},
            headers=headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "re-enabled" in response.json()["detail"].lower()


class TestEffectiveResultsAccess:
    """Codeless + participants results access behaves as public_link at enforcement time."""

    def test_legacy_participants_treated_as_public_link(self, codeless_conversation, db_session):
        from app.core.access_control import effective_results_access
        # Simulate a row that predates the create/update coercion
        codeless_conversation.results_access = "participants"
        db_session.commit()

        assert effective_results_access(codeless_conversation) == "public_link"

    def test_creator_only_never_widened(self, codeless_conversation):
        from app.core.access_control import effective_results_access
        assert codeless_conversation.results_access == "creator_only"
        assert effective_results_access(codeless_conversation) == "creator_only"

    def test_coded_participants_unchanged(self, active_conversation, db_session):
        from app.core.access_control import effective_results_access
        active_conversation.results_access = "participants"
        db_session.commit()

        assert effective_results_access(active_conversation) == "participants"


class TestCodelessConversationAccess:
    """GET /api/conversations/by-code/{access_code} for codeless conversations."""

    def test_by_code_accessible_without_session(self, client, codeless_conversation):
        response = client.get(f"/api/conversations/by-code/{codeless_conversation.access_code}")

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["require_participant_codes"] is False
        assert data["max_responses"] == 3

    def test_coded_conversation_still_requires_session(self, client, active_conversation):
        response = client.get(f"/api/conversations/by-code/{active_conversation.access_code}")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
