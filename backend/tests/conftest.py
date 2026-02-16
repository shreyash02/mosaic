"""
Pytest configuration and fixtures for e2e tests.

This module provides reusable fixtures for testing the Mosaic backend API.
"""

import os
import uuid
import pytest
import httpx
from datetime import datetime, timedelta, timezone
from typing import Generator, Dict, Any, Optional

# Import integration test fixtures
from tests.fixtures.conversation_fixtures import *  # noqa: F401, F403

# Base URL for the running server (e2e tests require server to be running)
BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:8000")


class APIClient:
    """HTTP client wrapper for API testing."""

    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.user_id: Optional[str] = None

    def _get_headers(self) -> Dict[str, str]:
        """Get headers including auth token if available."""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def get(self, path: str, **kwargs) -> httpx.Response:
        """Make a GET request."""
        with httpx.Client() as client:
            return client.get(
                f"{self.base_url}{path}",
                headers=self._get_headers(),
                **kwargs
            )

    def post(self, path: str, json: Dict = None, **kwargs) -> httpx.Response:
        """Make a POST request."""
        with httpx.Client() as client:
            return client.post(
                f"{self.base_url}{path}",
                headers=self._get_headers(),
                json=json,
                **kwargs
            )

    def put(self, path: str, json: Dict = None, **kwargs) -> httpx.Response:
        """Make a PUT request."""
        with httpx.Client() as client:
            return client.put(
                f"{self.base_url}{path}",
                headers=self._get_headers(),
                json=json,
                **kwargs
            )

    def patch(self, path: str, json: Dict = None, **kwargs) -> httpx.Response:
        """Make a PATCH request."""
        with httpx.Client() as client:
            return client.patch(
                f"{self.base_url}{path}",
                headers=self._get_headers(),
                json=json,
                **kwargs
            )

    def delete(self, path: str, **kwargs) -> httpx.Response:
        """Make a DELETE request."""
        with httpx.Client() as client:
            return client.delete(
                f"{self.base_url}{path}",
                headers=self._get_headers(),
                **kwargs
            )

    def register(self, email: str, password: str, full_name: str) -> bool:
        """Register a new user."""
        response = self.post("/api/auth/register", json={
            "email": email,
            "password": password,
            "full_name": full_name
        })
        if response.status_code == 201:
            self.user_id = response.json().get("id")
            return True
        elif response.status_code == 400 and "already registered" in response.text:
            return True  # User exists, will login
        return False

    def login(self, email: str, password: str) -> bool:
        """Login and store the access token."""
        response = self.post("/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            return True
        return False


@pytest.fixture
def api_client() -> APIClient:
    """Provide a fresh API client for each test."""
    return APIClient()


@pytest.fixture
def verified_authenticated_client() -> Generator[APIClient, None, None]:
    """Provide an authenticated API client with a verified email.

    Some operations (e.g. activating conversations) require email_verified=True.
    This fixture registers a user and directly updates the DB to verify their email.
    """
    client = APIClient()

    unique_id = uuid.uuid4().hex[:8]
    email = f"test_analysis_{unique_id}@example.com"
    password = "testpassword123"
    full_name = f"Analysis Tester {unique_id}"

    assert client.register(email, password, full_name), "Failed to register test user"
    assert client.login(email, password), "Failed to login test user"

    # Directly verify email in DB (no verification email in test env)
    try:
        from app.core.config import settings
        from sqlalchemy import create_engine, text as sa_text

        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            conn.execute(
                sa_text("UPDATE users SET email_verified = true WHERE email = :email"),
                {"email": email}
            )
            conn.commit()
        engine.dispose()
    except Exception as e:
        pytest.skip(f"Could not verify email via DB: {e}")

    yield client


@pytest.fixture
def authenticated_client() -> Generator[APIClient, None, None]:
    """Provide an authenticated API client with a unique test user."""
    client = APIClient()

    # Generate unique test user credentials
    unique_id = uuid.uuid4().hex[:8]
    email = f"test_user_{unique_id}@example.com"
    password = "testpassword123"
    full_name = f"Test User {unique_id}"

    # Register and login
    assert client.register(email, password, full_name), "Failed to register test user"
    assert client.login(email, password), "Failed to login test user"

    yield client


@pytest.fixture
def test_credentials() -> Dict[str, str]:
    """Generate unique test user credentials."""
    unique_id = uuid.uuid4().hex[:8]
    return {
        "email": f"test_user_{unique_id}@example.com",
        "password": "testpassword123",
        "full_name": f"Test User {unique_id}"
    }


class ConversationHelper:
    """Helper class for conversation-related test operations."""

    def __init__(self, client: APIClient):
        self.client = client
        self.conversation_id: Optional[str] = None
        self.access_code: Optional[str] = None
        self.questions: list = []

    def create_conversation(
        self,
        title: str = "Test Conversation",
        description: str = "Test description",
        is_continuous: bool = False,
        analysis_interval: Optional[str] = None,
        anonymity_level: str = "fully_anonymous",
        questions: Optional[list] = None
    ) -> Dict[str, Any]:
        """Create a conversation and store its details."""
        if questions is None:
            questions = [
                {
                    "question_text": "How was your experience?",
                    "question_type": "text",
                    "question_order": 0,
                    "is_required": True
                },
                {
                    "question_text": "Rate our service (1-10)",
                    "question_type": "rating",
                    "question_order": 1,
                    "options": {"min": 1, "max": 10},
                    "is_required": True
                },
                {
                    "question_text": "Any suggestions for improvement?",
                    "question_type": "text",
                    "question_order": 2,
                    "is_required": False
                }
            ]

        payload = {
            "title": title,
            "description": description,
            "anonymity_level": anonymity_level,
            "results_access": "creator_only",
            "is_continuous": is_continuous,
            "questions": questions
        }

        if analysis_interval:
            payload["analysis_interval"] = analysis_interval

        response = self.client.post("/api/conversations", json=payload)
        assert response.status_code == 201, f"Failed to create conversation: {response.text}"

        data = response.json()
        self.conversation_id = data["id"]
        self.access_code = data["access_code"]
        self.questions = data.get("questions", [])
        return data

    def activate(self) -> Dict[str, Any]:
        """Activate the conversation."""
        response = self.client.post(
            f"/api/conversations/{self.conversation_id}/activate",
            json={}
        )
        assert response.status_code == 200, f"Failed to activate: {response.text}"
        return response.json()

    def get_conversation(self) -> Dict[str, Any]:
        """Get conversation details."""
        response = self.client.get(f"/api/conversations/{self.conversation_id}")
        assert response.status_code == 200, f"Failed to get conversation: {response.text}"
        return response.json()

    def generate_participant_codes(self, count: int) -> list:
        """Generate participant codes for anonymous responses."""
        response = self.client.post(
            f"/api/conversations/{self.conversation_id}/participant-codes",
            json={"count": count}
        )
        assert response.status_code == 201, f"Failed to generate codes: {response.text}"
        return response.json().get("codes", [])

    def submit_response(
        self,
        responses_data: Dict[str, Any],
        participant_code: Optional[str] = None
    ) -> bool:
        """Submit a response to the conversation."""
        # Build responses array
        responses_array = []
        for question in self.questions:
            q_id = question["id"]
            q_type = question["question_type"]
            q_order = question["question_order"]

            if q_type == "text":
                key = f"q{q_order}"
                text = responses_data.get(key, f"Default response for question {q_order}")
                responses_array.append({
                    "question_id": q_id,
                    "response_text": text
                })
            elif q_type == "rating":
                rating = responses_data.get("rating", 7)
                responses_array.append({
                    "question_id": q_id,
                    "response_data": {"rating": rating}
                })

        payload = {"responses": responses_array, "reveal_consent": False}

        # Use participant code URL if provided
        url = f"/api/conversations/{participant_code or self.access_code}/responses"

        # Submit without auth headers for anonymous
        with httpx.Client() as client:
            response = client.post(
                f"{self.client.base_url}{url}",
                json=payload,
                headers={"Content-Type": "application/json"}
            )

        return response.status_code == 201

    def submit_multiple_responses(self, responses_list: list) -> int:
        """Submit multiple responses using participant codes."""
        codes = self.generate_participant_codes(len(responses_list))
        success_count = 0
        for i, resp_data in enumerate(responses_list):
            if self.submit_response(resp_data, codes[i] if i < len(codes) else None):
                success_count += 1
        return success_count


@pytest.fixture
def conversation_helper(authenticated_client: APIClient) -> ConversationHelper:
    """Provide a conversation helper for tests."""
    return ConversationHelper(authenticated_client)


class PeriodicAnalysisHelper:
    """Helper class for periodic analysis testing."""

    def __init__(self, client: APIClient, conversation_id: str):
        self.client = client
        self.conversation_id = conversation_id

    def trigger_analysis(
        self,
        period_start: Optional[datetime] = None,
        period_end: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Trigger a periodic analysis."""
        payload = {}
        if period_start:
            # Convert to naive UTC datetime for API
            if period_start.tzinfo is not None:
                period_start = period_start.replace(tzinfo=None)
            payload["period_start"] = period_start.isoformat() + "Z"
        if period_end:
            # Convert to naive UTC datetime for API
            if period_end.tzinfo is not None:
                period_end = period_end.replace(tzinfo=None)
            payload["period_end"] = period_end.isoformat() + "Z"

        response = self.client.post(
            f"/api/conversations/{self.conversation_id}/periodic-analyses/trigger",
            json=payload
        )
        return {"status_code": response.status_code, "data": response.json()}

    def list_analyses(self) -> Dict[str, Any]:
        """List all periodic analyses."""
        response = self.client.get(
            f"/api/conversations/{self.conversation_id}/periodic-analyses"
        )
        return {"status_code": response.status_code, "data": response.json()}

    def get_analysis(self, period_label: str) -> Dict[str, Any]:
        """Get a specific periodic analysis."""
        response = self.client.get(
            f"/api/conversations/{self.conversation_id}/periodic-analyses/{period_label}"
        )
        return {"status_code": response.status_code, "data": response.json()}

    def recompute_trends(self) -> Dict[str, Any]:
        """Recompute trends from all analyses."""
        response = self.client.post(
            f"/api/conversations/{self.conversation_id}/trends/recompute"
        )
        return {"status_code": response.status_code, "data": response.json()}

    def get_trends(self) -> Dict[str, Any]:
        """Get continuous trends."""
        response = self.client.get(
            f"/api/conversations/{self.conversation_id}/trends"
        )
        return {"status_code": response.status_code, "data": response.json()}


@pytest.fixture
def periodic_analysis_helper(
    authenticated_client: APIClient,
    conversation_helper: ConversationHelper
) -> Generator[PeriodicAnalysisHelper, None, None]:
    """Provide a periodic analysis helper with a continuous conversation."""
    # Create continuous conversation
    conversation_helper.create_conversation(
        title="Continuous Test Conversation",
        is_continuous=True,
        analysis_interval="daily"
    )
    conversation_helper.activate()

    yield PeriodicAnalysisHelper(authenticated_client, conversation_helper.conversation_id)


def wait_for_analysis(timeout_seconds: int = 60, poll_interval: int = 5):
    """Decorator to wait for analysis completion."""
    import time
    import functools

    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            while time.time() - start_time < timeout_seconds:
                result = func(*args, **kwargs)
                if result:
                    return result
                time.sleep(poll_interval)
            return None
        return wrapper
    return decorator
