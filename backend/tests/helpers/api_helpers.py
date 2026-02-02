"""Helper functions for API testing."""
from typing import Dict, Optional, List
from datetime import datetime
from uuid import UUID

from app.core.security import create_access_token


def get_auth_headers(user_id: UUID) -> Dict[str, str]:
    """
    Generate authentication headers for a user.

    Args:
        user_id: User UUID

    Returns:
        Dictionary with Authorization header

    Example:
        >>> headers = get_auth_headers(user.id)
        >>> response = client.get("/api/conversations", headers=headers)
    """
    token = create_access_token(data={"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def create_test_conversation_payload(
    title: str = "Test Conversation",
    description: str = "Test description",
    anonymity_level: str = "platform_tracked",
    invite_only: bool = False,
    questions: Optional[List[Dict]] = None,
    timezone: str = "UTC",
    scheduled_activate_at: Optional[datetime] = None,
    auto_close_at: Optional[datetime] = None,
    organization_id: Optional[str] = None
) -> Dict:
    """
    Create a conversation payload for testing.

    Args:
        title: Conversation title
        description: Conversation description
        anonymity_level: One of: fully_anonymous, platform_tracked, revealable
        invite_only: Whether conversation requires invitation
        questions: List of question dicts (defaults to single text question)
        timezone: Conversation timezone
        scheduled_activate_at: Optional scheduled activation time
        auto_close_at: Optional auto-close time
        organization_id: Optional organization ID

    Returns:
        Dictionary payload for conversation creation

    Example:
        >>> payload = create_test_conversation_payload(
        ...     title="Sprint Retro",
        ...     anonymity_level="fully_anonymous",
        ...     questions=[
        ...         {"question_type": "text", "question_text": "What went well?", "order": 1}
        ...     ]
        ... )
    """
    if questions is None:
        questions = [
            {
                "question_type": "text",
                "question_text": "What's on your mind?",
                "order": 1,
                "is_required": True
            }
        ]

    payload = {
        "title": title,
        "description": description,
        "anonymity_level": anonymity_level,
        "invite_only": invite_only,
        "questions": questions,
        "timezone": timezone
    }

    if scheduled_activate_at:
        payload["scheduled_activate_at"] = scheduled_activate_at.isoformat()

    if auto_close_at:
        payload["auto_close_at"] = auto_close_at.isoformat()

    if organization_id:
        payload["organization_id"] = str(organization_id)

    return payload


def create_test_question(
    question_type: str = "text",
    question_text: str = "Test question?",
    order: int = 1,
    is_required: bool = True,
    options: Optional[Dict] = None
) -> Dict:
    """
    Create a question dictionary for testing.

    Args:
        question_type: Type of question (text, rating, single_choice, multiple_choice)
        question_text: Question text
        order: Question order
        is_required: Whether question is required
        options: Question-specific options

    Returns:
        Question dictionary

    Example:
        >>> rating_q = create_test_question(
        ...     question_type="rating",
        ...     question_text="Rate the sprint",
        ...     options={"min": 1, "max": 5}
        ... )
    """
    question = {
        "question_type": question_type,
        "question_text": question_text,
        "order": order,
        "is_required": is_required
    }

    if options:
        question["options"] = options
    elif question_type == "rating":
        question["options"] = {"min": 1, "max": 5}
    elif question_type in ["single_choice", "multiple_choice"]:
        question["options"] = {"choices": ["Option A", "Option B", "Option C"]}

    return question


def create_multiple_question_payload(num_text: int = 2, num_rating: int = 1, num_choice: int = 1) -> List[Dict]:
    """
    Create a list of diverse questions for testing.

    Args:
        num_text: Number of text questions
        num_rating: Number of rating questions
        num_choice: Number of choice questions

    Returns:
        List of question dictionaries
    """
    questions = []
    order = 1

    for i in range(num_text):
        questions.append(create_test_question(
            question_type="text",
            question_text=f"Text question {i+1}",
            order=order
        ))
        order += 1

    for i in range(num_rating):
        questions.append(create_test_question(
            question_type="rating",
            question_text=f"Rating question {i+1}",
            order=order,
            options={"min": 1, "max": 5}
        ))
        order += 1

    for i in range(num_choice):
        questions.append(create_test_question(
            question_type="single_choice",
            question_text=f"Choice question {i+1}",
            order=order,
            options={"choices": ["Yes", "No", "Maybe"]}
        ))
        order += 1

    return questions


def assert_conversation_response(response_data: Dict, expected_title: str = None, expected_state: str = None):
    """
    Assert common conversation response fields.

    Args:
        response_data: Response data from API
        expected_title: Expected conversation title (optional)
        expected_state: Expected conversation state (optional)

    Raises:
        AssertionError: If required fields are missing or don't match
    """
    assert "id" in response_data, "Missing 'id' field"
    assert "title" in response_data, "Missing 'title' field"
    assert "state" in response_data, "Missing 'state' field"
    assert "anonymity_level" in response_data, "Missing 'anonymity_level' field"
    assert "access_code" in response_data, "Missing 'access_code' field"
    assert "creator_id" in response_data, "Missing 'creator_id' field"

    if expected_title:
        assert response_data["title"] == expected_title, f"Expected title '{expected_title}', got '{response_data['title']}'"

    if expected_state:
        assert response_data["state"] == expected_state, f"Expected state '{expected_state}', got '{response_data['state']}'"


def assert_error_response(response_data: Dict, expected_status: int = None, expected_detail_contains: str = None):
    """
    Assert error response structure.

    Args:
        response_data: Response data from API
        expected_status: Expected HTTP status code (optional)
        expected_detail_contains: Substring expected in error detail (optional)
    """
    assert "detail" in response_data, "Missing 'detail' field in error response"

    if expected_detail_contains:
        detail = response_data["detail"].lower()
        assert expected_detail_contains.lower() in detail, \
            f"Expected detail to contain '{expected_detail_contains}', got '{response_data['detail']}'"
