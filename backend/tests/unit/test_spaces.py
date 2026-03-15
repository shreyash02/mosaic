"""Tests for spaces endpoints.

Covers CRUD, ideas, themes, membership, access control, and sharing.
Feature flags and external services (LLM, email, SSE) are mocked.
"""
import pytest
from uuid import uuid4
from datetime import datetime
from unittest.mock import patch, MagicMock
from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from app.models.space import Space
from app.models.space_member import SpaceMember
from app.models.idea import Idea
from app.models.theme import Theme
from app.models.idea_theme import IdeaTheme
from app.models.space_invitation import SpaceInvitation
from app.models.space_shared_viewer import SpaceSharedViewer
from app.models.space_snapshot import SpaceSnapshot


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def _mock_spaces_flag():
    """Mock feature flags so spaces endpoints don't 403."""
    with patch(
        "app.routes.spaces._require_spaces_flag", return_value="free"
    ), patch(
        "app.services.feature_flag_service.feature_flag_service.get_config_value",
        return_value=None,
    ), patch(
        "app.services.feature_flag_service.feature_flag_service.is_enabled",
        return_value=True,
    ), patch(
        "app.services.platform_settings_service.is_spaces_enabled",
        return_value=True,
    ), patch(
        "app.services.subscription_service.subscription_service.get_tier",
        return_value="free",
    ):
        yield


@pytest.fixture
def _mock_sse():
    """Mock SSE broadcasts so they don't fail."""
    with patch("app.routes.spaces._broadcast_sse_to_space"):
        yield


@pytest.fixture
def test_space(db_session, test_user, test_workspace, _mock_spaces_flag):
    """Create a test space with owner membership."""
    space = Space(
        id=uuid4(),
        title="Test Space",
        description="A test space",
        owner_id=test_user.id,
        workspace_id=test_workspace.id,
        settings={"purposes": ["explore"]},
    )
    db_session.add(space)
    db_session.flush()
    member = SpaceMember(
        space_id=space.id,
        user_id=test_user.id,
        role="owner",
    )
    db_session.add(member)
    db_session.commit()
    db_session.refresh(space)
    return space


@pytest.fixture
def second_user_editor(db_session, second_test_user, test_space):
    """Add second_test_user as editor to test_space."""
    member = SpaceMember(
        space_id=test_space.id,
        user_id=second_test_user.id,
        role="editor",
    )
    db_session.add(member)
    db_session.commit()
    return member


@pytest.fixture
def second_user_viewer(db_session, second_test_user, test_space):
    """Add second_test_user as viewer to test_space."""
    member = SpaceMember(
        space_id=test_space.id,
        user_id=second_test_user.id,
        role="viewer",
    )
    db_session.add(member)
    db_session.commit()
    return member


@pytest.fixture
def second_user_suggester(db_session, second_test_user, test_space):
    """Add second_test_user as suggester to test_space."""
    member = SpaceMember(
        space_id=test_space.id,
        user_id=second_test_user.id,
        role="suggester",
    )
    db_session.add(member)
    db_session.commit()
    return member


@pytest.fixture
def test_idea(db_session, test_space, test_user):
    """Create a test idea in the space."""
    idea = Idea(
        id=uuid4(),
        space_id=test_space.id,
        author_id=test_user.id,
        text="This is a test idea",
        status="active",
    )
    db_session.add(idea)
    db_session.commit()
    db_session.refresh(idea)
    return idea


@pytest.fixture
def test_theme(db_session, test_space):
    """Create a test theme in the space."""
    theme = Theme(
        id=uuid4(),
        space_id=test_space.id,
        name="Test Theme",
        summary="A theme for testing",
        color="#3B82F6",
        is_ai_generated=True,
    )
    db_session.add(theme)
    db_session.commit()
    db_session.refresh(theme)
    return theme


@pytest.fixture
def test_snapshot(db_session, test_space, test_user):
    """Create a test snapshot."""
    snapshot = SpaceSnapshot(
        id=uuid4(),
        space_id=test_space.id,
        created_by_id=test_user.id,
        title="Test Snapshot",
        snapshot_type="manual",
        snapshot_data={"space": {"title": "Test"}, "themes": [], "ideas": [], "graph": {"nodes": [], "edges": []}},
    )
    db_session.add(snapshot)
    db_session.commit()
    db_session.refresh(snapshot)
    return snapshot


# ============================================================================
# Space CRUD
# ============================================================================

class TestCreateSpace:
    """POST /api/spaces"""

    def test_create_space(self, client, test_user, test_workspace, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        payload = {"title": "My Space", "description": "Ideas go here"}
        response = client.post("/api/spaces", json=payload, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "My Space"
        assert data["is_owner"] is True
        assert data["idea_count"] == 0
        assert data["theme_count"] == 0

    def test_create_space_with_purposes(self, client, test_user, test_workspace, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        payload = {"title": "Action Space", "purposes": ["actions", "insights"]}
        response = client.post("/api/spaces", json=payload, headers=headers)
        data = response.json()
        assert data["purposes"] == ["actions", "insights"]

    def test_create_space_unauthenticated(self, client, _mock_spaces_flag):
        response = client.post("/api/spaces", json={"title": "X"})
        assert response.status_code in (401, 403)


class TestListSpaces:
    """GET /api/spaces"""

    def test_list_own_spaces(self, client, test_user, test_space, _mock_spaces_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get("/api/spaces", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert any(s["id"] == str(test_space.id) for s in data)

    def test_list_excludes_others_spaces(self, client, second_test_user, test_space, _mock_spaces_flag):
        headers = get_auth_headers(second_test_user.id)
        data = client.get("/api/spaces", headers=headers).json()
        assert not any(s["id"] == str(test_space.id) for s in data)

    def test_list_includes_member_spaces(
        self, client, second_test_user, test_space, second_user_editor, _mock_spaces_flag
    ):
        headers = get_auth_headers(second_test_user.id)
        data = client.get("/api/spaces", headers=headers).json()
        assert any(s["id"] == str(test_space.id) for s in data)


class TestGetSpace:
    """GET /api/spaces/{space_id}"""

    def test_get_space_owner(self, client, test_user, test_space, _mock_spaces_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/spaces/{test_space.id}", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["title"] == "Test Space"
        assert data["is_owner"] is True
        assert data["can_edit"] is True

    def test_get_space_member(self, client, second_test_user, test_space, second_user_editor, _mock_spaces_flag):
        headers = get_auth_headers(second_test_user.id)
        data = client.get(f"/api/spaces/{test_space.id}", headers=headers).json()
        assert data["is_owner"] is False
        assert data["can_edit"] is True

    def test_get_space_viewer_cannot_edit(self, client, second_test_user, test_space, second_user_viewer, _mock_spaces_flag):
        headers = get_auth_headers(second_test_user.id)
        data = client.get(f"/api/spaces/{test_space.id}", headers=headers).json()
        assert data["can_edit"] is False
        assert data["can_suggest"] is False

    def test_get_space_non_member_404(self, client, second_test_user, test_space, _mock_spaces_flag):
        headers = get_auth_headers(second_test_user.id)
        response = client.get(f"/api/spaces/{test_space.id}", headers=headers)
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateSpace:
    """PATCH /api/spaces/{space_id}"""

    def test_update_title(self, client, test_user, test_space, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.patch(
            f"/api/spaces/{test_space.id}",
            json={"title": "Updated Space"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["title"] == "Updated Space"

    def test_update_non_owner_forbidden(self, client, second_test_user, test_space, second_user_editor, _mock_spaces_flag):
        headers = get_auth_headers(second_test_user.id)
        response = client.patch(
            f"/api/spaces/{test_space.id}",
            json={"title": "Hijacked"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestDeleteSpace:
    """DELETE /api/spaces/{space_id}"""

    def test_delete_as_owner(self, client, test_user, test_space, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.delete(f"/api/spaces/{test_space.id}", headers=headers)
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_non_owner_forbidden(self, client, second_test_user, test_space, second_user_editor, _mock_spaces_flag):
        headers = get_auth_headers(second_test_user.id)
        response = client.delete(f"/api/spaces/{test_space.id}", headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ============================================================================
# Ideas
# ============================================================================

class TestCreateIdea:
    """POST /api/spaces/{space_id}/ideas"""

    @patch("app.routes.spaces.run_classify_idea_task")
    @patch("app.services.space_service.SpaceService.generate_embedding", return_value=[0.1] * 1536)
    def test_create_idea(self, _embed, _classify, client, test_user, test_space, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.post(
            f"/api/spaces/{test_space.id}/ideas",
            json={"text": "A brilliant idea"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["text"] == "A brilliant idea"
        assert data["status"] == "active"

    @patch("app.routes.spaces.run_classify_idea_task")
    @patch("app.services.space_service.SpaceService.generate_embedding", return_value=[0.1] * 1536)
    def test_suggester_creates_suggestion(
        self, _embed, _classify, client, second_test_user, test_space,
        second_user_suggester, _mock_spaces_flag, _mock_sse,
    ):
        headers = get_auth_headers(second_test_user.id)
        response = client.post(
            f"/api/spaces/{test_space.id}/ideas",
            json={"text": "A suggestion"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["status"] == "suggested"

    def test_viewer_cannot_create_idea(self, client, second_test_user, test_space, second_user_viewer, _mock_spaces_flag):
        headers = get_auth_headers(second_test_user.id)
        response = client.post(
            f"/api/spaces/{test_space.id}/ideas",
            json={"text": "Blocked"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestListIdeas:
    """GET /api/spaces/{space_id}/ideas"""

    def test_list_ideas(self, client, test_user, test_space, test_idea, _mock_spaces_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/spaces/{test_space.id}/ideas", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["text"] == "This is a test idea"


class TestUpdateIdea:
    """PATCH /api/spaces/{space_id}/ideas/{idea_id}"""

    @patch("app.routes.spaces.run_classify_idea_task")
    @patch("app.services.space_service.SpaceService.generate_embedding", return_value=[0.1] * 1536)
    def test_update_idea_text(self, _embed, _classify, client, test_user, test_space, test_idea, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.patch(
            f"/api/spaces/{test_space.id}/ideas/{test_idea.id}",
            json={"text": "Updated idea text"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["text"] == "Updated idea text"

    def test_viewer_cannot_update(self, client, second_test_user, test_space, test_idea, second_user_viewer, _mock_spaces_flag):
        headers = get_auth_headers(second_test_user.id)
        response = client.patch(
            f"/api/spaces/{test_space.id}/ideas/{test_idea.id}",
            json={"text": "Nope"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestDeleteIdea:
    """DELETE /api/spaces/{space_id}/ideas/{idea_id}"""

    def test_delete_idea_soft_deletes(self, client, test_user, test_space, test_idea, db_session, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.delete(
            f"/api/spaces/{test_space.id}/ideas/{test_idea.id}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        db_session.refresh(test_idea)
        assert test_idea.status == "archived"


# ============================================================================
# Themes
# ============================================================================

class TestListThemes:
    """GET /api/spaces/{space_id}/themes"""

    def test_list_themes(self, client, test_user, test_space, test_theme, _mock_spaces_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/spaces/{test_space.id}/themes", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["name"] == "Test Theme"
        assert "idea_count" in data[0]


class TestUpdateTheme:
    """PATCH /api/spaces/{space_id}/themes/{theme_id}"""

    def test_rename_theme(self, client, test_user, test_space, test_theme, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.patch(
            f"/api/spaces/{test_space.id}/themes/{test_theme.id}",
            json={"name": "Renamed Theme"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Renamed Theme"
        assert data["is_ai_generated"] is False  # Renaming clears AI flag


class TestDeleteTheme:
    """DELETE /api/spaces/{space_id}/themes/{theme_id}"""

    def test_delete_theme(self, client, test_user, test_space, test_theme, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.delete(
            f"/api/spaces/{test_space.id}/themes/{test_theme.id}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT


class TestMergeThemes:
    """POST /api/spaces/{space_id}/themes/merge"""

    def test_merge_themes(self, client, test_user, test_space, test_theme, db_session, _mock_spaces_flag, _mock_sse):
        target = Theme(
            id=uuid4(), space_id=test_space.id, name="Target Theme", color="#EF4444",
        )
        db_session.add(target)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.post(
            f"/api/spaces/{test_space.id}/themes/merge",
            json={"source_theme_id": str(test_theme.id), "target_theme_id": str(target.id)},
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == "Target Theme"


# ============================================================================
# Suggestions workflow
# ============================================================================

class TestSuggestions:
    """Suggestion approval/rejection flow"""

    def test_list_suggestions(self, client, test_user, test_space, db_session, _mock_spaces_flag):
        # Create a suggestion
        suggestion = Idea(
            id=uuid4(), space_id=test_space.id, author_id=test_user.id,
            text="Suggested idea", status="suggested",
        )
        db_session.add(suggestion)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/spaces/{test_space.id}/suggestions", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["status"] == "suggested"

    @patch("app.routes.spaces.run_classify_idea_task")
    def test_approve_suggestion(self, _classify, client, test_user, test_space, db_session, _mock_spaces_flag, _mock_sse):
        suggestion = Idea(
            id=uuid4(), space_id=test_space.id, author_id=test_user.id,
            text="To approve", status="suggested",
        )
        db_session.add(suggestion)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.post(
            f"/api/spaces/{test_space.id}/suggestions/{suggestion.id}/approve",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["status"] == "active"

    def test_reject_suggestion(self, client, test_user, test_space, db_session, _mock_spaces_flag, _mock_sse):
        suggestion = Idea(
            id=uuid4(), space_id=test_space.id, author_id=test_user.id,
            text="To reject", status="suggested",
        )
        db_session.add(suggestion)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.post(
            f"/api/spaces/{test_space.id}/suggestions/{suggestion.id}/reject",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK


# ============================================================================
# Members
# ============================================================================

class TestMembers:
    """Member management endpoints"""

    def test_list_members(self, client, test_user, test_space, _mock_spaces_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/spaces/{test_space.id}/members", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["role"] == "owner"

    def test_remove_member(self, client, test_user, test_space, second_test_user, second_user_editor, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.delete(
            f"/api/spaces/{test_space.id}/members/{second_test_user.id}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_non_owner_cannot_remove_member(
        self, client, second_test_user, test_space, second_user_editor, _mock_spaces_flag,
    ):
        headers = get_auth_headers(second_test_user.id)
        response = client.delete(
            f"/api/spaces/{test_space.id}/members/{second_test_user.id}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_update_member_role(self, client, test_user, test_space, second_test_user, second_user_editor, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.patch(
            f"/api/spaces/{test_space.id}/members/{second_test_user.id}",
            json={"role": "viewer"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["role"] == "viewer"


# ============================================================================
# Invitations
# ============================================================================

class TestInvitations:
    """Space invitation endpoints"""

    @patch("app.services.email_service.email_service")
    def test_invite_users(self, mock_email, client, test_user, test_space, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.post(
            f"/api/spaces/{test_space.id}/invitations",
            json={"emails": ["invitee@example.com"], "role": "editor"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["invitations_created"] >= 1

    def test_non_owner_cannot_invite(self, client, second_test_user, test_space, second_user_editor, _mock_spaces_flag):
        headers = get_auth_headers(second_test_user.id)
        response = client.post(
            f"/api/spaces/{test_space.id}/invitations",
            json={"emails": ["x@example.com"]},
            headers=headers,
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_invitations(self, client, test_user, test_space, db_session, _mock_spaces_flag):
        inv = SpaceInvitation(
            id=uuid4(), space_id=test_space.id, email="pending@example.com",
            invited_by_id=test_user.id, invitation_token="TOKEN123",
            role="editor",
        )
        db_session.add(inv)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/spaces/{test_space.id}/invitations", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) >= 1


# ============================================================================
# Snapshots
# ============================================================================

class TestSnapshots:
    """Snapshot CRUD endpoints"""

    def test_create_snapshot(self, client, test_user, test_space, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.post(
            f"/api/spaces/{test_space.id}/snapshots",
            json={"title": "Manual snapshot"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "Manual snapshot"
        assert data["snapshot_type"] == "manual"

    def test_list_snapshots(self, client, test_user, test_space, test_snapshot, _mock_spaces_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/spaces/{test_space.id}/snapshots", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) >= 1

    def test_get_snapshot_detail(self, client, test_user, test_space, test_snapshot, _mock_spaces_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/spaces/{test_space.id}/snapshots/{test_snapshot.id}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "snapshot_data" in data

    def test_delete_snapshot_owner_only(self, client, second_test_user, test_space, test_snapshot, second_user_editor, _mock_spaces_flag):
        headers = get_auth_headers(second_test_user.id)
        response = client.delete(
            f"/api/spaces/{test_space.id}/snapshots/{test_snapshot.id}",
            headers=headers,
        )
        assert response.status_code == status.HTTP_403_FORBIDDEN


# ============================================================================
# Sharing
# ============================================================================

class TestSharing:
    """Link sharing and shared viewer endpoints"""

    def test_enable_link_sharing(self, client, test_user, test_space, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.patch(
            f"/api/spaces/{test_space.id}/sharing",
            json={"share_access": "authenticated"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["share_access"] == "authenticated"

    def test_link_shared_user_gets_shared_view(
        self, client, test_user, second_test_user, test_space, db_session, _mock_spaces_flag,
    ):
        test_space.share_access = "authenticated"
        db_session.commit()

        headers = get_auth_headers(second_test_user.id)
        response = client.get(f"/api/spaces/{test_space.id}", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        assert response.json()["is_shared_view"] is True

    @patch("app.services.email_service.email_service")
    def test_add_shared_viewer(self, mock_email, client, test_user, test_space, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.post(
            f"/api/spaces/{test_space.id}/shared-viewers",
            json={"email": "viewer@example.com"},
            headers=headers,
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["email"] == "viewer@example.com"

    def test_list_shared_viewers(self, client, test_user, test_space, db_session, _mock_spaces_flag):
        sv = SpaceSharedViewer(
            id=uuid4(), space_id=test_space.id, email="sv@example.com",
            shared_by_id=test_user.id,
        )
        db_session.add(sv)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/spaces/{test_space.id}/shared-viewers", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        assert len(response.json()) >= 1


# ============================================================================
# Activity
# ============================================================================

class TestActivity:
    """GET /api/spaces/{space_id}/activity"""

    def test_get_activity(self, client, test_user, test_space, _mock_spaces_flag):
        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/spaces/{test_space.id}/activity", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "has_more" in data


# ============================================================================
# Organize (background task — just test the trigger)
# ============================================================================

class TestOrganize:
    """POST /api/spaces/{space_id}/organize"""

    @patch("app.services.sse_service.sse_service.send_to_user_sync")
    def test_organize_requires_min_ideas(self, _mock_sse_send, client, test_user, test_space, _mock_spaces_flag, _mock_sse):
        headers = get_auth_headers(test_user.id)
        response = client.post(f"/api/spaces/{test_space.id}/organize", headers=headers)
        # Should fail with < 2 ideas
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch("app.services.sse_service.sse_service.send_to_user_sync")
    def test_organize_with_enough_ideas(
        self, _mock_sse_send, client, test_user, test_space, db_session, _mock_spaces_flag, _mock_sse,
    ):
        for i in range(3):
            db_session.add(Idea(
                id=uuid4(), space_id=test_space.id, author_id=test_user.id,
                text=f"Idea {i}", status="active",
            ))
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.post(f"/api/spaces/{test_space.id}/organize", headers=headers)
        assert response.status_code == status.HTTP_202_ACCEPTED
