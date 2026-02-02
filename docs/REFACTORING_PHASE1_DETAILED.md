# Phase 1 Detailed: Preparation - Tests & Utilities Extraction

**Duration:** Week 1 (5 working days)
**Goal:** Set up solid foundation for refactoring with comprehensive tests and extracted utilities
**Success Criteria:** 100% endpoint test coverage, all utilities extracted and tested

---

## Overview

Phase 1 is the most critical phase. It establishes:
1. **Safety net** through comprehensive testing
2. **Shared foundation** through utility extraction
3. **Baseline metrics** for performance comparison
4. **Documentation** of current behavior

**DO NOT SKIP THIS PHASE** - rushing into refactoring without proper tests is how bugs are introduced.

---

## Day 1-2: Test Infrastructure & Documentation

### Task 1.1: Set Up Test Infrastructure (4 hours)

#### Create Test Fixtures

**File:** `backend/tests/fixtures/conversation_fixtures.py`

```python
"""Shared fixtures for conversation testing."""
import pytest
from datetime import datetime, timedelta
from app.models.user import User
from app.models.conversation import Conversation
from app.models.question import Question
from app.schemas.conversation import AnonymityLevel, ConversationState


@pytest.fixture
def test_user(db_session):
    """Create a test user."""
    user = User(
        email="test@example.com",
        hashed_password="fake_hash",
        full_name="Test User"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def second_test_user(db_session):
    """Create a second test user for access control tests."""
    user = User(
        email="other@example.com",
        hashed_password="fake_hash",
        full_name="Other User"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def draft_conversation(db_session, test_user):
    """Create a draft conversation."""
    conversation = Conversation(
        title="Test Conversation",
        description="Test Description",
        creator_id=test_user.id,
        anonymity_level=AnonymityLevel.PLATFORM_TRACKED,
        state=ConversationState.DRAFT,
        access_code="TESTCODE123",
        timezone="UTC"
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation


@pytest.fixture
def active_conversation(db_session, test_user):
    """Create an active conversation."""
    conversation = Conversation(
        title="Active Conversation",
        description="Active Description",
        creator_id=test_user.id,
        anonymity_level=AnonymityLevel.FULLY_ANONYMOUS,
        state=ConversationState.ACTIVE,
        access_code="ACTIVE12345",
        activated_at=datetime.utcnow(),
        timezone="UTC"
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation


@pytest.fixture
def closed_conversation(db_session, test_user):
    """Create a closed conversation."""
    conversation = Conversation(
        title="Closed Conversation",
        description="Closed Description",
        creator_id=test_user.id,
        anonymity_level=AnonymityLevel.REVEALABLE,
        state=ConversationState.CLOSED,
        access_code="CLOSED67890",
        activated_at=datetime.utcnow() - timedelta(days=7),
        closed_at=datetime.utcnow() - timedelta(days=1),
        timezone="UTC"
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation


@pytest.fixture
def conversation_with_questions(db_session, draft_conversation):
    """Create a conversation with multiple question types."""
    questions = [
        Question(
            conversation_id=draft_conversation.id,
            question_type="text",
            question_text="What went well?",
            order=1
        ),
        Question(
            conversation_id=draft_conversation.id,
            question_type="rating",
            question_text="Rate the sprint",
            order=2,
            options={"min": 1, "max": 5}
        ),
        Question(
            conversation_id=draft_conversation.id,
            question_type="single_choice",
            question_text="Choose one",
            order=3,
            options={"choices": ["Option A", "Option B", "Option C"]}
        )
    ]
    db_session.add_all(questions)
    db_session.commit()
    return draft_conversation


@pytest.fixture
def invite_only_conversation(db_session, test_user):
    """Create an invite-only conversation."""
    conversation = Conversation(
        title="Invite Only",
        description="Need invitation",
        creator_id=test_user.id,
        anonymity_level=AnonymityLevel.PLATFORM_TRACKED,
        state=ConversationState.DRAFT,
        access_code="INVITE12345",
        invite_only=True,
        timezone="UTC"
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation
```

#### Create API Test Helpers

**File:** `backend/tests/helpers/api_helpers.py`

```python
"""Helper functions for API testing."""
from typing import Dict, Optional
from fastapi.testclient import TestClient
from app.core.security import create_access_token


def get_auth_headers(user_id: str) -> Dict[str, str]:
    """Generate authentication headers for a user."""
    token = create_access_token(data={"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}


def create_test_conversation_payload(
    title: str = "Test Conversation",
    anonymity_level: str = "platform_tracked",
    invite_only: bool = False,
    questions: Optional[list] = None
) -> dict:
    """Create a conversation payload for testing."""
    if questions is None:
        questions = [
            {
                "question_type": "text",
                "question_text": "What's on your mind?",
                "order": 1
            }
        ]

    return {
        "title": title,
        "description": "Test description",
        "anonymity_level": anonymity_level,
        "invite_only": invite_only,
        "questions": questions,
        "timezone": "UTC"
    }
```

### Task 1.2: Document Current Endpoint Behavior (4 hours)

Create a behavior specification for each endpoint.

**File:** `backend/tests/conversations/ENDPOINT_BEHAVIORS.md`

```markdown
# Conversation Endpoints - Expected Behavior

## POST /conversations
**Purpose:** Create a new conversation

**Valid States:**
- User must be authenticated
- If organization_id provided, user must be member
- Access code must be unique (auto-retry if collision)
- Questions array must have at least 1 question
- Scheduled times converted from conversation timezone to UTC

**Returns:** 201 Created with ConversationWithQuestions
**Errors:**
- 401 if not authenticated
- 403 if not organization member
- 422 if validation fails

**Test Cases:**
- ✅ Create basic conversation with text question
- ✅ Create with multiple question types
- ✅ Create with scheduled activation
- ✅ Create with auto-close
- ✅ Create invite-only conversation
- ✅ Create with organization_id
- ❌ Create without authentication
- ❌ Create with invalid organization_id
- ❌ Create with no questions
- ❌ Create with duplicate access code (should retry)

## GET /conversations
**Purpose:** List user's conversations

**Valid States:**
- User must be authenticated
- Can filter by state, organization_id
- Supports pagination (skip/limit)
- Excludes deleted conversations
- Shows conversations where user is creator OR organization member

**Returns:** 200 OK with List[ConversationListItem]

**Test Cases:**
- ✅ List with no filters
- ✅ List with state filter
- ✅ List with organization filter
- ✅ Pagination works correctly
- ✅ Excludes other users' conversations
- ✅ Includes organization conversations
- ❌ Without authentication

[Continue for all 21 endpoints...]
```

---

## Day 2-3: Write Comprehensive Tests

### Task 2.1: CRUD Endpoint Tests (8 hours)

**File:** `backend/tests/conversations/test_crud.py`

```python
"""Tests for conversation CRUD operations."""
import pytest
from fastapi import status
from tests.helpers.api_helpers import get_auth_headers, create_test_conversation_payload


class TestCreateConversation:
    """Tests for POST /conversations"""

    def test_create_basic_conversation(self, client, test_user):
        """Should create conversation with default settings."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload()

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["title"] == "Test Conversation"
        assert data["state"] == "draft"
        assert data["anonymity_level"] == "platform_tracked"
        assert len(data["access_code"]) == 12
        assert len(data["questions"]) == 1

    def test_create_with_multiple_questions(self, client, test_user):
        """Should create conversation with multiple question types."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(
            questions=[
                {"question_type": "text", "question_text": "Text Q", "order": 1},
                {"question_type": "rating", "question_text": "Rating Q", "order": 2,
                 "options": {"min": 1, "max": 5}},
                {"question_type": "single_choice", "question_text": "Choice Q", "order": 3,
                 "options": {"choices": ["A", "B", "C"]}}
            ]
        )

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert len(data["questions"]) == 3
        assert data["questions"][0]["question_type"] == "text"
        assert data["questions"][1]["question_type"] == "rating"
        assert data["questions"][2]["question_type"] == "single_choice"

    def test_create_with_scheduled_activation(self, client, test_user):
        """Should schedule activation for future time."""
        from datetime import datetime, timedelta
        headers = get_auth_headers(test_user.id)

        future_time = (datetime.utcnow() + timedelta(hours=24)).isoformat()
        payload = create_test_conversation_payload()
        payload["scheduled_activate_at"] = future_time

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["scheduled_activate_at"] is not None
        assert data["state"] == "draft"  # Should remain draft until scheduled time

    def test_create_fully_anonymous(self, client, test_user):
        """Should create fully anonymous conversation."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(anonymity_level="fully_anonymous")

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["anonymity_level"] == "fully_anonymous"

    def test_create_invite_only(self, client, test_user):
        """Should create invite-only conversation."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(invite_only=True)

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["invite_only"] is True

    def test_create_without_auth_fails(self, client):
        """Should reject unauthenticated request."""
        payload = create_test_conversation_payload()

        response = client.post("/api/conversations", json=payload)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_create_without_questions_fails(self, client, test_user):
        """Should reject conversation with no questions."""
        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload(questions=[])

        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_access_code_uniqueness(self, client, test_user, db_session, mocker):
        """Should retry if access code collision occurs."""
        headers = get_auth_headers(test_user.id)

        # Mock generate_access_code to return duplicate first, then unique
        mock_gen = mocker.patch('app.routes.conversations.generate_access_code')
        mock_gen.side_effect = ["EXISTING123", "UNIQUE12345"]

        # Create conversation with "EXISTING123" code
        from app.models.conversation import Conversation
        existing = Conversation(
            title="Existing",
            creator_id=test_user.id,
            access_code="EXISTING123",
            timezone="UTC"
        )
        db_session.add(existing)
        db_session.commit()

        payload = create_test_conversation_payload()
        response = client.post("/api/conversations", json=payload, headers=headers)

        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["access_code"] == "UNIQUE12345"
        assert mock_gen.call_count == 2  # Called twice due to collision


class TestListConversations:
    """Tests for GET /conversations"""

    def test_list_user_conversations(self, client, test_user, draft_conversation, active_conversation):
        """Should return user's conversations."""
        headers = get_auth_headers(test_user.id)

        response = client.get("/api/conversations", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 2
        assert all(c["creator_id"] == str(test_user.id) for c in data)

    def test_list_excludes_deleted(self, client, test_user, db_session):
        """Should not return deleted conversations."""
        from app.models.conversation import Conversation
        from app.schemas.conversation import ConversationState

        deleted = Conversation(
            title="Deleted",
            creator_id=test_user.id,
            access_code="DELETED123",
            state=ConversationState.DELETED,
            timezone="UTC"
        )
        db_session.add(deleted)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get("/api/conversations", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert all(c["state"] != "deleted" for c in data)

    def test_list_with_state_filter(self, client, test_user, draft_conversation, active_conversation):
        """Should filter by state."""
        headers = get_auth_headers(test_user.id)

        response = client.get("/api/conversations?state=draft", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert all(c["state"] == "draft" for c in data)

    def test_list_pagination(self, client, test_user, db_session):
        """Should support pagination."""
        from app.models.conversation import Conversation

        # Create 25 conversations
        for i in range(25):
            conv = Conversation(
                title=f"Conv {i}",
                creator_id=test_user.id,
                access_code=f"CODE{i:05d}",
                timezone="UTC"
            )
            db_session.add(conv)
        db_session.commit()

        headers = get_auth_headers(test_user.id)

        # Get first page
        response = client.get("/api/conversations?limit=10", headers=headers)
        assert len(response.json()) == 10

        # Get second page
        response = client.get("/api/conversations?skip=10&limit=10", headers=headers)
        assert len(response.json()) == 10

        # Get third page
        response = client.get("/api/conversations?skip=20&limit=10", headers=headers)
        assert len(response.json()) == 5

    def test_list_excludes_other_users(self, client, test_user, second_test_user, db_session):
        """Should not return other users' conversations."""
        from app.models.conversation import Conversation

        other_conv = Conversation(
            title="Other User Conv",
            creator_id=second_test_user.id,
            access_code="OTHER12345",
            timezone="UTC"
        )
        db_session.add(other_conv)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get("/api/conversations", headers=headers)

        data = response.json()
        assert all(c["creator_id"] == str(test_user.id) for c in data)


class TestGetConversation:
    """Tests for GET /conversations/{id}"""

    def test_get_own_conversation(self, client, test_user, conversation_with_questions):
        """Should return conversation with questions."""
        headers = get_auth_headers(test_user.id)
        conv_id = conversation_with_questions.id

        response = client.get(f"/api/conversations/{conv_id}", headers=headers)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == str(conv_id)
        assert len(data["questions"]) == 3

    def test_get_other_users_conversation_fails(self, client, test_user, second_test_user, db_session):
        """Should return 404 for other users' conversations."""
        from app.models.conversation import Conversation

        other_conv = Conversation(
            title="Other",
            creator_id=second_test_user.id,
            access_code="OTHER12345",
            timezone="UTC"
        )
        db_session.add(other_conv)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/conversations/{other_conv.id}", headers=headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_deleted_conversation_fails(self, client, test_user, db_session):
        """Should return 404 for deleted conversations."""
        from app.models.conversation import Conversation
        from app.schemas.conversation import ConversationState

        deleted = Conversation(
            title="Deleted",
            creator_id=test_user.id,
            access_code="DELETED123",
            state=ConversationState.DELETED,
            timezone="UTC"
        )
        db_session.add(deleted)
        db_session.commit()

        headers = get_auth_headers(test_user.id)
        response = client.get(f"/api/conversations/{deleted.id}", headers=headers)

        assert response.status_code == status.HTTP_404_NOT_FOUND


# Continue for UPDATE, DELETE, DUPLICATE...
```

**Continue similarly for:**
- `test_lifecycle.py` - Activate, close, extend
- `test_access_control.py` - Codes, invitations
- `test_relationships.py` - Follow-ups, lineage
- `test_continuous_mode.py` - Enable/disable continuous

---

## Day 3-4: Extract Utilities

### Task 3.1: Create utils.py (6 hours)

**File:** `backend/app/routes/conversations/utils.py`

```python
"""Shared utilities for conversation routes."""
import logging
import secrets
import string
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.conversation import Conversation
from app.models.conversation_invitation import ConversationInvitation
from app.schemas.conversation import ConversationState
from app.services.email_service import email_service
from app.services.organization_service import check_organization_membership

logger = logging.getLogger(__name__)


# ============================================================================
# Access Code Generation
# ============================================================================

def generate_access_code(length: int = 12) -> str:
    """
    Generate a secure random access code.

    Excludes visually similar characters (O/0, I/1) to reduce user error.

    Args:
        length: Length of code to generate (default: 12)

    Returns:
        Random access code string

    Example:
        >>> code = generate_access_code()
        >>> len(code)
        12
        >>> 'O' not in code and '0' not in code
        True
    """
    alphabet = string.ascii_uppercase + string.digits
    # Exclude similar looking characters
    alphabet = alphabet.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_unique_access_code(db: Session, length: int = 12, max_retries: int = 10) -> str:
    """
    Generate a unique access code, retrying on collisions.

    Args:
        db: Database session
        length: Length of code to generate
        max_retries: Maximum number of retry attempts

    Returns:
        Unique access code

    Raises:
        RuntimeError: If unable to generate unique code after max_retries

    Example:
        >>> code = generate_unique_access_code(db)
        >>> existing = db.query(Conversation).filter_by(access_code=code).first()
        >>> existing is None
        True
    """
    for attempt in range(max_retries):
        code = generate_access_code(length)
        existing = db.query(Conversation).filter(
            Conversation.access_code == code
        ).first()

        if not existing:
            return code

        logger.warning(f"Access code collision on attempt {attempt + 1}: {code}")

    raise RuntimeError(f"Failed to generate unique access code after {max_retries} attempts")


# ============================================================================
# Conversation Retrieval & Validation
# ============================================================================

def get_conversation_or_404(
    conversation_id: UUID,
    db: Session,
    current_user: User
) -> Conversation:
    """
    Get conversation by ID or raise 404.

    Only returns conversation if:
    - User is the creator
    - Conversation is not deleted

    Args:
        conversation_id: Conversation UUID
        db: Database session
        current_user: Current authenticated user

    Returns:
        Conversation object

    Raises:
        HTTPException: 404 if conversation not found or not accessible
    """
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.creator_id == current_user.id,
        Conversation.state != ConversationState.DELETED
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    return conversation


def get_conversation_by_code_or_404(
    access_code: str,
    db: Session
) -> Conversation:
    """
    Get conversation by access code or raise 404.

    Args:
        access_code: Conversation access code
        db: Database session

    Returns:
        Conversation object

    Raises:
        HTTPException: 404 if conversation not found
    """
    conversation = db.query(Conversation).filter(
        Conversation.access_code == access_code
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found. Please check the access code and try again."
        )

    return conversation


# ============================================================================
# Organization Validation
# ============================================================================

def validate_organization_access(
    db: Session,
    organization_id: UUID,
    user_id: UUID,
    action: str = "access this resource"
) -> None:
    """
    Validate user has access to organization.

    Args:
        db: Database session
        organization_id: Organization UUID
        user_id: User UUID
        action: Description of action for error message

    Raises:
        HTTPException: 403 if user is not organization member
    """
    membership = check_organization_membership(db, organization_id, user_id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You must be a member of this organization to {action}"
        )


# ============================================================================
# Conversation State Validation
# ============================================================================

def validate_conversation_state(
    conversation: Conversation,
    required_state: ConversationState,
    error_message: Optional[str] = None
) -> None:
    """
    Validate conversation is in required state.

    Args:
        conversation: Conversation object
        required_state: Required state
        error_message: Custom error message (optional)

    Raises:
        HTTPException: 400 if conversation not in required state
    """
    if conversation.state != required_state:
        if error_message is None:
            error_message = f"Conversation must be in {required_state.value} state"

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )


def validate_conversation_not_state(
    conversation: Conversation,
    forbidden_state: ConversationState,
    error_message: Optional[str] = None
) -> None:
    """
    Validate conversation is NOT in forbidden state.

    Args:
        conversation: Conversation object
        forbidden_state: Forbidden state
        error_message: Custom error message (optional)

    Raises:
        HTTPException: 400 if conversation is in forbidden state
    """
    if conversation.state == forbidden_state:
        if error_message is None:
            error_message = f"Cannot perform this action on {forbidden_state.value} conversation"

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )


# ============================================================================
# Email Utilities
# ============================================================================

async def send_pending_invitation_emails(
    conversation: Conversation,
    db: Session,
    inviter_user: Optional[User] = None
) -> None:
    """
    Send invitation emails to all pending invitations for a conversation.

    Args:
        conversation: The conversation to send invitations for
        db: Database session
        inviter_user: Optional user who invited (for inviter name in email)
    """
    if not conversation.invite_only:
        return

    # Get all pending invitations for this conversation
    pending_invitations = db.query(ConversationInvitation).filter(
        ConversationInvitation.conversation_id == conversation.id
    ).all()

    if not pending_invitations:
        return

    # Get inviter name
    inviter_name = None
    if inviter_user:
        inviter_name = inviter_user.full_name or inviter_user.email
    elif pending_invitations and pending_invitations[0].invited_by_id:
        inviter = db.query(User).filter(
            User.id == pending_invitations[0].invited_by_id
        ).first()
        if inviter:
            inviter_name = inviter.full_name or inviter.email

    # Send invitation emails asynchronously
    # Don't block if email sending fails
    for invitation in pending_invitations:
        try:
            await email_service.send_invitation_email(
                to_email=invitation.email,
                conversation_title=conversation.title,
                conversation_description=conversation.description,
                access_code=conversation.access_code,
                invitation_token=invitation.invitation_token,
                inviter_name=inviter_name,
            )
        except Exception as e:
            # Log error but don't fail the request
            # Email sending failures shouldn't prevent activation
            logger.error(
                f"Failed to send invitation email to {invitation.email}: {str(e)}",
                exc_info=True
            )


def get_inviter_name(db: Session, user: Optional[User], invitation: Optional[ConversationInvitation] = None) -> Optional[str]:
    """
    Get inviter name from user or invitation.

    Args:
        db: Database session
        user: Current user (if available)
        invitation: Invitation object (if available)

    Returns:
        Inviter name or None
    """
    if user:
        return user.full_name or user.email

    if invitation and invitation.invited_by_id:
        inviter = db.query(User).filter(User.id == invitation.invited_by_id).first()
        if inviter:
            return inviter.full_name or inviter.email

    return None


# ============================================================================
# Query Helpers
# ============================================================================

def get_unique_participant_count(conversation_id: UUID, db: Session) -> int:
    """
    Get count of unique participants who responded.

    Args:
        conversation_id: Conversation UUID
        db: Database session

    Returns:
        Count of unique participants
    """
    from app.models.response import Response

    count = db.query(
        func.count(func.distinct(Response.participant_code_used))
    ).filter(
        Response.conversation_id == conversation_id
    ).scalar()

    return count or 0


def get_total_response_count(conversation_id: UUID, db: Session) -> int:
    """
    Get total number of responses submitted.

    Args:
        conversation_id: Conversation UUID
        db: Database session

    Returns:
        Total response count
    """
    from app.models.response import Response

    count = db.query(func.count(Response.id)).filter(
        Response.conversation_id == conversation_id
    ).scalar()

    return count or 0
```

### Task 3.2: Write Unit Tests for Utilities (2 hours)

**File:** `backend/tests/conversations/test_utils.py`

```python
"""Tests for conversation utility functions."""
import pytest
from uuid import uuid4
from app.routes.conversations.utils import (
    generate_access_code,
    generate_unique_access_code,
    get_conversation_or_404,
    validate_conversation_state,
    get_unique_participant_count,
)
from app.models.conversation import Conversation
from app.schemas.conversation import ConversationState
from fastapi import HTTPException


class TestAccessCodeGeneration:
    """Tests for access code generation."""

    def test_generate_access_code_length(self):
        """Should generate code of correct length."""
        code = generate_access_code(length=12)
        assert len(code) == 12

    def test_generate_access_code_excludes_confusing_chars(self):
        """Should exclude O, 0, I, 1."""
        # Generate many codes to ensure pattern
        for _ in range(100):
            code = generate_access_code()
            assert 'O' not in code
            assert '0' not in code
            assert 'I' not in code
            assert '1' not in code

    def test_generate_unique_access_code(self, db_session, test_user):
        """Should generate unique code."""
        # Create conversation with existing code
        existing = Conversation(
            title="Existing",
            creator_id=test_user.id,
            access_code="EXISTING123",
            timezone="UTC"
        )
        db_session.add(existing)
        db_session.commit()

        # Generate new unique code
        new_code = generate_unique_access_code(db_session)

        assert new_code != "EXISTING123"
        assert len(new_code) == 12

    def test_generate_unique_access_code_retries_on_collision(self, db_session, test_user, mocker):
        """Should retry if collision occurs."""
        mock_gen = mocker.patch('app.routes.conversations.utils.generate_access_code')
        mock_gen.side_effect = ["COLLISION1", "COLLISION1", "UNIQUE1234"]

        # Create conversation with COLLISION1
        existing = Conversation(
            title="Existing",
            creator_id=test_user.id,
            access_code="COLLISION1",
            timezone="UTC"
        )
        db_session.add(existing)
        db_session.commit()

        code = generate_unique_access_code(db_session)

        assert code == "UNIQUE1234"
        assert mock_gen.call_count == 3


class TestConversationRetrieval:
    """Tests for conversation retrieval functions."""

    def test_get_conversation_or_404_success(self, db_session, test_user, draft_conversation):
        """Should return conversation for owner."""
        conv = get_conversation_or_404(draft_conversation.id, db_session, test_user)
        assert conv.id == draft_conversation.id

    def test_get_conversation_or_404_other_user_fails(self, db_session, test_user, second_test_user, draft_conversation):
        """Should raise 404 for non-owner."""
        with pytest.raises(HTTPException) as exc_info:
            get_conversation_or_404(draft_conversation.id, db_session, second_test_user)

        assert exc_info.value.status_code == 404

    def test_get_conversation_or_404_deleted_fails(self, db_session, test_user):
        """Should raise 404 for deleted conversation."""
        deleted = Conversation(
            title="Deleted",
            creator_id=test_user.id,
            access_code="DELETED123",
            state=ConversationState.DELETED,
            timezone="UTC"
        )
        db_session.add(deleted)
        db_session.commit()

        with pytest.raises(HTTPException) as exc_info:
            get_conversation_or_404(deleted.id, db_session, test_user)

        assert exc_info.value.status_code == 404


class TestStateValidation:
    """Tests for state validation functions."""

    def test_validate_conversation_state_success(self, draft_conversation):
        """Should pass if in correct state."""
        # Should not raise
        validate_conversation_state(draft_conversation, ConversationState.DRAFT)

    def test_validate_conversation_state_fails(self, draft_conversation):
        """Should raise if in wrong state."""
        with pytest.raises(HTTPException) as exc_info:
            validate_conversation_state(draft_conversation, ConversationState.ACTIVE)

        assert exc_info.value.status_code == 400
        assert "must be in active state" in exc_info.value.detail.lower()


# Continue for other utilities...
```

---

## Day 4-5: Performance Baseline & Final Validation

### Task 4.1: Establish Performance Baseline (4 hours)

**File:** `backend/tests/performance/test_conversation_performance.py`

```python
"""Performance benchmarks for conversation endpoints."""
import pytest
import time
from statistics import mean, median


class TestConversationPerformance:
    """Performance benchmarks to ensure no regression."""

    def test_create_conversation_performance(self, client, test_user, benchmark):
        """Benchmark conversation creation."""
        from tests.helpers.api_helpers import get_auth_headers, create_test_conversation_payload

        headers = get_auth_headers(test_user.id)
        payload = create_test_conversation_payload()

        def create():
            response = client.post("/api/conversations", json=payload, headers=headers)
            assert response.status_code == 201

        result = benchmark(create)

        # Should complete in under 200ms
        assert result.stats.median < 0.2

    def test_list_conversations_with_100_items_performance(self, client, test_user, db_session, benchmark):
        """Benchmark listing with moderate dataset."""
        from app.models.conversation import Conversation

        # Create 100 conversations
        for i in range(100):
            conv = Conversation(
                title=f"Conv {i}",
                creator_id=test_user.id,
                access_code=f"CODE{i:05d}",
                timezone="UTC"
            )
            db_session.add(conv)
        db_session.commit()

        from tests.helpers.api_helpers import get_auth_headers
        headers = get_auth_headers(test_user.id)

        def list_all():
            response = client.get("/api/conversations?limit=100", headers=headers)
            assert response.status_code == 200
            assert len(response.json()) == 100

        result = benchmark(list_all)

        # Should complete in under 500ms even with 100 items
        assert result.stats.median < 0.5


@pytest.fixture
def benchmark(request):
    """Simple benchmark fixture."""
    times = []

    def run(func, iterations=10):
        for _ in range(iterations):
            start = time.time()
            func()
            end = time.time()
            times.append(end - start)

        class Stats:
            median = median(times)
            mean = mean(times)
            min = min(times)
            max = max(times)

        class Result:
            stats = Stats()

        return Result()

    return run
```

### Task 4.2: Final Validation Checklist

Create a checklist to verify Phase 1 completion:

**File:** `backend/tests/conversations/PHASE1_VALIDATION.md`

```markdown
# Phase 1 Validation Checklist

## Test Coverage
- [ ] All 21 endpoints have integration tests
- [ ] All utility functions have unit tests
- [ ] Edge cases documented and tested
- [ ] Error conditions tested (401, 403, 404, 422)
- [ ] Pagination tested
- [ ] State transitions tested
- [ ] Organization access tested

## Utilities Extracted
- [ ] `generate_access_code()` extracted and tested
- [ ] `generate_unique_access_code()` extracted and tested
- [ ] `get_conversation_or_404()` extracted and tested
- [ ] `get_conversation_by_code_or_404()` extracted and tested
- [ ] `validate_organization_access()` extracted and tested
- [ ] `validate_conversation_state()` extracted and tested
- [ ] `validate_conversation_not_state()` extracted and tested
- [ ] `send_pending_invitation_emails()` extracted and tested
- [ ] `get_inviter_name()` extracted and tested
- [ ] `get_unique_participant_count()` extracted and tested
- [ ] `get_total_response_count()` extracted and tested

## Performance Baselines
- [ ] Create conversation: < 200ms median
- [ ] List 100 conversations: < 500ms median
- [ ] Get conversation by ID: < 100ms median
- [ ] Activate conversation: < 300ms median
- [ ] Generate codes: < 150ms median

## Documentation
- [ ] All endpoints behavior documented
- [ ] Edge cases documented
- [ ] Test fixtures documented
- [ ] Performance baselines recorded

## Final Validation
- [ ] All tests pass
- [ ] Test coverage > 90% for conversations.py
- [ ] No regressions in manual testing
- [ ] Code review completed
- [ ] Ready to proceed to Phase 2
```

---

## Success Criteria

Before moving to Phase 2, ensure:

1. ✅ **Test Coverage**: 100% of endpoints have passing tests
2. ✅ **Utilities Extracted**: All shared code in `utils.py`
3. ✅ **Performance Baseline**: Median times recorded for all operations
4. ✅ **Documentation**: All behaviors documented
5. ✅ **Team Sign-Off**: Code review completed and approved

---

## Common Pitfalls to Avoid

### ❌ Don't Skip Tests
"I'll add tests after refactoring" - No! Tests are your safety net.

### ❌ Don't Extract Too Much
Only extract truly shared utilities. Don't create utilities that are only used once.

### ❌ Don't Ignore Performance
If tests run slowly now, they'll be slower after refactoring. Optimize first.

### ❌ Don't Rush
This phase is the foundation. A solid week here saves weeks of debugging later.

---

## Next Steps

Once Phase 1 validation checklist is 100% complete:
- Review with team
- Get code review approval
- Proceed to Phase 2: Extract Simple Modules

**Do not proceed to Phase 2 until this checklist is complete.**
