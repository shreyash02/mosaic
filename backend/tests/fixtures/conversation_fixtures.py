"""Shared fixtures for conversation testing."""
import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.conversation import Conversation
from app.models.question import Question
from app.models.participant_code import ParticipantCode
from app.models.conversation_invitation import ConversationInvitation
from app.models.organization import Organization, OrganizationMember
from app.schemas.conversation import AnonymityLevel, ConversationState
from app.core.security import get_password_hash


# ============================================================================
# Database Setup
# ============================================================================

@pytest.fixture(scope="function")
def db_engine():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a fresh database session for each test."""
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create a test client with database override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ============================================================================
# User Fixtures
# ============================================================================

@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user."""
    user = User(
        id=uuid4(),
        email="test@example.com",
        hashed_password=get_password_hash("testpassword123"),
        full_name="Test User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def second_test_user(db_session: Session) -> User:
    """Create a second test user for access control tests."""
    user = User(
        id=uuid4(),
        email="other@example.com",
        hashed_password=get_password_hash("otherpassword123"),
        full_name="Other User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def third_test_user(db_session: Session) -> User:
    """Create a third test user for organization tests."""
    user = User(
        id=uuid4(),
        email="third@example.com",
        hashed_password=get_password_hash("thirdpassword123"),
        full_name="Third User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# ============================================================================
# Organization Fixtures
# ============================================================================

@pytest.fixture
def test_organization(db_session: Session, test_user: User) -> Organization:
    """Create a test organization."""
    org = Organization(
        id=uuid4(),
        name="Test Organization",
        created_by_id=test_user.id
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)

    # Add creator as admin member
    member = OrganizationMember(
        organization_id=org.id,
        user_id=test_user.id,
        role="admin"
    )
    db_session.add(member)
    db_session.commit()

    return org


# ============================================================================
# Conversation Fixtures
# ============================================================================

@pytest.fixture
def draft_conversation(db_session: Session, test_user: User, test_workspace) -> Conversation:
    """Create a draft conversation."""
    conversation = Conversation(
        id=uuid4(),
        title="Test Conversation",
        description="Test Description",
        creator_id=test_user.id,
        workspace_id=test_workspace.id,
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
def active_conversation(db_session: Session, test_user: User, test_workspace) -> Conversation:
    """Create an active conversation."""
    conversation = Conversation(
        id=uuid4(),
        title="Active Conversation",
        description="Active Description",
        creator_id=test_user.id,
        workspace_id=test_workspace.id,
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
def closed_conversation(db_session: Session, test_user: User, test_workspace) -> Conversation:
    """Create a closed conversation."""
    conversation = Conversation(
        id=uuid4(),
        title="Closed Conversation",
        description="Closed Description",
        creator_id=test_user.id,
        workspace_id=test_workspace.id,
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
def conversation_with_questions(db_session: Session, draft_conversation: Conversation) -> Conversation:
    """Create a conversation with multiple question types."""
    questions = [
        Question(
            id=uuid4(),
            conversation_id=draft_conversation.id,
            question_type="text",
            question_text="What went well?",
            order=1,
            is_required=True
        ),
        Question(
            id=uuid4(),
            conversation_id=draft_conversation.id,
            question_type="rating",
            question_text="Rate the sprint",
            order=2,
            options={"min": 1, "max": 5},
            is_required=True
        ),
        Question(
            id=uuid4(),
            conversation_id=draft_conversation.id,
            question_type="single_choice",
            question_text="Choose one",
            order=3,
            options={"choices": ["Option A", "Option B", "Option C"]},
            is_required=False
        )
    ]
    db_session.add_all(questions)
    db_session.commit()

    # Refresh to load questions relationship
    db_session.refresh(draft_conversation)
    return draft_conversation


@pytest.fixture
def invite_only_conversation(db_session: Session, test_user: User, test_workspace) -> Conversation:
    """Create an invite-only conversation."""
    conversation = Conversation(
        id=uuid4(),
        title="Invite Only",
        description="Need invitation",
        creator_id=test_user.id,
        workspace_id=test_workspace.id,
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


@pytest.fixture
def scheduled_conversation(db_session: Session, test_user: User, test_workspace) -> Conversation:
    """Create a conversation scheduled for future activation."""
    future_time = datetime.utcnow() + timedelta(hours=24)
    conversation = Conversation(
        id=uuid4(),
        title="Scheduled Conversation",
        description="Will activate tomorrow",
        creator_id=test_user.id,
        workspace_id=test_workspace.id,
        anonymity_level=AnonymityLevel.PLATFORM_TRACKED,
        state=ConversationState.DRAFT,
        access_code="SCHED123456",
        scheduled_activate_at=future_time,
        timezone="UTC"
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation


@pytest.fixture
def conversation_with_auto_close(db_session: Session, active_conversation: Conversation) -> Conversation:
    """Create an active conversation with auto-close scheduled."""
    active_conversation.auto_close_at = datetime.utcnow() + timedelta(days=7)
    db_session.commit()
    db_session.refresh(active_conversation)
    return active_conversation


# ============================================================================
# Participant Code Fixtures
# ============================================================================

@pytest.fixture
def participant_codes(db_session: Session, active_conversation: Conversation) -> list[ParticipantCode]:
    """Create participant codes for a conversation."""
    codes = []
    for i in range(5):
        code = ParticipantCode(
            id=uuid4(),
            conversation_id=active_conversation.id,
            code=f"PCODE{i:05d}",
            created_by_id=active_conversation.creator_id
        )
        codes.append(code)
        db_session.add(code)

    db_session.commit()
    for code in codes:
        db_session.refresh(code)
    return codes


# ============================================================================
# Invitation Fixtures
# ============================================================================

@pytest.fixture
def conversation_invitations(db_session: Session, invite_only_conversation: Conversation, test_user: User) -> list[ConversationInvitation]:
    """Create invitations for a conversation."""
    invitations = []
    emails = ["user1@example.com", "user2@example.com", "user3@example.com"]

    for email in emails:
        invitation = ConversationInvitation(
            id=uuid4(),
            conversation_id=invite_only_conversation.id,
            email=email,
            invited_by_id=test_user.id,
            invitation_token=f"TOKEN_{email.split('@')[0]}"
        )
        invitations.append(invitation)
        db_session.add(invitation)

    db_session.commit()
    for inv in invitations:
        db_session.refresh(inv)
    return invitations
