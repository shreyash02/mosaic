"""Contract tests for workspace endpoints.

Validates that backend responses match the shapes expected by
the frontend TypeScript types in frontend/src/types/index.ts.
"""
import pytest
from fastapi import status

from tests.helpers.api_helpers import get_auth_headers
from tests.contract.shapes import assert_shape, assert_list_of, WORKSPACE_SHAPE


class TestListWorkspacesContract:
    """GET /api/workspaces/me → Workspace[] shape"""

    def test_list_returns_workspace_shapes(self, client, test_user, test_workspace):
        headers = get_auth_headers(test_user.id)
        response = client.get("/api/workspaces/me", headers=headers)
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        for ws in data:
            assert_shape(ws, WORKSPACE_SHAPE, "workspace in list")

    def test_default_workspace_exists(self, client, test_user, test_workspace):
        headers = get_auth_headers(test_user.id)
        data = client.get("/api/workspaces/me", headers=headers).json()
        default = next((ws for ws in data if ws["is_default"]), None)
        assert default is not None
        assert default["type"] == "personal"
