"""
End-to-end tests for question images.

These tests verify:
1. Creating questions with images
2. Updating questions with images
3. Image URLs are returned in question responses
4. Duplicating conversations preserves question images

Note: These tests require a running server at http://localhost:8000
"""

import pytest
from typing import Dict, Any

from tests.conftest import APIClient, ConversationHelper


pytestmark = [pytest.mark.e2e]


class TestQuestionImageCreation:
    """Tests for creating questions with images."""

    def test_create_question_with_image(self, authenticated_client: APIClient):
        """Test creating a question with an image URL."""
        response = authenticated_client.post("/api/conversations", json={
            "title": "Question with Image Test",
            "description": "Testing question images",
            "anonymity_level": "fully_anonymous",
            "results_access": "creator_only",
            "questions": [
                {
                    "question_text": "What do you think of this product?",
                    "question_type": "text",
                    "question_order": 0,
                    "is_required": True,
                    "question_image_url": "/api/uploads/test-product-image.jpg"
                }
            ]
        })

        assert response.status_code == 201
        data = response.json()
        questions = data.get("questions", [])
        assert len(questions) == 1
        assert questions[0]["question_image_url"] == "/api/uploads/test-product-image.jpg"

    def test_create_question_without_image(self, authenticated_client: APIClient):
        """Test creating a question without an image (should have null image URL)."""
        response = authenticated_client.post("/api/conversations", json={
            "title": "Question without Image Test",
            "description": "Testing question without images",
            "anonymity_level": "fully_anonymous",
            "results_access": "creator_only",
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
        questions = data.get("questions", [])
        assert len(questions) == 1
        assert questions[0].get("question_image_url") is None

    def test_create_multiple_questions_with_mixed_images(
        self, authenticated_client: APIClient
    ):
        """Test creating multiple questions, some with images and some without."""
        response = authenticated_client.post("/api/conversations", json={
            "title": "Mixed Questions Test",
            "description": "Testing mixed question images",
            "anonymity_level": "fully_anonymous",
            "results_access": "creator_only",
            "questions": [
                {
                    "question_text": "Look at this image and describe what you see",
                    "question_type": "text",
                    "question_order": 0,
                    "is_required": True,
                    "question_image_url": "/api/uploads/image1.png"
                },
                {
                    "question_text": "Rate our service",
                    "question_type": "rating",
                    "question_order": 1,
                    "options": {"min": 1, "max": 10},
                    "is_required": True
                },
                {
                    "question_text": "Which product do you prefer?",
                    "question_type": "single_choice",
                    "question_order": 2,
                    "options": {"choices": ["Product A", "Product B"]},
                    "is_required": False,
                    "question_image_url": "/api/uploads/comparison.jpg"
                }
            ]
        })

        assert response.status_code == 201
        data = response.json()
        questions = data.get("questions", [])
        assert len(questions) == 3

        # Sort by question_order
        questions_sorted = sorted(questions, key=lambda q: q["question_order"])

        assert questions_sorted[0]["question_image_url"] == "/api/uploads/image1.png"
        assert questions_sorted[1].get("question_image_url") is None
        assert questions_sorted[2]["question_image_url"] == "/api/uploads/comparison.jpg"


class TestQuestionImageUpdate:
    """Tests for updating question images."""

    def test_add_image_to_existing_question(
        self, conversation_helper: ConversationHelper,
        authenticated_client: APIClient
    ):
        """Test adding an image to an existing question via conversation update."""
        # Create conversation without image
        conv_data = conversation_helper.create_conversation(
            title="Add Image Test",
            questions=[
                {
                    "question_text": "Original question without image",
                    "question_type": "text",
                    "question_order": 0,
                    "is_required": True
                }
            ]
        )

        # Update conversation with image using PATCH
        response = authenticated_client.patch(
            f"/api/conversations/{conversation_helper.conversation_id}",
            json={
                "questions": [
                    {
                        "question_text": "Question now with image",
                        "question_type": "text",
                        "question_order": 0,
                        "is_required": True,
                        "question_image_url": "/api/uploads/new-image.jpg"
                    }
                ]
            }
        )

        assert response.status_code == 200
        data = response.json()
        questions = data.get("questions", [])
        assert len(questions) == 1
        assert questions[0]["question_image_url"] == "/api/uploads/new-image.jpg"


class TestQuestionImageRetrieval:
    """Tests for retrieving questions with images."""

    def test_get_conversation_returns_question_images(
        self, authenticated_client: APIClient
    ):
        """Test that getting a conversation returns question image URLs."""
        # Create conversation with image
        create_response = authenticated_client.post("/api/conversations", json={
            "title": "Retrieval Test",
            "description": "Testing image retrieval",
            "anonymity_level": "fully_anonymous",
            "results_access": "creator_only",
            "questions": [
                {
                    "question_text": "Question with image",
                    "question_type": "text",
                    "question_order": 0,
                    "is_required": True,
                    "question_image_url": "/api/uploads/test-image.png"
                }
            ]
        })

        assert create_response.status_code == 201
        conv_id = create_response.json()["id"]

        # Get conversation
        get_response = authenticated_client.get(f"/api/conversations/{conv_id}")
        assert get_response.status_code == 200

        data = get_response.json()
        questions = data.get("questions", [])
        assert len(questions) == 1
        assert questions[0]["question_image_url"] == "/api/uploads/test-image.png"


class TestQuestionImageDuplication:
    """Tests for duplicating conversations with question images."""

    def test_duplicate_preserves_question_images(
        self, authenticated_client: APIClient
    ):
        """Test that duplicating a conversation preserves question images."""
        # Create original conversation with images
        create_response = authenticated_client.post("/api/conversations", json={
            "title": "Original with Images",
            "description": "Has question images",
            "anonymity_level": "fully_anonymous",
            "results_access": "creator_only",
            "questions": [
                {
                    "question_text": "Question 1 with image",
                    "question_type": "text",
                    "question_order": 0,
                    "is_required": True,
                    "question_image_url": "/api/uploads/q1-image.jpg"
                },
                {
                    "question_text": "Question 2 no image",
                    "question_type": "rating",
                    "question_order": 1,
                    "options": {"min": 1, "max": 5},
                    "is_required": False
                }
            ]
        })

        assert create_response.status_code == 201
        original_id = create_response.json()["id"]

        # Duplicate conversation
        duplicate_response = authenticated_client.post(
            f"/api/conversations/{original_id}/duplicate"
        )

        assert duplicate_response.status_code == 201
        duplicate_data = duplicate_response.json()

        # Verify questions are duplicated with images
        questions = duplicate_data.get("questions", [])
        assert len(questions) == 2

        questions_sorted = sorted(questions, key=lambda q: q["question_order"])
        assert questions_sorted[0]["question_image_url"] == "/api/uploads/q1-image.jpg"
        assert questions_sorted[1].get("question_image_url") is None


class TestQuestionImageValidation:
    """Tests for question image URL validation."""

    def test_long_image_url_rejected(self, authenticated_client: APIClient):
        """Test that overly long image URLs are rejected."""
        long_url = "/api/uploads/" + "a" * 600  # Over 500 char limit

        response = authenticated_client.post("/api/conversations", json={
            "title": "Long URL Test",
            "description": "Testing URL length validation",
            "anonymity_level": "fully_anonymous",
            "results_access": "creator_only",
            "questions": [
                {
                    "question_text": "Question with long URL",
                    "question_type": "text",
                    "question_order": 0,
                    "is_required": True,
                    "question_image_url": long_url
                }
            ]
        })

        # Should be rejected by validation
        assert response.status_code == 422
