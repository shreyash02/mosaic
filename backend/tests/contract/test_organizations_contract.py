"""Contract tests for organization endpoints.

Validates that backend responses match the shapes expected by
the frontend TypeScript types in frontend/src/types/index.ts.
"""
import pytest
from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from tests.contract.shapes import (
    assert_shape,
    assert_list_of,
    ORGANIZATION_SHAPE,
    ORGANIZATION_WITH_MEMBERS_SHAPE,
    ORGANIZATION_MEMBER_SHAPE,
)


class TestCreateOrganizationContract:
    """POST /api/organizations → OrganizationWithMembers shape"""

    def test_create_returns_org_with_members_shape(self, client, test_user, test_workspace):
        headers = get_auth_headers(test_user.id)
        payload = {"name": "Contract Org", "description": "For contract tests"}
        response = client.post("/api/organizations", json=payload, headers=headers)
        assert response.status_code == status.HTTP_201_CREATED
        assert_shape(response.json(), ORGANIZATION_WITH_MEMBERS_SHAPE, "created org")

    def test_creator_is_admin_member(self, client, test_user, test_workspace):
        headers = get_auth_headers(test_user.id)
        payload = {"name": "Admin Check Org"}
        data = client.post("/api/organizations", json=payload, headers=headers).json()
        assert len(data["members"]) >= 1
        creator_member = next(
            (m for m in data["members"] if m["user_id"] == str(test_user.id)), None
        )
        assert creator_member is not None
        assert creator_member["role"] == "admin"


class TestListOrganizationsContract:
    """GET /api/organizations → Organization[] shape"""

    def test_list_returns_org_shapes(self, client, test_user, test_organization):
        headers = get_auth_headers(test_user.id)
        response = client.get("/api/organizations", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        for org in data:
            assert_shape(org, ORGANIZATION_SHAPE, "org in list")


class TestGetOrganizationContract:
    """GET /api/organizations/{id} → OrganizationWithMembers shape"""

    def test_get_returns_org_with_members(self, client, test_user, test_organization):
        headers = get_auth_headers(test_user.id)
        response = client.get(
            f"/api/organizations/{test_organization.id}", headers=headers
        )
        assert response.status_code == status.HTTP_200_OK
        assert_shape(response.json(), ORGANIZATION_WITH_MEMBERS_SHAPE, "get org")

    def test_org_members_have_correct_shape(self, client, test_user, test_organization):
        headers = get_auth_headers(test_user.id)
        data = client.get(
            f"/api/organizations/{test_organization.id}", headers=headers
        ).json()
        assert isinstance(data["members"], list)
        for member in data["members"]:
            assert_shape(member, ORGANIZATION_MEMBER_SHAPE, "org member")


class TestUpdateOrganizationContract:
    """PATCH /api/organizations/{id} → Organization shape"""

    def test_update_returns_org_shape(self, client, test_user, test_organization):
        headers = get_auth_headers(test_user.id)
        payload = {"name": "Updated Org Name"}
        response = client.patch(
            f"/api/organizations/{test_organization.id}",
            json=payload,
            headers=headers,
        )
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert_shape(data, ORGANIZATION_SHAPE, "updated org")
        assert data["name"] == "Updated Org Name"
