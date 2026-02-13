"""
Centralized access control for conversations.

This module provides FastAPI dependencies that handle all conversation
access checks in one place, preventing scattered and inconsistent
permission logic across endpoints.
"""

from dataclasses import dataclass
from typing import Optional
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_optional_current_user, get_participant_session
from app.models.conversation import Conversation
from app.models.conversation_invitation import ConversationInvitation
from app.models.user import User
from app.schemas.conversation import AnonymityLevel, ConversationState


@dataclass
class ConversationAccess:
    """Result of conversation access check."""
    conversation: Conversation
    user: Optional[User]
    invitation: Optional[ConversationInvitation]
    participant_session: Optional[dict]  # For fully_anonymous


def _check_invitation(
    db: Session,
    conversation: Conversation,
    user: User
) -> Optional[ConversationInvitation]:
    """Check if user was invited to the conversation."""
    return db.query(ConversationInvitation).filter(
        ConversationInvitation.conversation_id == conversation.id,
        or_(
            ConversationInvitation.invited_user_id == user.id,
            ConversationInvitation.email == user.email.lower()
        )
    ).first()


def _require_auth(conversation: Conversation) -> bool:
    """
    Determine if authentication is required for this conversation.

    Auth required when:
    - anonymity_level is platform_tracked or revealable
    - OR invite_only is true (except fully_anonymous which uses participant codes)
    """
    is_fully_anonymous = conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value
    is_open = conversation.anonymity_level == AnonymityLevel.OPEN.value

    # Fully anonymous uses participant codes, not auth
    if is_fully_anonymous:
        return False

    # Platform tracked and revealable always require auth
    if not is_open:
        return True

    # OPEN + invite_only requires auth
    if conversation.invite_only:
        return True

    return False


def _require_invitation_check(conversation: Conversation) -> bool:
    """
    Determine if we need to verify user was invited.

    Only needed when invite_only=True AND not fully_anonymous.
    (fully_anonymous controls access via participant codes distribution)
    """
    if not conversation.invite_only:
        return False

    # Fully anonymous doesn't check invitations at access time
    # (invitations control who gets participant codes)
    if conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
        return False

    return True


class ConversationAccessChecker:
    """
    Factory for creating conversation access dependencies.

    Usage:
        # For endpoints that access by access_code
        @router.post("/conversations/{access_code}/responses")
        async def submit(access: ConversationAccess = Depends(
            ConversationAccessChecker(by_code=True, require_active=True)
        )):
            ...

        # For endpoints that access by conversation_id (creator only)
        @router.get("/conversations/{conversation_id}")
        async def get(access: ConversationAccess = Depends(
            ConversationAccessChecker(by_id=True, require_creator=True)
        )):
            ...
    """

    def __init__(
        self,
        by_code: bool = False,
        by_id: bool = False,
        require_active: bool = False,
        require_creator: bool = False,
        load_questions: bool = False,
        skip_fully_anonymous_session: bool = False,
    ):
        """
        Configure the access checker.

        Args:
            by_code: Look up conversation by access_code path parameter
            by_id: Look up conversation by conversation_id path parameter
            require_active: Conversation must be in ACTIVE state
            require_creator: User must be the conversation creator
            load_questions: Eager load questions relationship
            skip_fully_anonymous_session: For endpoints that validate participant_code
                from request body instead of session (e.g., draft operations)
        """
        if by_code == by_id:
            raise ValueError("Exactly one of by_code or by_id must be True")

        self.by_code = by_code
        self.by_id = by_id
        self.require_active = require_active
        self.require_creator = require_creator
        self.load_questions = load_questions
        self.skip_fully_anonymous_session = skip_fully_anonymous_session

    async def __call__(
        self,
        access_code: Optional[str] = None,
        conversation_id: Optional[UUID] = None,
        db: Session = Depends(get_db),
        current_user: Optional[User] = Depends(get_optional_current_user),
        participant_session: Optional[dict] = Depends(get_participant_session),
    ) -> ConversationAccess:
        """Execute the access check and return ConversationAccess."""

        # Build query
        query = db.query(Conversation)
        if self.load_questions:
            query = query.options(joinedload(Conversation.questions))

        # Find conversation
        if self.by_code:
            if not access_code:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Access code is required"
                )
            conversation = query.filter(Conversation.access_code == access_code).first()
        else:
            if not conversation_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Conversation ID is required"
                )
            conversation = query.filter(Conversation.id == conversation_id).first()

        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Check state if required
        if self.require_active:
            if conversation.state != ConversationState.ACTIVE.value:
                if conversation.state == ConversationState.CLOSED.value:
                    raise HTTPException(
                        status_code=status.HTTP_410_GONE,
                        detail="This conversation has been closed and is no longer accepting responses."
                    )
                elif conversation.state == ConversationState.DRAFT.value:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="This conversation has not been activated yet."
                    )
                else:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="This conversation is not currently available."
                    )

        # Check creator requirement
        if self.require_creator:
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required"
                )
            if conversation.creator_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Conversation not found"
                )
            return ConversationAccess(
                conversation=conversation,
                user=current_user,
                invitation=None,
                participant_session=None,
            )

        # Handle fully_anonymous
        if conversation.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
            # Some endpoints (draft operations) validate participant_code from request body
            # instead of requiring a session token
            if self.skip_fully_anonymous_session:
                return ConversationAccess(
                    conversation=conversation,
                    user=current_user,  # May be None, that's ok
                    invitation=None,
                    participant_session=None,
                )

            # Normal case: requires participant session (from validating secret code)
            if not participant_session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Valid participant session required for this conversation"
                )
            # Verify session matches this conversation
            session_code = participant_session.get("access_code")
            if self.by_code and session_code != access_code:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Session token does not match conversation"
                )
            return ConversationAccess(
                conversation=conversation,
                user=None,
                invitation=None,
                participant_session=participant_session,
            )

        # Check if auth is required
        if _require_auth(conversation):
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required for this conversation"
                )

        # Check invitation if needed
        invitation = None
        if _require_invitation_check(conversation):
            if not current_user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required for invite-only conversations"
                )
            invitation = _check_invitation(db, conversation, current_user)
            if not invitation:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This conversation is invite-only. You must be invited to access it."
                )

        return ConversationAccess(
            conversation=conversation,
            user=current_user,
            invitation=invitation,
            participant_session=None,
        )


# Pre-configured dependencies for common use cases

# For participant-facing endpoints (join page, submit response, etc.)
require_participant_access = ConversationAccessChecker(
    by_code=True,
    require_active=True,
    load_questions=True,
)

# For viewing conversation details by code
require_conversation_by_code = ConversationAccessChecker(
    by_code=True,
    require_active=True,
    load_questions=True,
)

# For draft operations (participant_code validated from request body for fully_anonymous)
require_draft_access = ConversationAccessChecker(
    by_code=True,
    require_active=True,
    load_questions=True,
    skip_fully_anonymous_session=True,
)

# For creator-only operations
require_creator_access = ConversationAccessChecker(
    by_id=True,
    require_creator=True,
    load_questions=False,
)
