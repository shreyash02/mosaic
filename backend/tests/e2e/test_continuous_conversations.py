"""
End-to-end tests for continuous conversations with periodic analysis.

These tests verify the complete workflow of:
1. Creating a continuous conversation
2. Submitting responses over time
3. Triggering periodic analyses
4. Computing and retrieving trends

Note: These tests require a running server at http://localhost:8000
Run with: pytest tests/e2e/test_continuous_conversations.py -v --tb=short
"""

import time
import pytest
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List

from tests.e2e.conftest import (
    APIClient,
    ConversationHelper,
    PeriodicAnalysisHelper,
)


# Mark all tests in this module as e2e tests
pytestmark = [pytest.mark.e2e]


class TestContinuousConversationCreation:
    """Tests for creating and configuring continuous conversations."""

    def test_create_continuous_conversation(self, authenticated_client: APIClient):
        """Test creating a conversation with is_continuous=true."""
        response = authenticated_client.post("/api/conversations", json={
            "title": "Continuous Feedback Collection",
            "description": "Ongoing feedback for our service",
            "anonymity_level": "fully_anonymous",
            "results_access": "creator_only",
            "is_continuous": True,
            "analysis_interval": "daily",
            "questions": [
                {
                    "question_text": "How was your experience?",
                    "question_type": "text",
                    "question_order": 0,
                    "is_required": True
                }
            ]
        })

        assert response.status_code == 201
        data = response.json()
        assert data["is_continuous"] is True
        assert data["analysis_interval"] == "daily"
        assert data["state"] == "draft"

    def test_create_conversation_with_different_intervals(
        self, authenticated_client: APIClient
    ):
        """Test creating continuous conversations with various analysis intervals."""
        intervals = ["daily", "weekly", "biweekly", "monthly"]

        for interval in intervals:
            response = authenticated_client.post("/api/conversations", json={
                "title": f"Test {interval} conversation",
                "description": "Testing interval configuration",
                "anonymity_level": "fully_anonymous",
                "results_access": "creator_only",
                "is_continuous": True,
                "analysis_interval": interval,
                "questions": [
                    {
                        "question_text": "Test question",
                        "question_type": "text",
                        "question_order": 0,
                        "is_required": True
                    }
                ]
            })

            assert response.status_code == 201, f"Failed for interval: {interval}"
            data = response.json()
            assert data["analysis_interval"] == interval

    def test_activate_continuous_conversation_sets_next_analysis(
        self, conversation_helper: ConversationHelper
    ):
        """Test that activating a continuous conversation sets next_analysis_at."""
        # Create continuous conversation
        conversation_helper.create_conversation(
            title="Test Next Analysis",
            is_continuous=True,
            analysis_interval="daily"
        )

        # Activate
        result = conversation_helper.activate()

        assert result["state"] == "active"
        assert result["next_analysis_at"] is not None
        assert result["is_continuous"] is True


class TestResponseSubmission:
    """Tests for submitting responses to continuous conversations."""

    def test_submit_responses_to_continuous_conversation(
        self, conversation_helper: ConversationHelper
    ):
        """Test submitting multiple responses to a continuous conversation."""
        # Create and activate continuous conversation
        conversation_helper.create_conversation(
            title="Response Test Conversation",
            is_continuous=True,
            analysis_interval="daily"
        )
        conversation_helper.activate()

        # Submit responses
        responses = [
            {"q0": "Great experience!", "q2": "Nothing to improve", "rating": 9},
            {"q0": "Good service overall", "q2": "Faster delivery", "rating": 7},
            {"q0": "Excellent quality", "q2": "More variety", "rating": 8},
        ]

        success_count = conversation_helper.submit_multiple_responses(responses)
        assert success_count == len(responses), "Not all responses were submitted"

    def test_continuous_conversation_stays_active_after_responses(
        self, conversation_helper: ConversationHelper
    ):
        """Test that continuous conversation remains active after receiving responses."""
        conversation_helper.create_conversation(
            title="Stay Active Test",
            is_continuous=True,
            analysis_interval="daily"
        )
        conversation_helper.activate()

        # Submit responses
        responses = [
            {"q0": "Test response 1", "rating": 8},
            {"q0": "Test response 2", "rating": 7},
        ]
        conversation_helper.submit_multiple_responses(responses)

        # Verify still active
        conv = conversation_helper.get_conversation()
        assert conv["state"] == "active"
        assert conv["is_continuous"] is True


class TestPeriodicAnalysis:
    """Tests for periodic analysis functionality."""

    @pytest.mark.slow
    def test_trigger_periodic_analysis_manually(
        self, conversation_helper: ConversationHelper,
        authenticated_client: APIClient
    ):
        """Test manually triggering a periodic analysis."""
        # Create continuous conversation with responses
        conversation_helper.create_conversation(
            title="Periodic Analysis Test",
            is_continuous=True,
            analysis_interval="daily"
        )
        conversation_helper.activate()

        # Submit test responses
        responses = [
            {"q0": "The coffee was excellent!", "q2": "More seating", "rating": 9},
            {"q0": "Great atmosphere", "q2": "Better wifi", "rating": 8},
            {"q0": "Friendly staff", "q2": "Faster service", "rating": 7},
            {"q0": "Good food quality", "q2": "More variety", "rating": 8},
            {"q0": "Nice ambiance", "q2": "Lower prices", "rating": 6},
        ]
        conversation_helper.submit_multiple_responses(responses)

        # Trigger analysis
        helper = PeriodicAnalysisHelper(
            authenticated_client,
            conversation_helper.conversation_id
        )

        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        today_end = datetime.now(timezone.utc) + timedelta(hours=1)

        result = helper.trigger_analysis(
            period_start=yesterday,
            period_end=today_end
        )

        assert result["status_code"] == 200
        assert "triggered" in result["data"].get("message", "").lower()

    @pytest.mark.slow
    def test_list_periodic_analyses(
        self, conversation_helper: ConversationHelper,
        authenticated_client: APIClient
    ):
        """Test listing periodic analyses after triggering one."""
        # Create conversation and submit responses
        conversation_helper.create_conversation(
            title="List Analyses Test",
            is_continuous=True,
            analysis_interval="daily"
        )
        conversation_helper.activate()

        responses = [
            {"q0": "Good experience", "rating": 8},
            {"q0": "Nice service", "rating": 7},
            {"q0": "Would recommend", "rating": 9},
        ]
        conversation_helper.submit_multiple_responses(responses)

        # Trigger analysis
        helper = PeriodicAnalysisHelper(
            authenticated_client,
            conversation_helper.conversation_id
        )

        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        today = datetime.now(timezone.utc) + timedelta(hours=1)
        helper.trigger_analysis(period_start=yesterday, period_end=today)

        # Wait for analysis to complete - LLM calls take time
        time.sleep(45)

        # List analyses
        result = helper.list_analyses()

        assert result["status_code"] == 200
        assert result["data"]["total_periods"] >= 1

    def test_periodic_analysis_requires_continuous_conversation(
        self, conversation_helper: ConversationHelper,
        authenticated_client: APIClient
    ):
        """Test that periodic analysis endpoints reject non-continuous conversations."""
        # Create regular (non-continuous) conversation
        conversation_helper.create_conversation(
            title="Regular Conversation",
            is_continuous=False
        )
        conversation_helper.activate()

        # Try to list periodic analyses
        response = authenticated_client.get(
            f"/api/conversations/{conversation_helper.conversation_id}/periodic-analyses"
        )

        assert response.status_code == 400
        assert "continuous" in response.json().get("detail", "").lower()


class TestTrends:
    """Tests for trends computation across periodic analyses."""

    def test_trends_require_minimum_analyses(
        self, conversation_helper: ConversationHelper,
        authenticated_client: APIClient
    ):
        """Test that trends computation requires at least 2 periodic analyses."""
        # Create continuous conversation
        conversation_helper.create_conversation(
            title="Trends Test",
            is_continuous=True,
            analysis_interval="daily"
        )
        conversation_helper.activate()

        # Try to get trends without any analyses
        response = authenticated_client.get(
            f"/api/conversations/{conversation_helper.conversation_id}/trends"
        )

        assert response.status_code == 404
        assert "at least 2" in response.json().get("detail", "").lower()

    @pytest.mark.slow
    def test_full_trends_workflow(
        self, conversation_helper: ConversationHelper,
        authenticated_client: APIClient
    ):
        """Test complete workflow: create, responses, analyses, trends."""
        # Create continuous conversation
        conversation_helper.create_conversation(
            title="Full Workflow Test",
            is_continuous=True,
            analysis_interval="daily"
        )
        conversation_helper.activate()

        helper = PeriodicAnalysisHelper(
            authenticated_client,
            conversation_helper.conversation_id
        )

        # First batch of responses
        batch1 = [
            {"q0": "Coffee was great!", "q2": "More seating", "rating": 9},
            {"q0": "Loved the pastries", "q2": "Wifi issues", "rating": 8},
            {"q0": "Friendly staff", "q2": "Faster service", "rating": 7},
            {"q0": "Good atmosphere", "q2": "More variety", "rating": 8},
            {"q0": "Clean environment", "q2": "Lower prices", "rating": 7},
        ]
        conversation_helper.submit_multiple_responses(batch1)

        # First periodic analysis (yesterday's period)
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        today_end = datetime.now(timezone.utc) + timedelta(hours=1)
        result1 = helper.trigger_analysis(period_start=yesterday, period_end=today_end)
        assert result1["status_code"] == 200

        # Wait for first analysis - LLM calls take time
        time.sleep(45)

        # Second batch of responses
        batch2 = [
            {"q0": "Service improved!", "q2": "Keep it up", "rating": 9},
            {"q0": "New menu is great", "q2": "More options", "rating": 8},
            {"q0": "Still wifi problems", "q2": "Fix the wifi", "rating": 5},
            {"q0": "Better experience", "q2": "Nothing", "rating": 9},
            {"q0": "Consistent quality", "q2": "Add loyalty program", "rating": 8},
        ]
        conversation_helper.submit_multiple_responses(batch2)

        # Second periodic analysis (today's period)
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)
        tomorrow = datetime.now(timezone.utc) + timedelta(days=1)
        result2 = helper.trigger_analysis(period_start=today_start, period_end=tomorrow)
        assert result2["status_code"] == 200

        # Wait for second analysis - LLM calls take time
        time.sleep(45)

        # Verify we have 2 analyses
        analyses_result = helper.list_analyses()
        assert analyses_result["status_code"] == 200
        assert analyses_result["data"]["total_periods"] == 2

        # Recompute trends
        trends_result = helper.recompute_trends()
        assert trends_result["status_code"] == 200
        assert trends_result["data"]["periods_analyzed"] == 2

        # Get trends
        get_trends_result = helper.get_trends()
        assert get_trends_result["status_code"] == 200


class TestEnableDisableContinuous:
    """Tests for enabling/disabling continuous mode on existing conversations."""

    def test_enable_continuous_mode(
        self, conversation_helper: ConversationHelper,
        authenticated_client: APIClient
    ):
        """Test enabling continuous mode on an existing conversation."""
        # Create regular conversation
        conversation_helper.create_conversation(
            title="Enable Continuous Test",
            is_continuous=False
        )
        conversation_helper.activate()

        # Enable continuous mode
        response = authenticated_client.post(
            f"/api/conversations/{conversation_helper.conversation_id}/enable-continuous",
            json={"analysis_interval": "weekly"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_continuous"] is True
        assert data["analysis_interval"] == "weekly"
        assert data["next_analysis_at"] is not None

    def test_disable_continuous_mode(
        self, conversation_helper: ConversationHelper,
        authenticated_client: APIClient
    ):
        """Test disabling continuous mode."""
        # Create continuous conversation
        conversation_helper.create_conversation(
            title="Disable Continuous Test",
            is_continuous=True,
            analysis_interval="daily"
        )
        conversation_helper.activate()

        # Disable continuous mode
        response = authenticated_client.post(
            f"/api/conversations/{conversation_helper.conversation_id}/disable-continuous"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_continuous"] is False
        assert data["next_analysis_at"] is None


class TestEdgeCases:
    """Edge case and error handling tests."""

    def test_trigger_analysis_with_invalid_period(
        self, conversation_helper: ConversationHelper,
        authenticated_client: APIClient
    ):
        """Test triggering analysis with period_start > period_end."""
        conversation_helper.create_conversation(
            title="Invalid Period Test",
            is_continuous=True,
            analysis_interval="daily"
        )
        conversation_helper.activate()

        helper = PeriodicAnalysisHelper(
            authenticated_client,
            conversation_helper.conversation_id
        )

        # Try with invalid period (start after end)
        future = datetime.now(timezone.utc) + timedelta(days=1)
        past = datetime.now(timezone.utc) - timedelta(days=1)

        result = helper.trigger_analysis(period_start=future, period_end=past)
        assert result["status_code"] == 400
        assert "before" in result["data"].get("detail", "").lower()

    @pytest.mark.slow
    def test_duplicate_period_analysis(
        self, conversation_helper: ConversationHelper,
        authenticated_client: APIClient
    ):
        """Test that duplicate period analyses are rejected."""
        conversation_helper.create_conversation(
            title="Duplicate Analysis Test",
            is_continuous=True,
            analysis_interval="daily"
        )
        conversation_helper.activate()

        # Submit some responses
        responses = [{"q0": "Test", "rating": 7}]
        conversation_helper.submit_multiple_responses(responses)

        helper = PeriodicAnalysisHelper(
            authenticated_client,
            conversation_helper.conversation_id
        )

        # Trigger first analysis
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        today = datetime.now(timezone.utc) + timedelta(hours=1)
        result1 = helper.trigger_analysis(period_start=yesterday, period_end=today)
        assert result1["status_code"] == 200

        # Wait for completion - need enough time for LLM analysis
        time.sleep(30)

        # Try to trigger same period again - should be rejected
        result2 = helper.trigger_analysis(period_start=yesterday, period_end=today)
        assert result2["status_code"] == 400
        assert "already exists" in result2["data"].get("detail", "").lower()

    def test_get_nonexistent_period_analysis(
        self, conversation_helper: ConversationHelper,
        authenticated_client: APIClient
    ):
        """Test getting a period analysis that doesn't exist."""
        conversation_helper.create_conversation(
            title="Nonexistent Analysis Test",
            is_continuous=True,
            analysis_interval="daily"
        )
        conversation_helper.activate()

        helper = PeriodicAnalysisHelper(
            authenticated_client,
            conversation_helper.conversation_id
        )

        result = helper.get_analysis("2099-01-01")
        assert result["status_code"] == 404
