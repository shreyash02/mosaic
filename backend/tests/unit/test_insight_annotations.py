"""Tests for insight annotation routes."""
import pytest
from datetime import datetime
from uuid import uuid4

from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from app.models.insight_annotation import InsightAnnotation


class TestListAnnotations:
    """Tests for GET .../annotations"""

    def test_list_empty(self, client, test_user, active_conversation, test_analysis):
        """Should return empty list when no annotations."""
        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        response = client.get(
            f"/api/conversations/{cid}/analyses/{aid}/annotations",
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 0
        assert data["annotations"] == []

    def test_list_with_annotations(self, client, test_user, active_conversation, test_analysis, db_session):
        """Should return created annotations."""
        ann = InsightAnnotation(
            id=uuid4(),
            analysis_id=test_analysis.id,
            user_id=test_user.id,
            target_type="theme",
            target_key={"theme": "Communication", "index": 0},
            starred=True,
            note="Important theme",
            created_at=datetime.utcnow(),
        )
        db_session.add(ann)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        response = client.get(
            f"/api/conversations/{cid}/analyses/{aid}/annotations",
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total"] == 1
        assert data["annotations"][0]["starred"] is True
        assert data["annotations"][0]["note"] == "Important theme"

    def test_list_non_creator_blocked(self, client, second_test_user, active_conversation, test_analysis):
        """Non-creator should be blocked."""
        headers = get_auth_headers(second_test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        response = client.get(
            f"/api/conversations/{cid}/analyses/{aid}/annotations",
            headers=headers,
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestUpsertAnnotation:
    """Tests for PUT .../annotations"""

    def test_create_with_star(self, client, test_user, active_conversation, test_analysis):
        """Should create a new annotation with star."""
        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        payload = {
            "target_type": "theme",
            "target_key": {"theme": "Communication", "index": 0},
            "starred": True,
        }

        response = client.put(
            f"/api/conversations/{cid}/analyses/{aid}/annotations",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["starred"] is True
        assert data["target_type"] == "theme"

    def test_create_with_note(self, client, test_user, active_conversation, test_analysis):
        """Should create annotation with note."""
        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        payload = {
            "target_type": "surprising_insight",
            "target_key": {"index": 0},
            "note": "Follow up on this",
        }

        response = client.put(
            f"/api/conversations/{cid}/analyses/{aid}/annotations",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["note"] == "Follow up on this"

    def test_update_existing(self, client, test_user, active_conversation, test_analysis, db_session):
        """Should update an existing annotation."""
        ann = InsightAnnotation(
            id=uuid4(),
            analysis_id=test_analysis.id,
            user_id=test_user.id,
            target_type="theme",
            target_key={"theme": "Communication", "index": 0},
            starred=True,
            created_at=datetime.utcnow(),
        )
        db_session.add(ann)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        payload = {
            "target_type": "theme",
            "target_key": {"theme": "Communication", "index": 0},
            "note": "Added a note",
        }

        response = client.put(
            f"/api/conversations/{cid}/analyses/{aid}/annotations",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["note"] == "Added a note"
        assert data["starred"] is True  # Unchanged

    def test_auto_delete_when_empty(self, client, test_user, active_conversation, test_analysis, db_session):
        """Should auto-delete when starred=False and note is empty."""
        ann = InsightAnnotation(
            id=uuid4(),
            analysis_id=test_analysis.id,
            user_id=test_user.id,
            target_type="theme",
            target_key={"theme": "Test", "index": 0},
            starred=True,
            created_at=datetime.utcnow(),
        )
        db_session.add(ann)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        payload = {
            "target_type": "theme",
            "target_key": {"theme": "Test", "index": 0},
            "starred": False,
            "note": "",
        }

        response = client.put(
            f"/api/conversations/{cid}/analyses/{aid}/annotations",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_upsert_non_creator_blocked(self, client, second_test_user, active_conversation, test_analysis):
        """Non-creator should be blocked."""
        headers = get_auth_headers(second_test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        payload = {
            "target_type": "theme",
            "target_key": {"theme": "Test", "index": 0},
            "starred": True,
        }

        response = client.put(
            f"/api/conversations/{cid}/analyses/{aid}/annotations",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestDeleteAnnotation:
    """Tests for DELETE .../annotations/{annotation_id}"""

    def test_delete_success(self, client, test_user, active_conversation, test_analysis, db_session):
        """Should delete annotation."""
        ann = InsightAnnotation(
            id=uuid4(),
            analysis_id=test_analysis.id,
            user_id=test_user.id,
            target_type="theme",
            target_key={"theme": "Delete Me", "index": 0},
            starred=True,
            created_at=datetime.utcnow(),
        )
        db_session.add(ann)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        response = client.delete(
            f"/api/conversations/{cid}/analyses/{aid}/annotations/{ann.id}",
            headers=headers,
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_not_found(self, client, test_user, active_conversation, test_analysis):
        """Should return 404 for non-existent annotation."""
        headers = get_auth_headers(test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id
        fake_id = uuid4()

        response = client.delete(
            f"/api/conversations/{cid}/analyses/{aid}/annotations/{fake_id}",
            headers=headers,
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_non_creator_blocked(self, client, second_test_user, active_conversation, test_analysis, db_session, test_user):
        """Non-creator should be blocked."""
        ann = InsightAnnotation(
            id=uuid4(),
            analysis_id=test_analysis.id,
            user_id=test_user.id,
            target_type="theme",
            target_key={"theme": "Blocked", "index": 0},
            starred=True,
            created_at=datetime.utcnow(),
        )
        db_session.add(ann)
        db_session.commit()

        headers = get_auth_headers(second_test_user.id)
        cid = active_conversation.id
        aid = test_analysis.id

        response = client.delete(
            f"/api/conversations/{cid}/analyses/{aid}/annotations/{ann.id}",
            headers=headers,
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
