"""Admin portal routes."""

from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials, HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, decode_token
from app.models.admin import Admin
from app.models.user import User
from app.models.conversation import Conversation
from app.models.response import Response
from app.models.analysis import Analysis
from app.schemas.admin import (
    AdminLoginRequest,
    AdminToken,
    AdminUserInfo,
    AdminConversationInfo,
    AdminResponseInfo,
)
from app.schemas.analysis import Analysis as AnalysisSchema
from app.schemas.common import SuccessResponse
from app.schemas.conversation import ConversationState

router = APIRouter()
security = HTTPBasic(auto_error=False)
bearer_security = HTTPBearer(auto_error=False)


def get_admin(
    credentials: Optional[HTTPBasicCredentials] = Depends(security),
    bearer: Optional[HTTPAuthorizationCredentials] = Depends(bearer_security),
    db: Session = Depends(get_db)
) -> Admin:
    """
    Get current authenticated admin from HTTP Basic Auth or Bearer token.

    Args:
        credentials: HTTP Basic Auth credentials (optional)
        bearer: HTTP Bearer token credentials (optional)
        db: Database session

    Returns:
        Current authenticated admin

    Raises:
        HTTPException: If credentials are invalid
    """
    # Try Bearer token first
    if bearer:
        try:
            token = bearer.credentials
            payload = decode_token(token)
            
            # Check if it's an admin token
            if payload.get("type") != "admin":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            admin_id: Optional[str] = payload.get("sub")
            if admin_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            admin = db.query(Admin).filter(
                Admin.id == UUID(admin_id),
                Admin.is_active == True
            ).first()
            
            if not admin:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Admin not found",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return admin
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # Fall back to Basic Auth
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    admin = db.query(Admin).filter(
        Admin.username == credentials.username,
        Admin.is_active == True
    ).first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Basic"},
        )

    if not verify_password(credentials.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Basic"},
        )

    return admin


@router.post("/login", response_model=AdminToken)
async def admin_login(
    login_data: AdminLoginRequest,
    db: Session = Depends(get_db)
):
    """
    Admin login endpoint (alternative to HTTP Basic Auth).

    Args:
        login_data: Admin login credentials
        db: Database session

    Returns:
        Admin access token

    Raises:
        HTTPException: If credentials are invalid
    """
    admin = db.query(Admin).filter(
        Admin.username == login_data.username,
        Admin.is_active == True
    ).first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not verify_password(login_data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Create token
    access_token = create_access_token(data={"sub": str(admin.id), "type": "admin"})

    return AdminToken(
        access_token=access_token,
        token_type="bearer"
    )


@router.get("/users", response_model=List[AdminUserInfo])
async def list_users(
    email: Optional[str] = None,
    first_name: Optional[str] = None,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    List all users with optional filters.

    Args:
        email: Filter by email (partial match)
        first_name: Filter by first name (partial match)
        admin: Current authenticated admin
        db: Database session

    Returns:
        List of users
    """
    query = db.query(User)

    if email:
        query = query.filter(User.email.ilike(f"%{email}%"))

    if first_name:
        query = query.filter(User.full_name.ilike(f"%{first_name}%"))

    users = query.order_by(User.created_at.desc()).all()
    return users


@router.get("/conversations", response_model=List[AdminConversationInfo])
async def list_conversations(
    creator_id: Optional[UUID] = None,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    List all conversations with optional filters.

    Args:
        creator_id: Filter by creator user ID
        admin: Current authenticated admin
        db: Database session

    Returns:
        List of conversations
    """
    query = db.query(Conversation)

    if creator_id:
        query = query.filter(Conversation.creator_id == creator_id)

    conversations = query.order_by(Conversation.created_at.desc()).all()
    return conversations


@router.get("/users/{user_id}", response_model=AdminUserInfo)
async def get_user(
    user_id: UUID,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    Get a single user by ID.

    Args:
        user_id: User ID
        admin: Current authenticated admin
        db: Database session

    Returns:
        User information

    Raises:
        HTTPException: If user not found
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.get("/conversations/{conversation_id}", response_model=AdminConversationInfo)
async def get_conversation(
    conversation_id: UUID,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    Get a single conversation by ID.

    Args:
        conversation_id: Conversation ID
        admin: Current authenticated admin
        db: Database session

    Returns:
        Conversation information

    Raises:
        HTTPException: If conversation not found
    """
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    return conversation


@router.get("/responses", response_model=List[AdminResponseInfo])
async def list_responses(
    user_id: Optional[UUID] = None,
    conversation_id: Optional[UUID] = None,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    List all responses with optional filters.

    Args:
        user_id: Filter by response user ID (participant_id)
        conversation_id: Filter by conversation ID
        admin: Current authenticated admin
        db: Database session

    Returns:
        List of responses
    """
    query = db.query(Response)

    if user_id:
        query = query.filter(Response.participant_id == user_id)

    if conversation_id:
        query = query.filter(Response.conversation_id == conversation_id)

    responses = query.order_by(Response.submitted_at.desc()).all()
    return responses


@router.get("/conversations/{conversation_id}/analysis", response_model=AnalysisSchema)
async def get_conversation_analysis(
    conversation_id: UUID,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    Get analysis results for a conversation (admin only).

    Args:
        conversation_id: Conversation ID
        admin: Current authenticated admin
        db: Database session

    Returns:
        Analysis results

    Raises:
        HTTPException: If conversation not found or no analysis exists
    """
    # Verify conversation exists
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Get analysis
    analysis = db.query(Analysis).filter(
        Analysis.conversation_id == conversation_id
    ).order_by(
        Analysis.created_at.desc()
    ).first()

    if not analysis:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No analysis found for this conversation"
        )

    return analysis


@router.post("/conversations/{conversation_id}/reanalyze", response_model=SuccessResponse)
async def reanalyze_conversation(
    conversation_id: UUID,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    Trigger re-analysis for a conversation (admin only).

    This will delete the existing analysis and create a new one.
    The conversation must be in ANALYZED state.

    Args:
        conversation_id: Conversation ID
        admin: Current authenticated admin
        db: Database session

    Returns:
        Success response

    Raises:
        HTTPException: If conversation not found, not analyzed, or no responses exist
    """
    # Verify conversation exists
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Check if conversation is in analyzed state
    if conversation.state != ConversationState.ANALYZED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation must be in analyzed state to re-run analysis"
        )

    # Check if there are responses to analyze
    response_count = db.query(Response).filter(
        Response.conversation_id == conversation_id
    ).count()

    if response_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No responses to analyze"
        )

    # Delete existing analysis
    existing_analysis = db.query(Analysis).filter(
        Analysis.conversation_id == conversation_id
    ).first()

    if existing_analysis:
        db.delete(existing_analysis)
        db.commit()

    # Set conversation state to ANALYZING
    conversation.state = ConversationState.ANALYZING.value
    db.commit()

    # Import the analysis function from the analysis route
    from app.routes.analysis import run_analysis_task
    from app.core.config import settings

    # Run analysis synchronously for admin (simpler, admins can wait)
    try:
        run_analysis_task(
            conversation_id=conversation_id,
            db_url=settings.DATABASE_URL,
            min_cluster_size=2
        )

        return SuccessResponse(
            success=True,
            message="Analysis completed successfully"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )

