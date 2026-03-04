"""Tests for organization CRUD and membership routes."""
import pytest
from datetime import datetime
from uuid import uuid4
from unittest.mock import patch, AsyncMock

from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from app.models.organization import Organization, OrganizationMember
from app.models.organization_invitation import OrganizationInvitation
from app.schemas.conversation import ConversationState


class TestCreateOrganization:
    """Tests for POST /api/organizations"""

    def test_create_success(self, client, test_user):
        """Should create organization and make creator admin."""
        headers = get_auth_headers(test_user.id)
        payload = {"name": "New Org", "description": "A test org"}

        response = client.post("/api/organizations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "New Org"
        assert data["created_by"] == str(test_user.id)
        assert len(data["members"]) == 1
        assert data["members"][0]["role"] == "admin"

    def test_create_missing_name(self, client, test_user):
        """Should reject without name."""
        headers = get_auth_headers(test_user.id)
        payload = {"description": "No name"}

        response = client.post("/api/organizations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_create_unauthenticated(self, client):
        """Should reject unauthenticated request."""
        payload = {"name": "Anon Org"}

        response = client.post("/api/organizations", json=payload)

        assert response.status_code in [
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ]


class TestListOrganizations:
    """Tests for GET /api/organizations"""

    def test_list_user_orgs(self, client, test_user, test_organization):
        """Should return orgs user is member of."""
        headers = get_auth_headers(test_user.id)

        response = client.get("/api/organizations", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1
        org_ids = [o["id"] for o in data]
        assert str(test_organization.id) in org_ids

    def test_list_empty_for_non_member(self, client, second_test_user):
        """Should return empty list for user with no memberships."""
        headers = get_auth_headers(second_test_user.id)

        response = client.get("/api/organizations", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        assert response.json() == []


class TestGetOrganization:
    """Tests for GET /api/organizations/{organization_id}"""

    def test_get_as_member(self, client, test_user, test_organization):
        """Should return org details for a member."""
        headers = get_auth_headers(test_user.id)

        response = client.get(
            f"/api/organizations/{test_organization.id}", headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(test_organization.id)
        assert "members" in data

    def test_get_non_member_blocked(self, client, test_organization, second_test_user):
        """Non-member should be blocked."""
        headers = get_auth_headers(second_test_user.id)

        response = client.get(
            f"/api/organizations/{test_organization.id}", headers=headers
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_get_nonexistent(self, client, test_user):
        """Should return 404 for non-existent org."""
        headers = get_auth_headers(test_user.id)

        response = client.get(f"/api/organizations/{uuid4()}", headers=headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestUpdateOrganization:
    """Tests for PATCH /api/organizations/{organization_id}"""

    def test_update_name(self, client, test_user, test_organization):
        """Admin should update org name."""
        headers = get_auth_headers(test_user.id)
        payload = {"name": "Renamed Org"}

        response = client.patch(
            f"/api/organizations/{test_organization.id}",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["name"] == "Renamed Org"

    def test_update_non_admin_blocked(self, client, test_organization, second_test_user, db_session):
        """Regular member should not be able to update."""
        # Add second_test_user as member (not admin)
        member = OrganizationMember(
            organization_id=test_organization.id,
            user_id=second_test_user.id,
            role="member",
        )
        db_session.add(member)
        db_session.commit()

        headers = get_auth_headers(second_test_user.id)
        payload = {"name": "Hacked Name"}

        response = client.patch(
            f"/api/organizations/{test_organization.id}",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestDeleteOrganization:
    """Tests for DELETE /api/organizations/{organization_id}"""

    def test_delete_by_creator(self, client, test_user, test_organization):
        """Creator should be able to delete org."""
        headers = get_auth_headers(test_user.id)

        response = client.delete(
            f"/api/organizations/{test_organization.id}", headers=headers
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["success"] is True

    def test_delete_by_non_creator_blocked(self, client, test_organization, second_test_user, db_session):
        """Non-creator admin should not be able to delete."""
        member = OrganizationMember(
            organization_id=test_organization.id,
            user_id=second_test_user.id,
            role="admin",
        )
        db_session.add(member)
        db_session.commit()

        headers = get_auth_headers(second_test_user.id)

        response = client.delete(
            f"/api/organizations/{test_organization.id}", headers=headers
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN


class TestOrgMembers:
    """Tests for organization member management."""

    def test_add_member(self, client, test_user, test_organization, second_test_user):
        """Admin should add a member."""
        headers = get_auth_headers(test_user.id)
        payload = {"user_id": str(second_test_user.id), "role": "member"}

        response = client.post(
            f"/api/organizations/{test_organization.id}/members",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["user_id"] == str(second_test_user.id)
        assert data["role"] == "member"

    def test_add_duplicate_member_blocked(self, client, test_user, test_organization, second_test_user, db_session):
        """Should reject adding a user who is already a member."""
        member = OrganizationMember(
            organization_id=test_organization.id,
            user_id=second_test_user.id,
            role="member",
        )
        db_session.add(member)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        payload = {"user_id": str(second_test_user.id), "role": "member"}

        response = client.post(
            f"/api/organizations/{test_organization.id}/members",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "already a member" in response.json()["detail"].lower()

    def test_remove_member(self, client, test_user, test_organization, second_test_user, db_session):
        """Admin should remove a member."""
        member = OrganizationMember(
            organization_id=test_organization.id,
            user_id=second_test_user.id,
            role="member",
        )
        db_session.add(member)
        db_session.commit()

        headers = get_auth_headers(test_user.id)

        response = client.delete(
            f"/api/organizations/{test_organization.id}/members/{second_test_user.id}",
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["success"] is True

    def test_remove_creator_blocked(self, client, test_user, test_organization):
        """Should not be able to remove the creator."""
        headers = get_auth_headers(test_user.id)

        response = client.delete(
            f"/api/organizations/{test_organization.id}/members/{test_user.id}",
            headers=headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "creator" in response.json()["detail"].lower()

    def test_update_member_role(self, client, test_user, test_organization, second_test_user, db_session):
        """Admin should update member's role."""
        member = OrganizationMember(
            organization_id=test_organization.id,
            user_id=second_test_user.id,
            role="member",
        )
        db_session.add(member)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        payload = {"role": "admin"}

        response = client.patch(
            f"/api/organizations/{test_organization.id}/members/{second_test_user.id}",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.json()["role"] == "admin"

    def test_update_creator_role_blocked(self, client, test_user, test_organization):
        """Should not change creator's role."""
        headers = get_auth_headers(test_user.id)
        payload = {"role": "member"}

        response = client.patch(
            f"/api/organizations/{test_organization.id}/members/{test_user.id}",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestOrgInvitations:
    """Tests for organization invitation flow."""

    @patch("app.routes.organizations.email_service")
    @patch("app.routes.organizations.should_send_email", return_value=True)
    def test_invite_success(self, mock_pref, mock_email, client, test_user, test_organization):
        """Admin should invite new members."""
        mock_email.send_organization_invitation_email = AsyncMock()
        headers = get_auth_headers(test_user.id)
        payload = {"emails": ["newuser@example.com"], "role": "member"}

        response = client.post(
            f"/api/organizations/{test_organization.id}/invitations",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["invitations_created"] == 1

    @patch("app.routes.organizations.email_service")
    @patch("app.routes.organizations.should_send_email", return_value=True)
    def test_invite_skips_existing_member(self, mock_pref, mock_email, client, test_user, test_organization):
        """Should skip inviting someone who is already a member."""
        mock_email.send_organization_invitation_email = AsyncMock()
        headers = get_auth_headers(test_user.id)
        # test_user is already a member
        payload = {"emails": [test_user.email], "role": "member"}

        response = client.post(
            f"/api/organizations/{test_organization.id}/invitations",
            json=payload,
            headers=headers,
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["invitations_created"] == 0

    def test_list_invitations(self, client, test_user, test_organization, db_session):
        """Admin should list invitations."""
        inv = OrganizationInvitation(
            id=uuid4(),
            organization_id=test_organization.id,
            email="invited@example.com",
            invited_by_id=test_user.id,
            invitation_token="test_token_123",
            role="member",
        )
        db_session.add(inv)
        db_session.commit()

        headers = get_auth_headers(test_user.id)

        response = client.get(
            f"/api/organizations/{test_organization.id}/invitations",
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["total_invitations"] == 1
        assert data["pending_invitations"] == 1

    def test_accept_invitation(self, client, second_test_user, test_organization, test_user, db_session):
        """User should accept an invitation."""
        inv = OrganizationInvitation(
            id=uuid4(),
            organization_id=test_organization.id,
            email=second_test_user.email,
            invited_by_id=test_user.id,
            invitation_token="accept_token_123",
            role="member",
        )
        db_session.add(inv)
        db_session.commit()

        headers = get_auth_headers(second_test_user.id)

        response = client.post(
            "/api/organizations/accept-invite/accept_token_123",
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["user_id"] == str(second_test_user.id)

    def test_accept_wrong_email_blocked(self, client, third_test_user, test_organization, test_user, db_session):
        """Should reject accepting invitation sent to a different email."""
        inv = OrganizationInvitation(
            id=uuid4(),
            organization_id=test_organization.id,
            email="someone_else@example.com",
            invited_by_id=test_user.id,
            invitation_token="wrong_email_token",
            role="member",
        )
        db_session.add(inv)
        db_session.commit()

        headers = get_auth_headers(third_test_user.id)

        response = client.post(
            "/api/organizations/accept-invite/wrong_email_token",
            headers=headers,
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_accept_already_accepted(self, client, second_test_user, test_organization, test_user, db_session):
        """Should reject re-accepting an already-accepted invitation."""
        from datetime import datetime

        inv = OrganizationInvitation(
            id=uuid4(),
            organization_id=test_organization.id,
            email=second_test_user.email,
            invited_by_id=test_user.id,
            invitation_token="already_accepted_token",
            role="member",
            is_accepted=True,
            accepted_at=datetime.utcnow(),
        )
        db_session.add(inv)
        db_session.commit()

        headers = get_auth_headers(second_test_user.id)

        response = client.post(
            "/api/organizations/accept-invite/already_accepted_token",
            headers=headers,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST


class TestOrgConversations:
    """Tests for GET /api/organizations/{organization_id}/conversations"""

    def test_list_org_conversations(self, client, test_user, test_organization, test_workspace, db_session):
        """Should list conversations in the organization."""
        from app.models.conversation import Conversation

        conv = Conversation(
            id=uuid4(),
            title="Org Conv",
            creator_id=test_user.id,
            organization_id=test_organization.id,
            workspace_id=test_workspace.id,
            access_code="ORGCONVABCDE",
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
            f"/api/organizations/{test_organization.id}/conversations",
            headers=headers,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1

    def test_list_org_conversations_non_member_blocked(self, client, test_organization, second_test_user):
        """Non-member should be blocked."""
        headers = get_auth_headers(second_test_user.id)

        response = client.get(
            f"/api/organizations/{test_organization.id}/conversations",
            headers=headers,
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN
