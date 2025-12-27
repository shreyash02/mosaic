"""Dependency injection functions."""

from typing import Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

# HTTP Bearer token scheme
security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token credentials
        db: Database session

    Returns:
        Current authenticated user

    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token = credentials.credentials
        payload = decode_token(token)

        # Check if it's a refresh token
        if payload.get("type") == "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token cannot be used for authentication",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Get user from database
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if user is None:
        raise credentials_exception

    return user


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current authenticated user from JWT token, or None if no token provided.

    Args:
        credentials: HTTP Bearer token credentials (optional)
        db: Database session

    Returns:
        Current authenticated user or None
    """
    if credentials is None:
        return None

    try:
        token = credentials.credentials
        payload = decode_token(token)

        # Check if it's a refresh token
        if payload.get("type") == "refresh":
            return None

        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            return None

    except JWTError:
        return None

    # Get user from database
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    return user


def get_participant_session(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> Optional[dict]:
    """
    Get participant session from JWT token for fully_anonymous conversations.
    
    Args:
        credentials: HTTP Bearer token credentials (optional)
        db: Database session
    
    Returns:
        Session data dict with access_code, participant_code, conversation_id, or None
    """
    if credentials is None:
        return None
    
    try:
        token = credentials.credentials
        payload = decode_token(token)
        
        # Check if it's a participant session token
        if payload.get("type") != "participant_session":
            return None
        
        access_code = payload.get("access_code")
        participant_code = payload.get("participant_code")
        conversation_id = payload.get("conversation_id")
        
        if not all([access_code, participant_code, conversation_id]):
            return None
        
        # Verify participant code is still valid and unused
        from app.models.participant_code import ParticipantCode
        from app.models.conversation import Conversation
        from app.schemas.conversation import ConversationState
        
        participant_code_obj = db.query(ParticipantCode).filter(
            ParticipantCode.participant_code == participant_code,
            ParticipantCode.conversation_id == UUID(conversation_id),
            ParticipantCode.is_used == False
        ).first()
        
        if not participant_code_obj:
            return None
        
        # Verify conversation is still active
        conversation = db.query(Conversation).filter(
            Conversation.id == UUID(conversation_id),
            Conversation.access_code == access_code,
            Conversation.state == ConversationState.ACTIVE.value
        ).first()
        
        if not conversation:
            return None
        
        return {
            "access_code": access_code,
            "participant_code": participant_code,
            "conversation_id": UUID(conversation_id)
        }
        
    except (JWTError, ValueError):
        return None
