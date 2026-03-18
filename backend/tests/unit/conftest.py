"""Unit test configuration and fixtures.

Uses an in-memory SQLite database with PostgreSQL type compatibility shims.
"""
import uuid as uuid_module
import pytest
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import patch

from sqlalchemy import create_engine, String, Text, JSON, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.types import TypeDecorator
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# SQLite ↔ PostgreSQL type compatibility
# ---------------------------------------------------------------------------
# 1. @compiles directives fix DDL generation (CREATE TABLE)
# 2. Column type replacement fixes bind/result parameter processing

from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB, TSVECTOR, ARRAY


@compiles(PG_UUID, "sqlite")
def compile_uuid_sqlite(type_, compiler, **kw):
    return "CHAR(36)"


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


@compiles(TSVECTOR, "sqlite")
def compile_tsvector_sqlite(type_, compiler, **kw):
    return "TEXT"


@compiles(ARRAY, "sqlite")
def compile_array_sqlite(type_, compiler, **kw):
    return "JSON"


class SQLiteUUID(TypeDecorator):
    """UUID type that works with SQLite (stores as CHAR(36) string)."""

    impl = String(36)
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if isinstance(value, uuid_module.UUID):
                return str(value)
            return str(value)
        return value

    def process_result_value(self, value, dialect):
        if value is not None:
            if not isinstance(value, uuid_module.UUID):
                return uuid_module.UUID(value)
        return value


# ---------------------------------------------------------------------------
# Now safe to import models and app
# ---------------------------------------------------------------------------
from app.core.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.conversation import Conversation
from app.models.question import Question
from app.models.participant_code import ParticipantCode
from app.models.conversation_invitation import ConversationInvitation
from app.models.organization import Organization, OrganizationMember
from app.models.analysis import Analysis
from app.models.suggested_action import SuggestedAction
from app.models.insight_annotation import InsightAnnotation
from app.models.notification import Notification
from app.models.response import Response
from app.models.workspace import Workspace, WorkspaceMember
from app.schemas.conversation import AnonymityLevel, ConversationState
from app.core.security import get_password_hash


# ---------------------------------------------------------------------------
# Replace PG column types in metadata with SQLite-compatible versions.
# This fixes bind/result parameter processing (not just DDL).
# ---------------------------------------------------------------------------
_types_replaced = False


def _replace_pg_types_in_metadata():
    """Replace PG-specific column types with SQLite-compatible ones."""
    global _types_replaced
    if _types_replaced:
        return
    for table in Base.metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, PG_UUID):
                column.type = SQLiteUUID()
            elif isinstance(column.type, JSONB):
                column.type = JSON()
            elif isinstance(column.type, TSVECTOR):
                column.type = Text()
            elif isinstance(column.type, ARRAY):
                column.type = JSON()
    _types_replaced = True


_replace_pg_types_in_metadata()


# ---------------------------------------------------------------------------
# No-op lifespan to avoid scheduler/SSE startup during unit tests
# ---------------------------------------------------------------------------
@asynccontextmanager
async def _noop_lifespan(app):
    yield


# ============================================================================
# Database fixtures
# ============================================================================

@pytest.fixture(scope="function")
def db_engine():
    """Create an in-memory SQLite database for testing."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a fresh database session for each test."""
    TestingSessionLocal = sessionmaker(
        autocommit=False, autoflush=False, bind=db_engine
    )
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture(scope="function")
def client(db_session):
    """Create a TestClient with the database dependency overridden.

    Uses a no-op lifespan to avoid starting the scheduler/SSE services.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    original_router_lifespan = app.router.lifespan_context
    app.router.lifespan_context = _noop_lifespan
    try:
        with TestClient(app, raise_server_exceptions=False) as test_client:
            yield test_client
    finally:
        app.router.lifespan_context = original_router_lifespan
        app.dependency_overrides.clear()


# ============================================================================
# User fixtures
# ============================================================================

@pytest.fixture
def test_user(db_session) -> User:
    """Create a test user."""
    user = User(
        id=uuid4(),
        email="test@example.com",
        password_hash=get_password_hash("testpassword123"),
        full_name="Test User",
        email_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def second_test_user(db_session) -> User:
    """Create a second test user for access control tests."""
    user = User(
        id=uuid4(),
        email="other@example.com",
        password_hash=get_password_hash("otherpassword123"),
        full_name="Other User",
        email_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def third_test_user(db_session) -> User:
    """Create a third test user for organization tests."""
    user = User(
        id=uuid4(),
        email="third@example.com",
        password_hash=get_password_hash("thirdpassword123"),
        full_name="Third User",
        email_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


# ============================================================================
# Workspace fixtures
# ============================================================================

@pytest.fixture
def test_workspace(db_session, test_user) -> Workspace:
    """Create a personal workspace for test_user (FK for conversations)."""
    workspace = Workspace(
        id=uuid4(),
        type="personal",
        name="Personal",
        owner_id=test_user.id,
        is_default=True,
    )
    db_session.add(workspace)
    db_session.flush()

    member = WorkspaceMember(
        workspace_id=workspace.id,
        user_id=test_user.id,
        role="admin",
    )
    db_session.add(member)
    db_session.commit()
    db_session.refresh(workspace)
    return workspace


# ============================================================================
# Organization fixtures
# ============================================================================

@pytest.fixture
def test_organization(db_session, test_user) -> Organization:
    """Create a test organization with test_user as admin."""
    org = Organization(
        id=uuid4(),
        name="Test Organization",
        created_by=test_user.id,
    )
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)

    member = OrganizationMember(
        organization_id=org.id,
        user_id=test_user.id,
        role="admin",
    )
    db_session.add(member)
    db_session.flush()

    # Create a default workspace for the org
    org_workspace = Workspace(
        id=uuid4(),
        type="organization",
        name=org.name,
        organization_id=org.id,
        owner_id=test_user.id,
        is_default=True,
    )
    db_session.add(org_workspace)
    db_session.flush()

    org_ws_member = WorkspaceMember(
        workspace_id=org_workspace.id,
        user_id=test_user.id,
        role="admin",
    )
    db_session.add(org_ws_member)
    db_session.commit()

    return org


# ============================================================================
# Conversation fixtures
# ============================================================================

@pytest.fixture
def draft_conversation(db_session, test_user, test_workspace) -> Conversation:
    """Create a draft conversation."""
    conversation = Conversation(
        id=uuid4(),
        title="Test Conversation",
        description="Test Description",
        creator_id=test_user.id,
        workspace_id=test_workspace.id,
        anonymity_level=AnonymityLevel.PLATFORM_TRACKED,
        results_access="creator_only",
        state=ConversationState.DRAFT,
        access_code="TESTCDEABCDF",
        timezone="UTC",
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation


@pytest.fixture
def active_conversation(db_session, test_user, test_workspace) -> Conversation:
    """Create an active conversation."""
    conversation = Conversation(
        id=uuid4(),
        title="Active Conversation",
        description="Active Description",
        creator_id=test_user.id,
        workspace_id=test_workspace.id,
        anonymity_level=AnonymityLevel.FULLY_ANONYMOUS,
        results_access="creator_only",
        state=ConversationState.ACTIVE,
        access_code="ACTVABCDEFGH",
        activated_at=datetime.utcnow(),
        timezone="UTC",
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation


@pytest.fixture
def closed_conversation(db_session, test_user, test_workspace) -> Conversation:
    """Create a closed conversation."""
    conversation = Conversation(
        id=uuid4(),
        title="Closed Conversation",
        description="Closed Description",
        creator_id=test_user.id,
        workspace_id=test_workspace.id,
        anonymity_level=AnonymityLevel.REVEALABLE,
        results_access="creator_only",
        state=ConversationState.CLOSED,
        access_code="CLSDABCDEFGH",
        activated_at=datetime.utcnow() - timedelta(days=7),
        closed_at=datetime.utcnow() - timedelta(days=1),
        timezone="UTC",
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation


@pytest.fixture
def conversation_with_questions(db_session, draft_conversation) -> Conversation:
    """Create a conversation with multiple question types."""
    questions = [
        Question(
            id=uuid4(),
            conversation_id=draft_conversation.id,
            question_type="text",
            question_text="What went well?",
            question_order=1,
            is_required=True,
        ),
        Question(
            id=uuid4(),
            conversation_id=draft_conversation.id,
            question_type="rating",
            question_text="Rate the sprint",
            question_order=2,
            options={"min": 1, "max": 5},
            is_required=True,
        ),
        Question(
            id=uuid4(),
            conversation_id=draft_conversation.id,
            question_type="single_choice",
            question_text="Choose one",
            question_order=3,
            options={"choices": ["Option A", "Option B", "Option C"]},
            is_required=False,
        ),
    ]
    db_session.add_all(questions)
    db_session.commit()
    db_session.refresh(draft_conversation)
    return draft_conversation


@pytest.fixture
def invite_only_conversation(db_session, test_user, test_workspace) -> Conversation:
    """Create an invite-only conversation."""
    conversation = Conversation(
        id=uuid4(),
        title="Invite Only",
        description="Need invitation",
        creator_id=test_user.id,
        workspace_id=test_workspace.id,
        anonymity_level=AnonymityLevel.PLATFORM_TRACKED,
        results_access="creator_only",
        state=ConversationState.DRAFT,
        access_code="NVTEABCDEFGH",
        invite_only=True,
        timezone="UTC",
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation


@pytest.fixture
def scheduled_conversation(db_session, test_user, test_workspace) -> Conversation:
    """Create a conversation scheduled for future activation."""
    future_time = datetime.utcnow() + timedelta(hours=24)
    conversation = Conversation(
        id=uuid4(),
        title="Scheduled Conversation",
        description="Will activate tomorrow",
        creator_id=test_user.id,
        workspace_id=test_workspace.id,
        anonymity_level=AnonymityLevel.PLATFORM_TRACKED,
        results_access="creator_only",
        state=ConversationState.DRAFT,
        access_code="SCHDABCDEFGH",
        scheduled_activate_at=future_time,
        timezone="UTC",
    )
    db_session.add(conversation)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation


@pytest.fixture
def conversation_with_auto_close(db_session, active_conversation) -> Conversation:
    """Create an active conversation with auto-close scheduled."""
    active_conversation.auto_close_at = datetime.utcnow() + timedelta(days=7)
    db_session.commit()
    db_session.refresh(active_conversation)
    return active_conversation


# ============================================================================
# Participant code fixtures
# ============================================================================

@pytest.fixture
def participant_codes(db_session, active_conversation) -> list:
    """Create participant codes for a conversation."""
    codes = []
    for i in range(5):
        code = ParticipantCode(
            id=uuid4(),
            conversation_id=active_conversation.id,
            participant_code=f"PCODE{i:05d}",
        )
        codes.append(code)
        db_session.add(code)

    db_session.commit()
    for code in codes:
        db_session.refresh(code)
    return codes


# ============================================================================
# Invitation fixtures
# ============================================================================

@pytest.fixture
def conversation_invitations(db_session, invite_only_conversation, test_user) -> list:
    """Create invitations for a conversation."""
    invitations = []
    emails = ["user1@example.com", "user2@example.com", "user3@example.com"]

    for email in emails:
        invitation = ConversationInvitation(
            id=uuid4(),
            conversation_id=invite_only_conversation.id,
            email=email,
            invited_by_id=test_user.id,
            invitation_token=f"TOKEN_{email.split('@')[0]}",
        )
        invitations.append(invitation)
        db_session.add(invitation)

    db_session.commit()
    for inv in invitations:
        db_session.refresh(inv)
    return invitations


# ============================================================================
# Conversation with questions (active, for response tests)
# ============================================================================

@pytest.fixture
def active_conversation_with_questions(db_session, test_user, test_workspace) -> Conversation:
    """Create an active platform_tracked conversation with questions."""
    conversation = Conversation(
        id=uuid4(),
        title="Active With Questions",
        description="For response tests",
        creator_id=test_user.id,
        workspace_id=test_workspace.id,
        anonymity_level=AnonymityLevel.PLATFORM_TRACKED,
        results_access="creator_only",
        state=ConversationState.ACTIVE,
        access_code="ACTVQSTNABCD",
        activated_at=datetime.utcnow(),
        timezone="UTC",
    )
    db_session.add(conversation)
    db_session.flush()

    questions = [
        Question(
            id=uuid4(),
            conversation_id=conversation.id,
            question_type="text",
            question_text="What went well?",
            question_order=1,
            is_required=True,
        ),
        Question(
            id=uuid4(),
            conversation_id=conversation.id,
            question_type="rating",
            question_text="Rate the sprint",
            question_order=2,
            options={"min": 1, "max": 5},
            is_required=False,
        ),
    ]
    db_session.add_all(questions)
    db_session.commit()
    db_session.refresh(conversation)
    return conversation


# ============================================================================
# Analysis fixtures
# ============================================================================

@pytest.fixture
def test_analysis(db_session, active_conversation) -> Analysis:
    """Create a test analysis linked to an active conversation."""
    analysis = Analysis(
        id=uuid4(),
        conversation_id=active_conversation.id,
        overall_summary="Test summary of responses.",
        themes=[{"theme": "Communication", "frequency": 5, "clusters": []}],
        surprising_insights=[{"title": "Surprise", "description": "Something unexpected"}],
        question_analyses=[],
        total_responses_analyzed=10,
        created_at=datetime.utcnow(),
    )
    db_session.add(analysis)
    db_session.commit()
    db_session.refresh(analysis)
    return analysis


# ============================================================================
# Suggested action fixtures
# ============================================================================

@pytest.fixture
def test_suggested_action(db_session, test_analysis, active_conversation) -> SuggestedAction:
    """Create a test suggested action."""
    action = SuggestedAction(
        id=uuid4(),
        analysis_id=test_analysis.id,
        conversation_id=active_conversation.id,
        title="Follow up on communication issues",
        description="Schedule a meeting to discuss communication.",
        action_type="communicate",
        priority="high",
        sentiment="negative",
        source="user_requested",
        status="suggested",
        created_at=datetime.utcnow(),
    )
    db_session.add(action)
    db_session.commit()
    db_session.refresh(action)
    return action


# ============================================================================
# Notification fixtures
# ============================================================================

@pytest.fixture
def test_notifications(db_session, test_user) -> list:
    """Create test notifications for test_user."""
    notifications = []
    for i in range(5):
        n = Notification(
            id=uuid4(),
            user_id=test_user.id,
            notification_type="response_submitted",
            title=f"Notification {i}",
            message=f"Test message {i}",
            read=i < 2,  # First 2 are read, last 3 are unread
            created_at=datetime.utcnow() - timedelta(hours=5 - i),
        )
        notifications.append(n)
        db_session.add(n)
    db_session.commit()
    for n in notifications:
        db_session.refresh(n)
    return notifications
