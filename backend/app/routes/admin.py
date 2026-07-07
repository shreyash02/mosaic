"""Admin portal routes."""

import logging
import traceback
import uuid
from datetime import datetime
from typing import Optional, List
from uuid import UUID

logger = logging.getLogger(__name__)
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials, HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session
from sqlalchemy import or_, func, cast, distinct
from sqlalchemy.types import Date

from app.core.database import get_db
from app.core.security import verify_password, create_access_token, decode_token
from app.models.admin import Admin
from app.models.user import User
from app.models.conversation import Conversation
from app.models.response import Response
from app.models.analysis import Analysis
from app.models.organization import Organization
from app.models.journal_template import JournalTemplate
from app.models.subscription import Subscription
from app.models.space import Space
from app.models.idea import Idea
from app.models.theme import Theme
from app.models.idea_theme import IdeaTheme
from app.models.theme_connection import ThemeConnection
from app.models.space_synthesis import SpaceSynthesis
from app.models.synthesis_action import SynthesisAction
from app.models.space_member import SpaceMember
from app.models.space_snapshot import SpaceSnapshot
from app.models.space_activity_log import SpaceActivityLog
from app.models.theme_event import ThemeEvent
from app.models.workspace import Workspace
from app.schemas.admin import (
    AdminLoginRequest,
    AdminToken,
    AdminUserInfo,
    AdminConversationInfo,
    AdminResponseInfo,
    GenerateTestDataRequest,
    GenerateTestDataResponse,
    SchedulerJobLogInfo,
    SchedulerJobSummary,
    SchedulerStatusResponse,
    SchedulerLogsResponse,
    SchedulerLogsCleanupResponse,
    AdminSetTierRequest,
    AdminSubscriptionInfo,
    AdminUserContextResponse,
    AdminUserOrgMembershipInfo,
    AdminUserFlagInfo,
    DailyCount,
    ConversationStateCount,
    TierDistribution,
    AnonymityDistribution,
    AdminAnalyticsResponse,
)
from app.schemas.analysis import Analysis as AnalysisSchema
from app.schemas.common import SuccessResponse
from app.schemas.conversation import ConversationState, ConversationUpdate, ConversationWithQuestions
from app.services.audit_log_service import log_audit
from app.services.platform_settings_service import get_llm_model

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

    # Batch-load creators so the list can show a name instead of a bare UUID
    creator_ids = {c.creator_id for c in conversations if c.creator_id}
    creators = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(creator_ids)).all()
    } if creator_ids else {}

    result = []
    for conv in conversations:
        info = AdminConversationInfo.model_validate(conv)
        creator = creators.get(conv.creator_id)
        if creator:
            info.creator_name = creator.full_name
            info.creator_email = creator.email
        result.append(info)
    return result


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


@router.get("/users/{user_id}/context", response_model=AdminUserContextResponse)
async def get_user_context(
    user_id: UUID,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    Get full debugging context for a user: subscription, org memberships,
    and resolved feature flags.
    """
    from app.models.organization import OrganizationMember
    from app.services.subscription_service import subscription_service
    from app.services.feature_flag_service import feature_flag_service

    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # 1. Subscription
    sub = subscription_service.get_subscription(db, user_id=user_id)
    if sub:
        sub_info = AdminSubscriptionInfo(
            tier=sub.tier,
            status=sub.status,
            expires_at=sub.expires_at,
            user_id=user_id,
        )
    else:
        sub_info = AdminSubscriptionInfo(
            tier="free",
            status="none",
            expires_at=None,
            user_id=user_id,
        )

    # 2. Organization memberships
    memberships = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user_id)
        .all()
    )
    org_list = []
    for mem in memberships:
        org = db.query(Organization).filter(Organization.id == mem.organization_id).first()
        if org:
            org_tier = subscription_service.get_tier(db, org_id=org.id)
            org_list.append(AdminUserOrgMembershipInfo(
                id=org.id,
                name=org.name,
                role=mem.role,
                joined_at=mem.joined_at,
                tier=org_tier,
            ))

    # 3. Resolved feature flags (personal context: tier + user_id, no org)
    user_tier = sub_info.tier
    all_flags = feature_flag_service.list_all_flags(db)
    flag_list = []
    for flag in all_flags:
        try:
            resolved = feature_flag_service.get_flag(
                db, flag.slug, tier=user_tier, user_id=user_id
            )
            flag_list.append(AdminUserFlagInfo(
                name=resolved.name,
                slug=resolved.slug,
                enabled=resolved.enabled,
                config=resolved.config,
                resolution_chain=resolved.resolution_chain or ["global"],
            ))
        except Exception:
            pass

    return AdminUserContextResponse(
        subscription=sub_info,
        organizations=org_list,
        flags=flag_list,
    )


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


@router.patch("/conversations/{conversation_id}", response_model=AdminConversationInfo)
async def update_conversation(
    conversation_id: UUID,
    update_data: ConversationUpdate,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    Update conversation (admin only - can update regardless of state).

    Args:
        conversation_id: Conversation ID
        update_data: Update data
        admin: Current authenticated admin
        db: Database session

    Returns:
        Updated conversation information

    Raises:
        HTTPException: If conversation not found
    """
    from sqlalchemy.orm import joinedload
    from app.models.question import Question
    from datetime import datetime
    from app.utils.timezone_utils import parse_datetime_with_timezone

    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Handle questions update separately (if provided)
    questions_to_update = update_data.questions
    update_dict = update_data.model_dump(exclude_unset=True, exclude={'questions'})
    
    # Get conversation timezone for datetime conversions
    conversation_timezone = conversation.timezone or "UTC"

    # Update conversation fields
    for field, value in update_dict.items():
        if field == 'anonymity_level' and value:
            setattr(conversation, field, value.value)
        elif field == 'results_access' and value:
            setattr(conversation, field, value.value)
        elif field == 'recurrence_pattern' and value:
            setattr(conversation, field, value.value)
        elif field in ['next_instance_date', 'recurrence_end_date', 'scheduled_activate_at', 'auto_close_at'] and value:
            # Convert from conversation timezone to UTC
            value_utc = parse_datetime_with_timezone(
                value.isoformat() if isinstance(value, datetime) else str(value),
                conversation_timezone
            )
            setattr(conversation, field, value_utc)
        else:
            setattr(conversation, field, value)

    # Update questions if provided
    if questions_to_update is not None:
        if len(questions_to_update) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one question is required"
            )

        # Collect old image URLs before deleting questions
        old_image_urls = {
            q.question_image_url
            for q in db.query(Question).filter(Question.conversation_id == conversation.id).all()
            if q.question_image_url
        }

        # Collect new image URLs from update payload
        new_image_urls = {
            q.question_image_url for q in questions_to_update
            if hasattr(q, 'question_image_url') and q.question_image_url
        }

        # Delete existing questions
        db.query(Question).filter(Question.conversation_id == conversation.id).delete()

        # Create new questions
        for question_data in questions_to_update:
            question = Question(
                conversation_id=conversation.id,
                question_text=question_data.question_text,
                question_type=question_data.question_type,
                question_order=question_data.question_order,
                options=question_data.options,
                is_required=question_data.is_required if hasattr(question_data, 'is_required') else False,
                question_image_url=question_data.question_image_url if hasattr(question_data, 'question_image_url') else None,
            )
            db.add(question)

        # Delete orphaned image files
        from app.routes.upload import delete_image_file
        for url in old_image_urls - new_image_urls:
            delete_image_file(url)

    db.commit()
    db.refresh(conversation)

    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="update_conversation",
        entity_type="conversation",
        entity_id=str(conversation_id),
        details={"changes": update_dict},
    )

    return conversation


@router.get("/responses", response_model=List[AdminResponseInfo])
async def list_responses(
    user_id: Optional[UUID] = None,
    conversation_id: Optional[UUID] = None,
    participation_id: Optional[UUID] = None,
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

    if participation_id:
        query = query.filter(Response.participation_id == participation_id)

    responses = query.order_by(Response.submitted_at.desc()).all()

    # Batch-load participants and questions so the UI can show names and
    # question text instead of bare UUIDs
    from app.models.question import Question

    participant_ids = {r.participant_id for r in responses if r.participant_id}
    participants = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(participant_ids)).all()
    } if participant_ids else {}

    question_ids = {r.question_id for r in responses if r.question_id}
    questions = {
        q.id: q
        for q in db.query(Question).filter(Question.id.in_(question_ids)).all()
    } if question_ids else {}

    result = []
    for r in responses:
        info = AdminResponseInfo.model_validate(r)
        participant = participants.get(r.participant_id)
        if participant:
            info.participant_name = participant.full_name or participant.email
        question = questions.get(r.question_id)
        if question:
            info.question_text = question.question_text
            info.question_order = question.question_order
        result.append(info)
    return result


@router.get("/analyses")
async def list_analyses(
    conversation_id: Optional[UUID] = None,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    List all analyses with optional filters.

    Args:
        conversation_id: Filter by conversation ID
        admin: Current authenticated admin
        db: Database session

    Returns:
        List of analyses with conversation info
    """
    query = db.query(Analysis).join(Conversation)

    if conversation_id:
        query = query.filter(Analysis.conversation_id == conversation_id)

    analyses = query.order_by(Analysis.created_at.desc()).all()

    # Return analyses with conversation title
    result = []
    for analysis in analyses:
        conversation = db.query(Conversation).filter(Conversation.id == analysis.conversation_id).first()
        summary = analysis.overall_summary or ""
        result.append({
            "id": str(analysis.id),
            "conversation_id": str(analysis.conversation_id),
            "conversation_title": conversation.title if conversation else "Unknown",
            "summary": summary[:200] + "..." if len(summary) > 200 else summary,
            "created_at": analysis.created_at.isoformat(),
        })

    return result


@router.get("/organizations")
async def list_organizations(
    name: Optional[str] = None,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    List all organizations with optional filters.

    Args:
        name: Filter by organization name (partial match)
        admin: Current authenticated admin
        db: Database session

    Returns:
        List of organizations
    """
    query = db.query(Organization)

    if name:
        query = query.filter(Organization.name.ilike(f"%{name}%"))

    organizations = query.order_by(Organization.created_at.desc()).all()

    # Return organizations with member count
    result = []
    for org in organizations:
        from app.models.organization import OrganizationMember
        member_count = db.query(OrganizationMember).filter(
            OrganizationMember.organization_id == org.id
        ).count()

        result.append({
            "id": str(org.id),
            "name": org.name,
            "description": org.description,
            "creator_id": str(org.created_by),
            "member_count": member_count,
            "created_at": org.created_at.isoformat(),
        })

    return result


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

        log_audit(
            admin_id=admin.id,
            admin_username=admin.username,
            action="reanalyze_conversation",
            entity_type="conversation",
            entity_id=str(conversation_id),
        )

        return SuccessResponse(
            success=True,
            message="Analysis completed successfully"
        )
    except Exception as e:
        logger.error(f"Analysis failed for conversation {conversation_id}: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {str(e)}"
        )


@router.post("/test-tools/generate-responses", response_model=GenerateTestDataResponse)
async def generate_test_responses(
    request: GenerateTestDataRequest,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    Generate test responses for a conversation (admin only).

    This creates realistic test data including:
    - LLM-generated text responses for text questions
    - Random ratings for rating questions
    - Random selections for poll questions
    - Timestamps spread across the specified time range

    Args:
        request: Test data generation request with conversation_id, num_respondents, and time range
        admin: Current authenticated admin
        db: Database session

    Returns:
        Success response with counts of created responses

    Raises:
        HTTPException: If conversation not found or validation fails
    """
    from app.models.question import Question
    from app.services.test_data_service import TestDataService

    # Verify conversation exists
    conversation = db.query(Conversation).filter(
        Conversation.id == request.conversation_id
    ).first()

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )

    # Validate time range
    if request.start_time >= request.end_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_time must be before end_time"
        )

    # Get questions for this conversation
    questions = db.query(Question).filter(
        Question.conversation_id == request.conversation_id
    ).order_by(Question.question_order).all()

    if not questions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Conversation has no questions"
        )

    # Generate test responses
    try:
        service = TestDataService(model=get_llm_model(db))
        responses_data = service.generate_test_responses(
            questions=questions,
            num_respondents=request.num_respondents,
            start_time=request.start_time,
            end_time=request.end_time,
            conversation_title=conversation.title,
            conversation_description=conversation.description
        )

        # Insert responses into database
        for response_dict in responses_data:
            response = Response(
                id=uuid.uuid4(),
                conversation_id=uuid.UUID(response_dict["conversation_id"]),
                question_id=uuid.UUID(response_dict["question_id"]),
                response_text=response_dict.get("response_text"),
                response_data=response_dict.get("response_data"),
                participant_code_used=response_dict["participant_code_used"],
                anonymity_level=response_dict["anonymity_level"],
                reveal_consent=response_dict["reveal_consent"],
                status=response_dict["status"],
                submitted_at=response_dict["submitted_at"],
                is_test_data=response_dict.get("is_test_data", False),
            )
            db.add(response)

        db.commit()

        log_audit(
            admin_id=admin.id,
            admin_username=admin.username,
            action="generate_test_responses",
            entity_type="conversation",
            entity_id=str(request.conversation_id),
            details={"num_respondents": request.num_respondents, "responses_created": len(responses_data)},
        )

        return GenerateTestDataResponse(
            success=True,
            message=f"Successfully generated {len(responses_data)} test responses from {request.num_respondents} respondents",
            responses_created=len(responses_data),
            respondents_created=request.num_respondents
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to generate test data: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate test data: {str(e)}"
        )


@router.delete("/test-tools/cleanup-test-data", response_model=SuccessResponse)
async def cleanup_test_data(
    conversation_id: Optional[UUID] = None,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    Delete all test data (responses marked as is_test_data=True).

    Args:
        conversation_id: Optional - only delete test data for a specific conversation
        admin: Current authenticated admin
        db: Database session

    Returns:
        Success response with count of deleted responses
    """
    try:
        query = db.query(Response).filter(Response.is_test_data == True)

        if conversation_id:
            query = query.filter(Response.conversation_id == conversation_id)

        # Get count before deleting
        count = query.count()

        if count == 0:
            return SuccessResponse(
                success=True,
                message="No test data found to delete"
            )

        # Delete the test responses
        query.delete(synchronize_session=False)
        db.commit()

        log_audit(
            admin_id=admin.id,
            admin_username=admin.username,
            action="cleanup_test_data",
            entity_type="test_data",
            entity_id=str(conversation_id) if conversation_id else None,
            details={"deleted_count": count},
        )

        return SuccessResponse(
            success=True,
            message=f"Successfully deleted {count} test responses"
        )

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to cleanup test data: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup test data: {str(e)}"
        )


# ============================================================
# Subscription management endpoints
# ============================================================

@router.get("/subscriptions/lookup", response_model=AdminSubscriptionInfo)
async def lookup_subscription(
    user_id: Optional[UUID] = None,
    organization_id: Optional[UUID] = None,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """
    Look up the current subscription tier for a user or organization.

    Provide exactly one of user_id or organization_id.
    Returns the effective tier (defaults to 'free' if no subscription exists).
    """
    if not user_id and not organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either user_id or organization_id",
        )
    if user_id and organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide only one of user_id or organization_id",
        )

    from app.services.subscription_service import subscription_service

    tier = subscription_service.get_tier(db, user_id=user_id, org_id=organization_id)
    sub = subscription_service.get_subscription(db, user_id=user_id, org_id=organization_id)

    return AdminSubscriptionInfo(
        tier=tier,
        status=sub.status if sub else "none",
        expires_at=sub.expires_at if sub else None,
        user_id=user_id,
        organization_id=organization_id,
    )


@router.post("/subscriptions/set-tier", response_model=AdminSubscriptionInfo)
async def set_subscription_tier(
    request: AdminSetTierRequest,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """
    Set the subscription tier for a user or organization.

    Provide exactly one of user_id or organization_id.
    duration_days is optional — null means no expiration.
    """
    from datetime import timedelta
    from app.services.subscription_service import subscription_service
    from app.core.tiers import VALID_TIERS

    if not request.user_id and not request.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide either user_id or organization_id",
        )
    if request.user_id and request.organization_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide only one of user_id or organization_id",
        )
    if request.tier not in VALID_TIERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid tier. Must be one of: {', '.join(sorted(VALID_TIERS))}",
        )

    expires_at = None
    if request.duration_days is not None:
        expires_at = datetime.utcnow() + timedelta(days=request.duration_days)

    sub = subscription_service.set_tier(
        db,
        tier=request.tier,
        user_id=request.user_id,
        org_id=request.organization_id,
        expires_at=expires_at,
    )

    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="set_subscription_tier",
        entity_type="subscription",
        entity_id=str(request.user_id or request.organization_id),
        details={"tier": request.tier, "duration_days": request.duration_days},
    )

    return AdminSubscriptionInfo(
        tier=sub.tier,
        status=sub.status,
        expires_at=sub.expires_at,
        user_id=request.user_id,
        organization_id=request.organization_id,
    )


# ============================================================
# LLM Usage endpoint
# ============================================================

from app.schemas.llm_usage import AdminLLMUsageResponse, LLMUsageSummary, DailyCost, OperationBreakdown, ProviderBreakdown, ModelBreakdown, RecentError


@router.get("/llm-usage", response_model=AdminLLMUsageResponse)
async def get_llm_usage(
    period_days: int = 30,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """
    Get aggregated LLM usage data for the admin dashboard.

    Args:
        period_days: Number of days to include (default 30).
        admin: Current authenticated admin.
        db: Database session.

    Returns:
        Aggregated LLM usage data.
    """
    from datetime import timedelta
    from app.models.llm_usage_log import LLMUsageLog

    now = datetime.utcnow()
    period_start = now - timedelta(days=period_days)

    base = db.query(LLMUsageLog).filter(LLMUsageLog.created_at >= period_start)

    # --- Summary ---
    total_calls = base.count()
    total_cost = db.query(func.coalesce(func.sum(LLMUsageLog.estimated_cost_usd), 0.0)).filter(
        LLMUsageLog.created_at >= period_start
    ).scalar()
    total_input = db.query(func.coalesce(func.sum(LLMUsageLog.input_tokens), 0)).filter(
        LLMUsageLog.created_at >= period_start
    ).scalar()
    total_output = db.query(func.coalesce(func.sum(LLMUsageLog.output_tokens), 0)).filter(
        LLMUsageLog.created_at >= period_start
    ).scalar()
    avg_latency = db.query(func.avg(LLMUsageLog.latency_ms)).filter(
        LLMUsageLog.created_at >= period_start,
        LLMUsageLog.latency_ms.isnot(None),
    ).scalar()
    error_count = base.filter(LLMUsageLog.status == "error").count()
    error_rate = error_count / total_calls if total_calls > 0 else 0.0

    summary = LLMUsageSummary(
        total_calls=total_calls,
        total_cost=round(float(total_cost), 4),
        total_input_tokens=int(total_input),
        total_output_tokens=int(total_output),
        avg_latency_ms=round(float(avg_latency), 1) if avg_latency else None,
        error_rate=round(error_rate, 4),
    )

    # --- Daily costs (zero-filled) ---
    raw_daily = db.query(
        cast(LLMUsageLog.created_at, Date),
        func.coalesce(func.sum(LLMUsageLog.estimated_cost_usd), 0.0),
        func.count(LLMUsageLog.id),
    ).filter(
        LLMUsageLog.created_at >= period_start,
    ).group_by(cast(LLMUsageLog.created_at, Date)).all()

    daily_map = {str(row[0]): (float(row[1]), row[2]) for row in raw_daily}
    daily_costs = []
    from datetime import timedelta as td
    for i in range(period_days):
        d = (period_start + td(days=i)).date()
        cost, calls = daily_map.get(str(d), (0.0, 0))
        daily_costs.append(DailyCost(date=str(d), cost=round(cost, 4), calls=calls))

    # --- By operation ---
    raw_ops = db.query(
        LLMUsageLog.operation_type,
        func.count(LLMUsageLog.id),
        func.coalesce(func.sum(LLMUsageLog.estimated_cost_usd), 0.0),
        func.avg(LLMUsageLog.latency_ms),
    ).filter(
        LLMUsageLog.created_at >= period_start,
    ).group_by(LLMUsageLog.operation_type).all()

    by_operation = [
        OperationBreakdown(
            operation_type=row[0],
            calls=row[1],
            cost=round(float(row[2]), 4),
            avg_latency_ms=round(float(row[3]), 1) if row[3] else None,
        )
        for row in raw_ops
    ]
    by_operation.sort(key=lambda x: x.cost, reverse=True)

    # --- By provider ---
    raw_prov = db.query(
        LLMUsageLog.provider,
        func.count(LLMUsageLog.id),
        func.coalesce(func.sum(LLMUsageLog.estimated_cost_usd), 0.0),
    ).filter(
        LLMUsageLog.created_at >= period_start,
    ).group_by(LLMUsageLog.provider).all()

    by_provider = [
        ProviderBreakdown(provider=row[0], calls=row[1], cost=round(float(row[2]), 4))
        for row in raw_prov
    ]

    # --- By model ---
    raw_model = db.query(
        LLMUsageLog.model,
        func.count(LLMUsageLog.id),
        func.coalesce(func.sum(LLMUsageLog.estimated_cost_usd), 0.0),
    ).filter(
        LLMUsageLog.created_at >= period_start,
    ).group_by(LLMUsageLog.model).all()

    by_model = [
        ModelBreakdown(model=row[0], calls=row[1], cost=round(float(row[2]), 4))
        for row in raw_model
    ]

    # --- Recent errors ---
    raw_errors = db.query(LLMUsageLog).filter(
        LLMUsageLog.status == "error",
    ).order_by(LLMUsageLog.created_at.desc()).limit(20).all()

    recent_errors = [
        RecentError(
            operation_type=e.operation_type,
            error_message=e.error_message,
            created_at=e.created_at,
        )
        for e in raw_errors
    ]

    return AdminLLMUsageResponse(
        summary=summary,
        daily_costs=daily_costs,
        by_operation=by_operation,
        by_provider=by_provider,
        by_model=by_model,
        recent_errors=recent_errors,
    )


# ============================================================
# Email Logs endpoint
# ============================================================

from app.schemas.email_log import (
    AdminEmailLogsResponse,
    EmailLogSummary,
    EmailDailyVolume,
    EmailTypeBreakdown,
    EmailLogEntry,
    RecentFailure,
)


@router.get("/email-logs", response_model=AdminEmailLogsResponse)
async def get_email_logs(
    period_days: int = 30,
    email_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """
    Get email logs with summary stats, daily volumes, type breakdown,
    and paginated log entries.

    Args:
        period_days: Number of days to include (default 30).
        email_type: Optional filter by email type.
        status_filter: Optional filter by status ("sent" or "failed").
        page: Page number (default 1).
        page_size: Results per page (default 50, max 100).
        admin: Current authenticated admin.
        db: Database session.

    Returns:
        Email log dashboard data.
    """
    from datetime import timedelta
    from app.models.email_log import EmailLog

    page_size = min(page_size, 100)
    now = datetime.utcnow()
    period_start = now - timedelta(days=period_days)

    base = db.query(EmailLog).filter(EmailLog.created_at >= period_start)

    # --- Summary ---
    total_sent = base.filter(EmailLog.status == "sent").count()
    total_failed = base.filter(EmailLog.status == "failed").count()
    total = total_sent + total_failed
    success_rate = round(total_sent / total, 4) if total > 0 else 1.0

    summary = EmailLogSummary(
        total_sent=total_sent,
        total_failed=total_failed,
        success_rate=success_rate,
        period_days=period_days,
    )

    # --- Daily volumes (zero-filled) ---
    raw_daily = db.query(
        cast(EmailLog.created_at, Date),
        EmailLog.status,
        func.count(EmailLog.id),
    ).filter(
        EmailLog.created_at >= period_start,
    ).group_by(cast(EmailLog.created_at, Date), EmailLog.status).all()

    daily_map: dict[str, dict[str, int]] = {}
    for row in raw_daily:
        d = str(row[0])
        if d not in daily_map:
            daily_map[d] = {"sent": 0, "failed": 0}
        daily_map[d][row[1]] = row[2]

    daily_volumes = []
    for i in range(period_days):
        d = (period_start + timedelta(days=i)).date()
        counts = daily_map.get(str(d), {"sent": 0, "failed": 0})
        daily_volumes.append(EmailDailyVolume(
            date=str(d),
            sent=counts.get("sent", 0),
            failed=counts.get("failed", 0),
        ))

    # --- By type ---
    raw_types = db.query(
        EmailLog.email_type,
        EmailLog.status,
        func.count(EmailLog.id),
    ).filter(
        EmailLog.created_at >= period_start,
    ).group_by(EmailLog.email_type, EmailLog.status).all()

    type_map: dict[str, dict[str, int]] = {}
    for row in raw_types:
        t = row[0]
        if t not in type_map:
            type_map[t] = {"sent": 0, "failed": 0}
        type_map[t][row[1]] = row[2]

    by_type = [
        EmailTypeBreakdown(
            email_type=t,
            sent=counts.get("sent", 0),
            failed=counts.get("failed", 0),
        )
        for t, counts in sorted(type_map.items())
    ]

    # --- Paginated logs ---
    log_query = db.query(EmailLog).filter(EmailLog.created_at >= period_start)
    if email_type:
        log_query = log_query.filter(EmailLog.email_type == email_type)
    if status_filter:
        log_query = log_query.filter(EmailLog.status == status_filter)

    total_logs = log_query.count()
    total_pages = (total_logs + page_size - 1) // page_size if page_size > 0 else 0

    log_rows = log_query.order_by(EmailLog.created_at.desc())\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()

    logs = [
        EmailLogEntry(
            id=str(row.id),
            recipient_email=row.recipient_email,
            email_type=row.email_type,
            subject=row.subject,
            status=row.status,
            error_message=row.error_message,
            conversation_id=str(row.conversation_id) if row.conversation_id else None,
            organization_id=str(row.organization_id) if row.organization_id else None,
            user_id=str(row.user_id) if row.user_id else None,
            created_at=row.created_at,
        )
        for row in log_rows
    ]

    # --- Recent failures ---
    raw_failures = db.query(EmailLog).filter(
        EmailLog.status == "failed",
    ).order_by(EmailLog.created_at.desc()).limit(20).all()

    recent_failures = [
        RecentFailure(
            recipient_email=f.recipient_email,
            email_type=f.email_type,
            error_message=f.error_message,
            created_at=f.created_at,
        )
        for f in raw_failures
    ]

    return AdminEmailLogsResponse(
        summary=summary,
        daily_volumes=daily_volumes,
        by_type=by_type,
        logs=logs,
        total_logs=total_logs,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        recent_failures=recent_failures,
    )


# ============================================================
# Audit Log endpoint
# ============================================================

from app.schemas.audit_log import AdminAuditLogResponse, AuditLogEntry


@router.get("/audit-log", response_model=AdminAuditLogResponse)
async def get_audit_log(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """
    Get paginated admin audit log with optional filters.

    Args:
        action: Optional filter by action type.
        entity_type: Optional filter by entity type.
        page: Page number (default 1).
        page_size: Results per page (default 50, max 100).
        admin: Current authenticated admin.
        db: Database session.

    Returns:
        Paginated audit log entries.
    """
    from app.models.audit_log import AuditLog

    page_size = min(page_size, 100)

    base = db.query(AuditLog)

    if action:
        base = base.filter(AuditLog.action == action)
    if entity_type:
        base = base.filter(AuditLog.entity_type == entity_type)

    total = base.count()
    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0

    rows = (
        base.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    logs = [
        AuditLogEntry(
            id=str(row.id),
            admin_id=str(row.admin_id),
            admin_username=row.admin_username,
            action=row.action,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            details=row.details,
            created_at=row.created_at,
        )
        for row in rows
    ]

    return AdminAuditLogResponse(
        logs=logs,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


# ============================================================
# Analytics endpoint
# ============================================================

@router.get("/analytics", response_model=AdminAnalyticsResponse)
async def get_analytics(
    period_days: int = 30,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """
    Get aggregated platform analytics.

    Args:
        period_days: Number of days to include in the period (default 30).
        admin: Current authenticated admin.
        db: Database session.

    Returns:
        Aggregated analytics data.
    """
    from datetime import timedelta

    now = datetime.utcnow()
    period_start = now - timedelta(days=period_days)

    # ---------- totals ----------
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_conversations = db.query(func.count(Conversation.id)).filter(
        Conversation.is_template == False,
    ).scalar() or 0
    total_responses = db.query(func.count(Response.id)).filter(
        Response.status == 'submitted',
    ).scalar() or 0
    total_analyses = db.query(func.count(Analysis.id)).scalar() or 0

    # ---------- period deltas ----------
    period_users = db.query(func.count(User.id)).filter(
        User.created_at >= period_start,
    ).scalar() or 0
    period_conversations = db.query(func.count(Conversation.id)).filter(
        Conversation.is_template == False,
        Conversation.created_at >= period_start,
    ).scalar() or 0
    period_responses = db.query(func.count(Response.id)).filter(
        Response.status == 'submitted',
        Response.submitted_at >= period_start,
    ).scalar() or 0
    period_analyses = db.query(func.count(Analysis.id)).filter(
        Analysis.created_at >= period_start,
    ).scalar() or 0

    # ---------- helper: zero-fill daily series ----------
    def _zero_fill(rows: list, days: int) -> list[DailyCount]:
        counts_map = {str(r[0]): r[1] for r in rows}
        result = []
        for i in range(days):
            d = (period_start + timedelta(days=i)).date()
            result.append(DailyCount(date=str(d), count=counts_map.get(str(d), 0)))
        return result

    # ---------- time series ----------
    raw_signups = db.query(
        cast(User.created_at, Date), func.count(User.id)
    ).filter(
        User.created_at >= period_start,
    ).group_by(cast(User.created_at, Date)).all()

    raw_conversations = db.query(
        cast(Conversation.created_at, Date), func.count(Conversation.id)
    ).filter(
        Conversation.is_template == False,
        Conversation.created_at >= period_start,
    ).group_by(cast(Conversation.created_at, Date)).all()

    raw_responses = db.query(
        cast(Response.submitted_at, Date), func.count(Response.id)
    ).filter(
        Response.status == 'submitted',
        Response.submitted_at >= period_start,
    ).group_by(cast(Response.submitted_at, Date)).all()

    daily_signups = _zero_fill(raw_signups, period_days)
    daily_conversations = _zero_fill(raw_conversations, period_days)
    daily_responses = _zero_fill(raw_responses, period_days)

    # ---------- operational metrics ----------
    # Average responses per conversation (non-template conversations with at least 1 response)
    convs_with_responses = db.query(
        func.count(distinct(Response.conversation_id))
    ).filter(Response.status == 'submitted').scalar() or 0

    avg_responses_per_conversation = (
        total_responses / convs_with_responses if convs_with_responses > 0 else 0.0
    )

    # Average analysis duration
    avg_duration = db.query(
        func.avg(Analysis.analysis_duration_ms)
    ).filter(Analysis.analysis_duration_ms.isnot(None)).scalar()

    # Completion rate: conversations that progressed past active (closed/analyzing/analyzed)
    # out of all non-draft, non-deleted conversations
    non_draft_count = db.query(func.count(Conversation.id)).filter(
        Conversation.is_template == False,
        Conversation.state.notin_(['draft', 'deleted']),
    ).scalar() or 0

    completed_count = db.query(func.count(Conversation.id)).filter(
        Conversation.is_template == False,
        Conversation.state.in_(['closed', 'analyzing', 'analyzed']),
    ).scalar() or 0

    completion_rate = completed_count / non_draft_count if non_draft_count > 0 else 0.0

    # ---------- distributions ----------
    conversations_by_state = [
        ConversationStateCount(state=row[0], count=row[1])
        for row in db.query(Conversation.state, func.count(Conversation.id))
        .filter(Conversation.is_template == False)
        .group_by(Conversation.state).all()
    ]

    subscriptions_by_tier = [
        TierDistribution(tier=row[0], count=row[1])
        for row in db.query(Subscription.tier, func.count(Subscription.id))
        .filter(Subscription.status == 'active')
        .group_by(Subscription.tier).all()
    ]

    conversations_by_anonymity = [
        AnonymityDistribution(anonymity_level=row[0], count=row[1])
        for row in db.query(Conversation.anonymity_level, func.count(Conversation.id))
        .filter(
            Conversation.is_template == False,
            Conversation.anonymity_level.isnot(None),
        )
        .group_by(Conversation.anonymity_level).all()
    ]

    return AdminAnalyticsResponse(
        total_users=total_users,
        total_conversations=total_conversations,
        total_responses=total_responses,
        total_analyses=total_analyses,
        period_users=period_users,
        period_conversations=period_conversations,
        period_responses=period_responses,
        period_analyses=period_analyses,
        daily_signups=daily_signups,
        daily_conversations=daily_conversations,
        daily_responses=daily_responses,
        avg_responses_per_conversation=round(avg_responses_per_conversation, 1),
        avg_analysis_duration_ms=round(avg_duration, 0) if avg_duration else None,
        completion_rate=round(completion_rate, 3),
        conversations_by_state=conversations_by_state,
        subscriptions_by_tier=subscriptions_by_tier,
        conversations_by_anonymity=conversations_by_anonymity,
    )


# Email template types with their required fields
EMAIL_TEMPLATES = {
    "invitation": {
        "name": "Conversation Invitation",
        "description": "Sent when a user is invited to participate in a conversation",
        "fields": ["to_email", "conversation_title", "conversation_description", "inviter_name"],
    },
    "organization_invitation": {
        "name": "Organization Invitation",
        "description": "Sent when a user is invited to join an organization",
        "fields": ["to_email", "organization_name", "organization_description", "inviter_name", "role"],
    },
    "closing_warning": {
        "name": "Closing Soon Warning",
        "description": "Sent 1 hour before a conversation closes to users who haven't responded",
        "fields": ["to_email", "conversation_title", "closes_at"],
    },
    "conversation_closed": {
        "name": "Conversation Closed",
        "description": "Sent when a conversation closes",
        "fields": ["to_email", "conversation_title", "response_count", "is_creator"],
    },
    "analysis_ready": {
        "name": "Analysis Ready",
        "description": "Sent when analysis is complete for a conversation",
        "fields": ["to_email", "conversation_title"],
    },
    "periodic_analysis_ready": {
        "name": "Periodic Analysis Ready",
        "description": "Sent when periodic analysis completes for continuous conversations",
        "fields": ["to_email", "conversation_title", "period_label", "responses_analyzed"],
    },
    "recurring_instance_created": {
        "name": "Recurring Instance Created",
        "description": "Sent when a new recurring conversation instance is created",
        "fields": ["to_email", "conversation_title", "instance_number", "is_creator"],
    },
}


@router.get("/email-templates")
async def list_email_templates(
    admin: Admin = Depends(get_admin),
):
    """
    List all available email templates with their required fields.

    Returns:
        List of email template types
    """
    return [
        {"id": key, **value}
        for key, value in EMAIL_TEMPLATES.items()
    ]


@router.post("/email-templates/preview")
async def preview_email_template(
    template_id: str,
    to_email: str = "test@example.com",
    conversation_title: str = "Weekly Team Feedback",
    conversation_description: Optional[str] = "Share your thoughts on how the team is doing this week.",
    inviter_name: Optional[str] = "John Smith",
    organization_name: Optional[str] = "Acme Corp",
    organization_description: Optional[str] = "A company that makes everything.",
    role: Optional[str] = "member",
    closes_at: Optional[str] = None,
    response_count: int = 12,
    is_creator: bool = True,
    period_label: Optional[str] = "2026-W07",
    responses_analyzed: int = 25,
    instance_number: int = 3,
    admin: Admin = Depends(get_admin),
):
    """
    Generate HTML preview for an email template.

    Args:
        template_id: Email template type to preview
        Various template-specific parameters

    Returns:
        HTML content of the email
    """
    from datetime import datetime, timedelta
    from app.services.email_service import email_service
    from app.core.config import settings

    if template_id not in EMAIL_TEMPLATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown template: {template_id}"
        )

    # Generate sample URLs
    access_code = "SAMPLE123"
    sample_url = f"{settings.FRONTEND_URL}/respond/{access_code}"
    results_url = f"{settings.FRONTEND_URL}/analysis/sample-id"

    # Parse closes_at or use default (1 hour from now)
    if closes_at:
        try:
            closes_at_dt = datetime.fromisoformat(closes_at.replace('Z', '+00:00'))
        except ValueError:
            closes_at_dt = datetime.utcnow() + timedelta(hours=1)
    else:
        closes_at_dt = datetime.utcnow() + timedelta(hours=1)

    # Generate HTML based on template type
    # We'll call the email service methods but extract just the HTML
    try:
        if template_id == "invitation":
            html = _generate_invitation_html(
                conversation_title=conversation_title,
                conversation_description=conversation_description,
                inviter_name=inviter_name,
                invite_link=sample_url,
            )
        elif template_id == "organization_invitation":
            html = _generate_org_invitation_html(
                organization_name=organization_name,
                organization_description=organization_description,
                inviter_name=inviter_name,
                role=role,
                accept_url=f"{settings.FRONTEND_URL}/organizations/accept-invite/sample-token",
            )
        elif template_id == "closing_warning":
            html = _generate_closing_warning_html(
                conversation_title=conversation_title,
                closes_at=closes_at_dt,
                respond_url=sample_url,
            )
        elif template_id == "conversation_closed":
            html = _generate_conversation_closed_html(
                conversation_title=conversation_title,
                response_count=response_count,
                results_url=results_url,
                is_creator=is_creator,
            )
        elif template_id == "analysis_ready":
            html = _generate_analysis_ready_html(
                conversation_title=conversation_title,
                results_url=results_url,
            )
        elif template_id == "periodic_analysis_ready":
            html = _generate_periodic_analysis_html(
                conversation_title=conversation_title,
                period_label=period_label,
                results_url=results_url,
                responses_analyzed=responses_analyzed,
            )
        elif template_id == "recurring_instance_created":
            html = _generate_recurring_instance_html(
                conversation_title=conversation_title,
                instance_number=instance_number,
                join_url=sample_url,
                is_creator=is_creator,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Template {template_id} not implemented"
            )

        return {"html": html, "template_id": template_id}

    except Exception as e:
        logger.error(f"Failed to generate email preview: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate preview: {str(e)}"
        )


@router.post("/email-templates/send-test")
async def send_test_email(
    template_id: str,
    to_email: str,
    conversation_title: str = "Weekly Team Feedback",
    conversation_description: Optional[str] = "Share your thoughts on how the team is doing this week.",
    inviter_name: Optional[str] = "John Smith",
    organization_name: Optional[str] = "Acme Corp",
    organization_description: Optional[str] = "A company that makes everything.",
    role: Optional[str] = "member",
    closes_at: Optional[str] = None,
    response_count: int = 12,
    is_creator: bool = True,
    period_label: Optional[str] = "2026-W07",
    responses_analyzed: int = 25,
    instance_number: int = 3,
    admin: Admin = Depends(get_admin),
):
    """
    Send a test email using a specific template.

    Args:
        template_id: Email template type to send
        to_email: Recipient email address
        Various template-specific parameters

    Returns:
        Success response
    """
    from datetime import datetime, timedelta
    from app.services.email_service import email_service
    from app.core.config import settings

    if template_id not in EMAIL_TEMPLATES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown template: {template_id}"
        )

    # Generate sample URLs
    access_code = "TEST123"
    sample_url = f"{settings.FRONTEND_URL}/respond/{access_code}"
    results_url = f"{settings.FRONTEND_URL}/analysis/test-id"

    # Parse closes_at or use default
    if closes_at:
        try:
            closes_at_dt = datetime.fromisoformat(closes_at.replace('Z', '+00:00'))
        except ValueError:
            closes_at_dt = datetime.utcnow() + timedelta(hours=1)
    else:
        closes_at_dt = datetime.utcnow() + timedelta(hours=1)

    try:
        success = False

        if template_id == "invitation":
            success = await email_service.send_invitation_email(
                to_email=to_email,
                conversation_title=conversation_title,
                conversation_description=conversation_description,
                access_code=access_code,
                invitation_token="test-token",
                inviter_name=inviter_name,
            )
        elif template_id == "organization_invitation":
            success = await email_service.send_organization_invitation_email(
                to_email=to_email,
                organization_name=organization_name,
                organization_description=organization_description,
                invitation_token="test-org-token",
                inviter_name=inviter_name,
                role=role,
            )
        elif template_id == "closing_warning":
            success = await email_service.send_closing_warning_email(
                to_email=to_email,
                conversation_title=conversation_title,
                closes_at=closes_at_dt,
                respond_url=sample_url,
            )
        elif template_id == "conversation_closed":
            success = await email_service.send_conversation_closed_email(
                to_email=to_email,
                conversation_title=conversation_title,
                response_count=response_count,
                results_url=results_url,
                is_creator=is_creator,
            )
        elif template_id == "analysis_ready":
            success = await email_service.send_analysis_ready_email(
                to_email=to_email,
                conversation_title=conversation_title,
                results_url=results_url,
            )
        elif template_id == "periodic_analysis_ready":
            success = await email_service.send_periodic_analysis_ready_email(
                to_email=to_email,
                conversation_title=conversation_title,
                period_label=period_label,
                results_url=results_url,
                responses_analyzed=responses_analyzed,
            )
        elif template_id == "recurring_instance_created":
            success = await email_service.send_recurring_instance_created_email(
                to_email=to_email,
                conversation_title=conversation_title,
                instance_number=instance_number,
                join_url=sample_url,
                is_creator=is_creator,
            )

        if success:
            log_audit(
                admin_id=admin.id,
                admin_username=admin.username,
                action="send_test_email",
                entity_type="email_template",
                entity_id=template_id,
                details={"to_email": to_email},
            )
            return {"success": True, "message": f"Test email sent to {to_email}"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email - check email service configuration"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to send test email: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test email: {str(e)}"
        )


# Scheduler monitoring endpoints

# Job definitions for UI display
SCHEDULER_JOBS = {
    'check_activations': {'display_name': 'Scheduled Activations', 'interval_minutes': 1},
    'check_closures': {'display_name': 'Scheduled Closures', 'interval_minutes': 1},
    'create_recurring_instances': {'display_name': 'Recurring Instances', 'interval_minutes': 15},
    'check_periodic_analyses': {'display_name': 'Periodic Analyses', 'interval_minutes': 15},
    'check_closing_warnings': {'display_name': 'Closing Warnings', 'interval_minutes': 15},
    'check_scheduled_reminders': {'display_name': 'Scheduled Reminders', 'interval_minutes': 5},
    'cleanup_job_logs': {'display_name': 'Log Cleanup', 'interval_minutes': 1440},  # 24 hours
}


@router.get("/scheduler/status", response_model=SchedulerStatusResponse)
async def get_scheduler_status(
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    Get current scheduler status and recent activity summary.

    Returns the scheduler running state and summary statistics for each job.
    """
    from datetime import datetime, timedelta
    from sqlalchemy import desc, func
    from app.services.scheduler_service import scheduler
    from app.models.scheduler_job_log import SchedulerJobLog

    jobs_summary = []
    now = datetime.utcnow()
    lookback = now - timedelta(hours=24)  # Last 24 hours for stats

    for job_id, job_info in SCHEDULER_JOBS.items():
        # Get job from scheduler
        apscheduler_job = scheduler.get_job(job_id) if scheduler.running else None
        next_run = apscheduler_job.next_run_time.replace(tzinfo=None) if apscheduler_job and apscheduler_job.next_run_time else None

        # Get last completed log
        last_log = db.query(SchedulerJobLog).filter(
            SchedulerJobLog.job_name == job_id,
            SchedulerJobLog.status.in_(['completed', 'failed'])
        ).order_by(desc(SchedulerJobLog.started_at)).first()

        # Get recent logs for stats (last 24 hours)
        recent_logs = db.query(SchedulerJobLog).filter(
            SchedulerJobLog.job_name == job_id,
            SchedulerJobLog.started_at >= lookback,
            SchedulerJobLog.status.in_(['completed', 'failed'])
        ).all()

        success_count = sum(1 for log in recent_logs if log.status == 'completed')
        failure_count = sum(1 for log in recent_logs if log.status == 'failed')

        # Calculate health status
        if not recent_logs:
            health = 'unknown'
        elif failure_count == 0:
            health = 'healthy'
        elif failure_count <= 2:
            health = 'warning'
        else:
            health = 'error'

        # Average duration of successful runs
        completed_logs = [log for log in recent_logs if log.status == 'completed' and log.duration_ms]
        avg_duration = int(sum(log.duration_ms for log in completed_logs) / len(completed_logs)) if completed_logs else None

        jobs_summary.append(SchedulerJobSummary(
            job_name=job_id,
            display_name=job_info['display_name'],
            interval_minutes=job_info['interval_minutes'],
            last_run_at=last_log.started_at if last_log else None,
            last_status=last_log.status if last_log else None,
            last_duration_ms=last_log.duration_ms if last_log else None,
            next_run_at=next_run,
            recent_success_count=success_count,
            recent_failure_count=failure_count,
            avg_duration_ms=avg_duration,
            health_status=health,
        ))

    return SchedulerStatusResponse(
        scheduler_running=scheduler.running,
        jobs=jobs_summary,
        last_checked_at=now,
    )


@router.get("/scheduler/logs", response_model=SchedulerLogsResponse)
async def get_scheduler_logs(
    job_name: Optional[str] = None,
    status: Optional[str] = None,
    page: int = 1,
    page_size: int = 50,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    Get paginated scheduler job logs with optional filtering.

    Args:
        job_name: Filter by job name (e.g., 'check_activations')
        status: Filter by status ('started', 'completed', 'failed')
        page: Page number (default 1)
        page_size: Results per page (default 50, max 100)
    """
    from sqlalchemy import desc
    from app.models.scheduler_job_log import SchedulerJobLog

    # Limit page size
    page_size = min(page_size, 100)

    query = db.query(SchedulerJobLog)

    if job_name:
        query = query.filter(SchedulerJobLog.job_name == job_name)
    if status:
        query = query.filter(SchedulerJobLog.status == status)

    total = query.count()
    logs = query.order_by(desc(SchedulerJobLog.started_at))\
        .offset((page - 1) * page_size)\
        .limit(page_size)\
        .all()

    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0

    return SchedulerLogsResponse(
        logs=[SchedulerJobLogInfo.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.delete("/scheduler/logs", response_model=SchedulerLogsCleanupResponse)
async def cleanup_scheduler_logs(
    days_to_keep: int = 7,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db)
):
    """
    Delete old scheduler logs.

    Args:
        days_to_keep: Number of days of logs to retain (default 7)
    """
    from datetime import datetime, timedelta
    from app.models.scheduler_job_log import SchedulerJobLog

    # Minimum 1 day retention
    days_to_keep = max(days_to_keep, 1)

    cutoff = datetime.utcnow() - timedelta(days=days_to_keep)
    deleted = db.query(SchedulerJobLog).filter(
        SchedulerJobLog.started_at < cutoff
    ).delete()
    db.commit()

    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="cleanup_scheduler_logs",
        entity_type="scheduler_log",
        details={"days_to_keep": days_to_keep, "deleted_count": deleted},
    )

    return SchedulerLogsCleanupResponse(
        success=True,
        deleted_count=deleted,
        message=f"Deleted {deleted} log entries older than {days_to_keep} days",
    )


# Helper functions to generate HTML for each template type
def _generate_invitation_html(conversation_title, conversation_description, inviter_name, invite_link):
    from app.core.config import settings
    inviter_text = f" by {inviter_name}" if inviter_name else ""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                    <table cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="vertical-align: middle; padding-right: 10px;">
                            <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                            </div>
                        </td>
                        <td style="vertical-align: middle;">
                            <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                        </td>
                    </tr></table>
                </a>
            </div>
            <div style="padding: 30px 20px;">
                <h2 style="color: #1a1a2e; margin-top: 0;">You're Invited!</h2>
                <p style="color: #6b7280; font-size: 16px;">You've been invited{inviter_text} to participate in a conversation:</p>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{conversation_title}</h3>
                    {f'<p style="color: #6b7280; margin-bottom: 0;">{conversation_description}</p>' if conversation_description else ''}
                </div>
                <p style="color: #6b7280; font-size: 16px;">Click the button below to join the conversation:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{invite_link}" style="background-color: #1a1a2e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Respond to Conversation</a>
                </div>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;"><strong>Or copy and paste this link into your browser:</strong></p>
                    <p style="color: #2563eb; font-size: 14px; margin: 0; word-break: break-all;">{invite_link}</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


def _generate_org_invitation_html(organization_name, organization_description, inviter_name, role, accept_url):
    from app.core.config import settings
    inviter_text = f" by {inviter_name}" if inviter_name else ""
    role_display = "Admin" if role == "admin" else "Member"
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                    <table cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="vertical-align: middle; padding-right: 10px;">
                            <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                            </div>
                        </td>
                        <td style="vertical-align: middle;">
                            <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                        </td>
                    </tr></table>
                </a>
            </div>
            <div style="padding: 30px 20px;">
                <h2 style="color: #1a1a2e; margin-top: 0;">Organization Invitation</h2>
                <p style="color: #6b7280; font-size: 16px;">You've been invited{inviter_text} to join an organization on Mosaic:</p>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{organization_name}</h3>
                    {f'<p style="color: #6b7280; margin-bottom: 10px;">{organization_description}</p>' if organization_description else ''}
                    <p style="color: #6b7280; font-size: 14px; margin: 0;">
                        <strong>Role:</strong> <span style="background-color: #f3f4f6; color: #1a1a2e; padding: 4px 8px; border-radius: 4px; font-size: 13px;">{role_display}</span>
                    </p>
                </div>
                <p style="color: #6b7280; font-size: 16px;">Click the button below to accept the invitation:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{accept_url}" style="background-color: #1a1a2e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Accept Invitation</a>
                </div>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;"><strong>Or copy and paste this link into your browser:</strong></p>
                    <p style="color: #2563eb; font-size: 14px; margin: 0; word-break: break-all;">{accept_url}</p>
                </div>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">If you did not expect this invitation, you can safely ignore this email.</p>
            </div>
        </div>
    </body>
    </html>
    """


def _generate_closing_warning_html(conversation_title, closes_at, respond_url):
    from app.core.config import settings
    closes_at_formatted = closes_at.strftime("%B %d, %Y at %I:%M %p UTC")
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                    <table cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="vertical-align: middle; padding-right: 10px;">
                            <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                            </div>
                        </td>
                        <td style="vertical-align: middle;">
                            <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                        </td>
                    </tr></table>
                </a>
            </div>
            <div style="padding: 30px 20px;">
                <h2 style="color: #1a1a2e; margin-top: 0;">Reminder: Closing Soon</h2>
                <p style="color: #6b7280; font-size: 16px;">The following conversation is closing soon and we haven't received your response yet:</p>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{conversation_title}</h3>
                    <p style="color: #6b7280; margin-bottom: 0;"><strong>Closes:</strong> {closes_at_formatted}</p>
                </div>
                <p style="color: #6b7280; font-size: 16px;">Please submit your response before the deadline:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{respond_url}" style="background-color: #1a1a2e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Respond Now</a>
                </div>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;"><strong>Or copy and paste this link into your browser:</strong></p>
                    <p style="color: #2563eb; font-size: 14px; margin: 0; word-break: break-all;">{respond_url}</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


def _generate_conversation_closed_html(conversation_title, response_count, results_url, is_creator):
    from app.core.config import settings
    if is_creator:
        intro_text = "Your conversation has closed and feedback collection is complete."
        response_text = f"<strong>{response_count}</strong> response{'s' if response_count != 1 else ''} received"
    else:
        intro_text = "The following conversation has closed."
        response_text = ""

    results_section = ""
    if results_url and is_creator:
        results_section = f"""
            <p style="color: #6b7280; font-size: 16px;">You can now run the analysis to discover insights:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{results_url}" style="background-color: #1a1a2e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">View Conversation</a>
            </div>
        """

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                    <table cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="vertical-align: middle; padding-right: 10px;">
                            <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                            </div>
                        </td>
                        <td style="vertical-align: middle;">
                            <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                        </td>
                    </tr></table>
                </a>
            </div>
            <div style="padding: 30px 20px;">
                <h2 style="color: #1a1a2e; margin-top: 0;">Conversation Closed</h2>
                <p style="color: #6b7280; font-size: 16px;">{intro_text}</p>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{conversation_title}</h3>
                    {f'<p style="color: #6b7280; margin-bottom: 0;">{response_text}</p>' if response_text else ''}
                </div>
                {results_section}
            </div>
        </div>
    </body>
    </html>
    """


def _generate_analysis_ready_html(conversation_title, results_url):
    from app.core.config import settings
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                    <table cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="vertical-align: middle; padding-right: 10px;">
                            <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                            </div>
                        </td>
                        <td style="vertical-align: middle;">
                            <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                        </td>
                    </tr></table>
                </a>
            </div>
            <div style="padding: 30px 20px;">
                <h2 style="color: #1a1a2e; margin-top: 0;">Analysis Complete!</h2>
                <p style="color: #6b7280; font-size: 16px;">The analysis for your conversation is now ready to view:</p>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{conversation_title}</h3>
                    <p style="color: #6b7280; margin-bottom: 0;">Themes, insights, and patterns have been identified.</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{results_url}" style="background-color: #1a1a2e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">View Analysis</a>
                </div>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;"><strong>Or copy and paste this link into your browser:</strong></p>
                    <p style="color: #2563eb; font-size: 14px; margin: 0; word-break: break-all;">{results_url}</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


def _generate_periodic_analysis_html(conversation_title, period_label, results_url, responses_analyzed):
    from app.core.config import settings
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                    <table cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="vertical-align: middle; padding-right: 10px;">
                            <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                            </div>
                        </td>
                        <td style="vertical-align: middle;">
                            <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                        </td>
                    </tr></table>
                </a>
            </div>
            <div style="padding: 30px 20px;">
                <h2 style="color: #1a1a2e; margin-top: 0;">New Periodic Insights</h2>
                <p style="color: #6b7280; font-size: 16px;">A new analysis period has completed for your continuous feedback conversation:</p>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{conversation_title}</h3>
                    <p style="color: #6b7280; margin-bottom: 5px;"><strong>Period:</strong> {period_label}</p>
                    <p style="color: #6b7280; margin-bottom: 0;"><strong>Responses analyzed:</strong> {responses_analyzed}</p>
                </div>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{results_url}" style="background-color: #1a1a2e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">View Insights</a>
                </div>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;"><strong>Or copy and paste this link into your browser:</strong></p>
                    <p style="color: #2563eb; font-size: 14px; margin: 0; word-break: break-all;">{results_url}</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


def _generate_recurring_instance_html(conversation_title, instance_number, join_url, is_creator):
    from app.core.config import settings
    if is_creator:
        intro_text = f"A new instance of your recurring conversation has been created (Round #{instance_number})."
        action_text = "Review and activate the conversation:"
        button_text = "Review Conversation"
    else:
        intro_text = f"A new round of feedback collection has started (Round #{instance_number})."
        action_text = "You're invited to participate:"
        button_text = "Respond to Conversation"

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <div style="background-color: white; border-bottom: 1px solid #e5e7eb; padding: 16px 32px;">
                <a href="{settings.FRONTEND_URL}" style="text-decoration: none; color: inherit;">
                    <table cellpadding="0" cellspacing="0" border="0"><tr>
                        <td style="vertical-align: middle; padding-right: 10px;">
                            <div style="width: 28px; height: 28px; background-color: #1a1a2e; border-radius: 4px; text-align: center; line-height: 28px;">
                                <span style="color: white; font-size: 16px; font-weight: bold; font-family: Arial, sans-serif;">M</span>
                            </div>
                        </td>
                        <td style="vertical-align: middle;">
                            <span style="font-size: 24px; font-weight: 600; color: #1a1a2e; letter-spacing: -0.02em; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Mosaic</span>
                        </td>
                    </tr></table>
                </a>
            </div>
            <div style="padding: 30px 20px;">
                <h2 style="color: #1a1a2e; margin-top: 0;">New Round Started</h2>
                <p style="color: #6b7280; font-size: 16px;">{intro_text}</p>
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #1a1a2e; font-size: 20px;">{conversation_title}</h3>
                    <p style="color: #6b7280; margin-bottom: 0;">Round #{instance_number}</p>
                </div>
                <p style="color: #6b7280; font-size: 16px;">{action_text}</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{join_url}" style="background-color: #1a1a2e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">{button_text}</a>
                </div>
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;"><strong>Or copy and paste this link into your browser:</strong></p>
                    <p style="color: #2563eb; font-size: 14px; margin: 0; word-break: break-all;">{join_url}</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """


# ============================================================
# Journal Template CRUD (admin only)
# ============================================================

from app.schemas.journal import (
    JournalTemplateResponse,
    JournalTemplateCreate,
    JournalTemplateUpdate,
    JournalTemplatePrompt,
)


@router.get("/journal-templates", response_model=List[JournalTemplateResponse])
async def admin_list_journal_templates(
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """List all journal templates (including inactive), ordered by display_order."""
    templates = db.query(JournalTemplate).order_by(
        JournalTemplate.display_order
    ).all()

    return [
        JournalTemplateResponse(
            id=t.id,
            title=t.title,
            emoji=t.emoji,
            description=t.description,
            prompts=[JournalTemplatePrompt(**p) for p in (t.prompts or [])],
            entry_frequency=t.entry_frequency,
            analysis_interval=t.analysis_interval,
            strict_frequency=t.strict_frequency,
            display_order=t.display_order,
            is_active=t.is_active,
            created_at=t.created_at,
            updated_at=t.updated_at,
        )
        for t in templates
    ]


@router.get("/journal-templates/{template_id}", response_model=JournalTemplateResponse)
async def admin_get_journal_template(
    template_id: UUID,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Get a single journal template by ID."""
    t = db.query(JournalTemplate).filter(JournalTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    return JournalTemplateResponse(
        id=t.id,
        title=t.title,
        emoji=t.emoji,
        description=t.description,
        prompts=[JournalTemplatePrompt(**p) for p in (t.prompts or [])],
        entry_frequency=t.entry_frequency,
        analysis_interval=t.analysis_interval,
        strict_frequency=t.strict_frequency,
        display_order=t.display_order,
        is_active=t.is_active,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


@router.post("/journal-templates", response_model=JournalTemplateResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_journal_template(
    data: JournalTemplateCreate,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Create a new journal template."""
    VALID_FREQUENCIES = {"daily", "weekly", "biweekly", "monthly"}
    VALID_INTERVALS = {"daily", "weekly", "biweekly", "monthly"}

    if data.entry_frequency and data.entry_frequency not in VALID_FREQUENCIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid entry_frequency: {data.entry_frequency}",
        )
    if data.analysis_interval not in VALID_INTERVALS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid analysis_interval: {data.analysis_interval}",
        )

    t = JournalTemplate(
        title=data.title,
        emoji=data.emoji,
        description=data.description,
        prompts=[p.model_dump() for p in data.prompts],
        entry_frequency=data.entry_frequency,
        analysis_interval=data.analysis_interval,
        strict_frequency=data.strict_frequency,
        display_order=data.display_order,
        is_active=data.is_active,
    )
    db.add(t)
    db.commit()
    db.refresh(t)

    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="create_journal_template",
        entity_type="journal_template",
        entity_id=str(t.id),
        details={"title": t.title},
    )

    return JournalTemplateResponse(
        id=t.id,
        title=t.title,
        emoji=t.emoji,
        description=t.description,
        prompts=[JournalTemplatePrompt(**p) for p in (t.prompts or [])],
        entry_frequency=t.entry_frequency,
        analysis_interval=t.analysis_interval,
        strict_frequency=t.strict_frequency,
        display_order=t.display_order,
        is_active=t.is_active,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


@router.patch("/journal-templates/{template_id}", response_model=JournalTemplateResponse)
async def admin_update_journal_template(
    template_id: UUID,
    data: JournalTemplateUpdate,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Update a journal template."""
    t = db.query(JournalTemplate).filter(JournalTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    VALID_FREQUENCIES = {"daily", "weekly", "biweekly", "monthly"}
    VALID_INTERVALS = {"daily", "weekly", "biweekly", "monthly"}

    update_data = data.model_dump(exclude_unset=True)

    if "entry_frequency" in update_data and update_data["entry_frequency"] is not None:
        if update_data["entry_frequency"] not in VALID_FREQUENCIES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid entry_frequency: {update_data['entry_frequency']}",
            )

    if "analysis_interval" in update_data and update_data["analysis_interval"] is not None:
        if update_data["analysis_interval"] not in VALID_INTERVALS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid analysis_interval: {update_data['analysis_interval']}",
            )

    for field, value in update_data.items():
        if field == "prompts" and value is not None:
            setattr(t, field, [p.model_dump() if hasattr(p, 'model_dump') else p for p in value])
        else:
            setattr(t, field, value)

    t.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(t)

    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="update_journal_template",
        entity_type="journal_template",
        entity_id=str(template_id),
        details={"changes": update_data},
    )

    return JournalTemplateResponse(
        id=t.id,
        title=t.title,
        emoji=t.emoji,
        description=t.description,
        prompts=[JournalTemplatePrompt(**p) for p in (t.prompts or [])],
        entry_frequency=t.entry_frequency,
        analysis_interval=t.analysis_interval,
        strict_frequency=t.strict_frequency,
        display_order=t.display_order,
        is_active=t.is_active,
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


@router.delete("/journal-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def admin_delete_journal_template(
    template_id: UUID,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Hard delete a journal template."""
    t = db.query(JournalTemplate).filter(JournalTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")

    template_title = t.title
    db.delete(t)
    db.commit()

    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="delete_journal_template",
        entity_type="journal_template",
        entity_id=str(template_id),
        details={"title": template_title},
    )


# ─── Space Export / Import ────────────────────────────────────────────

def _serialize_space(space: Space, db: Session) -> dict:
    """Build a complete JSON-serializable dict for a space and all its data."""
    ideas = db.query(Idea).filter(Idea.space_id == space.id).order_by(Idea.created_at).all()
    themes = db.query(Theme).filter(Theme.space_id == space.id).order_by(Theme.created_at).all()

    # Build id->index maps for stable references in the export
    idea_id_map = {str(idea.id): idx for idx, idea in enumerate(ideas)}
    theme_id_map = {str(theme.id): idx for idx, theme in enumerate(themes)}

    # idea-theme assignments
    idea_themes = (
        db.query(IdeaTheme)
        .filter(IdeaTheme.idea_id.in_([i.id for i in ideas]))
        .all()
    ) if ideas else []

    # theme connections
    connections = db.query(ThemeConnection).filter(ThemeConnection.space_id == space.id).all()

    # syntheses (all, including history)
    syntheses = (
        db.query(SpaceSynthesis)
        .filter(SpaceSynthesis.space_id == space.id)
        .order_by(SpaceSynthesis.created_at)
        .all()
    )

    # synthesis actions
    synthesis_actions = (
        db.query(SynthesisAction)
        .filter(SynthesisAction.space_id == space.id)
        .order_by(SynthesisAction.created_at)
        .all()
    )

    # snapshots
    snapshots = (
        db.query(SpaceSnapshot)
        .filter(SpaceSnapshot.space_id == space.id)
        .order_by(SpaceSnapshot.created_at)
        .all()
    )

    # activity log
    activity_logs = (
        db.query(SpaceActivityLog)
        .filter(SpaceActivityLog.space_id == space.id)
        .order_by(SpaceActivityLog.created_at)
        .all()
    )

    # theme events
    theme_events = (
        db.query(ThemeEvent)
        .filter(ThemeEvent.space_id == space.id)
        .order_by(ThemeEvent.created_at)
        .all()
    )

    # owner info for reference
    owner = db.query(User).filter(User.id == space.owner_id).first()
    workspace = db.query(Workspace).filter(Workspace.id == space.workspace_id).first() if space.workspace_id else None

    return {
        "export_version": 1,
        "exported_at": datetime.utcnow().isoformat(),
        "space": {
            "title": space.title,
            "description": space.description,
            "settings": space.settings,
            "auto_organize": space.auto_organize,
            "clustering_mode": space.clustering_mode,
            "share_access": space.share_access,
            "last_organized_at": space.last_organized_at.isoformat() if space.last_organized_at else None,
            "ideas_at_last_organize": space.ideas_at_last_organize,
            "created_at": space.created_at.isoformat(),
            "updated_at": space.updated_at.isoformat(),
            "owner_email": owner.email if owner else None,
            "workspace_name": workspace.name if workspace else None,
        },
        "ideas": [
            {
                "ref": idx,
                "text": idea.text,
                "image_url": idea.image_url,
                "status": idea.status,
                "created_at": idea.created_at.isoformat(),
                "updated_at": idea.updated_at.isoformat(),
            }
            for idx, idea in enumerate(ideas)
        ],
        "themes": [
            {
                "ref": idx,
                "name": theme.name,
                "summary": theme.summary,
                "color": theme.color,
                "is_ai_generated": theme.is_ai_generated,
                "created_at": theme.created_at.isoformat(),
                "updated_at": theme.updated_at.isoformat(),
            }
            for idx, theme in enumerate(themes)
        ],
        "idea_theme_assignments": [
            {
                "idea_ref": idea_id_map.get(str(it.idea_id)),
                "theme_ref": theme_id_map.get(str(it.theme_id)),
                "confidence": it.confidence,
                "assigned_by": it.assigned_by,
                "created_at": it.created_at.isoformat(),
            }
            for it in idea_themes
            if idea_id_map.get(str(it.idea_id)) is not None and theme_id_map.get(str(it.theme_id)) is not None
        ],
        "theme_connections": [
            {
                "theme_a_ref": theme_id_map.get(str(c.theme_a_id)),
                "theme_b_ref": theme_id_map.get(str(c.theme_b_id)),
                "strength": c.strength,
                "description": c.description,
                "created_at": c.created_at.isoformat(),
            }
            for c in connections
            if theme_id_map.get(str(c.theme_a_id)) is not None and theme_id_map.get(str(c.theme_b_id)) is not None
        ],
        "syntheses": [
            {
                "purpose": s.purpose,
                "space_summary": s.space_summary,
                "theme_notes": s.theme_notes,
                "note_states": s.note_states,
                "dismiss_reasons": s.dismiss_reasons,
                "completion_outcomes": s.completion_outcomes,
                "completion_outcome_images": s.completion_outcome_images,
                "expanded_summary": getattr(s, "expanded_summary", None),
                "expanded_theme_notes": getattr(s, "expanded_theme_notes", None),
                "is_current": s.is_current,
                "generated_at": s.generated_at.isoformat() if s.generated_at else None,
                "created_at": s.created_at.isoformat(),
            }
            for s in syntheses
        ],
        "synthesis_actions": [
            {
                "theme_name": sa.theme_name,
                "note_text": sa.note_text,
                "action": sa.action,
                "detail": sa.detail,
                "created_at": sa.created_at.isoformat(),
            }
            for sa in synthesis_actions
        ],
        "snapshots": [
            {
                "title": snap.title,
                "snapshot_type": snap.snapshot_type,
                "snapshot_data": snap.snapshot_data,
                "created_at": snap.created_at.isoformat(),
            }
            for snap in snapshots
        ],
        "activity_log": [
            {
                "user_name": log.user_name,
                "event_type": log.event_type,
                "detail": log.detail,
                "created_at": log.created_at.isoformat(),
            }
            for log in activity_logs
        ],
        "theme_events": [
            {
                "organize_run_id": str(te.organize_run_id),
                "event_type": te.event_type,
                "theme_name": te.theme_name,
                "theme_color": te.theme_color,
                "details": te.details,
                "created_at": te.created_at.isoformat(),
            }
            for te in theme_events
        ],
    }


@router.get("/spaces/{space_id}/export")
async def admin_export_space(
    space_id: UUID,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Export all data for a space as JSON."""
    space = db.query(Space).filter(Space.id == space_id).first()
    if not space:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Space not found")

    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="export_space",
        entity_type="space",
        entity_id=str(space_id),
        details={"title": space.title},
    )

    return _serialize_space(space, db)


@router.post("/spaces/import")
async def admin_import_space(
    payload: dict,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Import a space from previously-exported JSON. Generates new UUIDs for all entities.

    Requires `target_owner_email` in the payload to assign ownership.
    Optionally accepts `target_workspace_id` to place the space in a specific workspace.
    """
    if payload.get("export_version") != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported or missing export_version. Expected 1.",
        )

    space_data = payload.get("space")
    if not space_data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing 'space' in payload")

    # Resolve owner
    target_email = payload.get("target_owner_email") or space_data.get("owner_email")
    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_owner_email is required",
        )
    owner = db.query(User).filter(func.lower(User.email) == target_email.lower().strip()).first()
    if not owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No user found with email: {target_email}",
        )

    # Resolve workspace
    target_workspace_id = payload.get("target_workspace_id")
    if target_workspace_id:
        workspace = db.query(Workspace).filter(Workspace.id == uuid.UUID(target_workspace_id)).first()
        if not workspace:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Workspace not found")
        workspace_id = workspace.id
    else:
        # Use owner's personal workspace
        workspace = db.query(Workspace).filter(
            Workspace.owner_id == owner.id,
            Workspace.type == "personal",
        ).first()
        if not workspace:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Owner has no personal workspace. Provide target_workspace_id.",
            )
        workspace_id = workspace.id

    try:
        # Create space
        new_space = Space(
            id=uuid.uuid4(),
            title=space_data.get("title", "Imported Space"),
            description=space_data.get("description"),
            owner_id=owner.id,
            organization_id=None,
            workspace_id=workspace_id,
            settings=space_data.get("settings"),
            auto_organize=space_data.get("auto_organize", True),
            clustering_mode=space_data.get("clustering_mode", "llm"),
            share_access=space_data.get("share_access"),
            last_organized_at=datetime.fromisoformat(space_data["last_organized_at"]) if space_data.get("last_organized_at") else None,
            ideas_at_last_organize=space_data.get("ideas_at_last_organize"),
            created_at=datetime.fromisoformat(space_data["created_at"]) if space_data.get("created_at") else datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(new_space)
        db.flush()

        # Create owner as space member
        db.add(SpaceMember(
            id=uuid.uuid4(),
            space_id=new_space.id,
            user_id=owner.id,
            role="owner",
        ))

        # Import ideas — map ref index to new UUID
        idea_ref_to_id = {}
        for idea_data in payload.get("ideas", []):
            idea_id = uuid.uuid4()
            idea_ref_to_id[idea_data["ref"]] = idea_id
            db.add(Idea(
                id=idea_id,
                space_id=new_space.id,
                author_id=owner.id,
                text=idea_data["text"],
                image_url=idea_data.get("image_url"),
                status=idea_data.get("status", "active"),
                created_at=datetime.fromisoformat(idea_data["created_at"]) if idea_data.get("created_at") else datetime.utcnow(),
                updated_at=datetime.fromisoformat(idea_data["updated_at"]) if idea_data.get("updated_at") else datetime.utcnow(),
            ))

        # Import themes — map ref index to new UUID
        theme_ref_to_id = {}
        for theme_data in payload.get("themes", []):
            theme_id = uuid.uuid4()
            theme_ref_to_id[theme_data["ref"]] = theme_id
            db.add(Theme(
                id=theme_id,
                space_id=new_space.id,
                name=theme_data["name"],
                summary=theme_data.get("summary"),
                color=theme_data.get("color"),
                is_ai_generated=theme_data.get("is_ai_generated", True),
                created_at=datetime.fromisoformat(theme_data["created_at"]) if theme_data.get("created_at") else datetime.utcnow(),
                updated_at=datetime.fromisoformat(theme_data["updated_at"]) if theme_data.get("updated_at") else datetime.utcnow(),
            ))

        db.flush()  # ensure themes/ideas are persisted before references

        # Import idea-theme assignments
        for assignment in payload.get("idea_theme_assignments", []):
            idea_id = idea_ref_to_id.get(assignment.get("idea_ref"))
            theme_id = theme_ref_to_id.get(assignment.get("theme_ref"))
            if idea_id and theme_id:
                db.add(IdeaTheme(
                    id=uuid.uuid4(),
                    idea_id=idea_id,
                    theme_id=theme_id,
                    confidence=assignment.get("confidence", 1.0),
                    assigned_by=assignment.get("assigned_by", "ai"),
                    created_at=datetime.fromisoformat(assignment["created_at"]) if assignment.get("created_at") else datetime.utcnow(),
                ))

        # Import theme connections
        for conn in payload.get("theme_connections", []):
            a_id = theme_ref_to_id.get(conn.get("theme_a_ref"))
            b_id = theme_ref_to_id.get(conn.get("theme_b_ref"))
            if a_id and b_id:
                # Ensure ordered constraint
                if str(a_id) > str(b_id):
                    a_id, b_id = b_id, a_id
                db.add(ThemeConnection(
                    id=uuid.uuid4(),
                    space_id=new_space.id,
                    theme_a_id=a_id,
                    theme_b_id=b_id,
                    strength=conn.get("strength", 0.0),
                    description=conn.get("description"),
                    created_at=datetime.fromisoformat(conn["created_at"]) if conn.get("created_at") else datetime.utcnow(),
                ))

        # Import syntheses
        _has_expanded = hasattr(SpaceSynthesis, "expanded_summary")
        for synth in payload.get("syntheses", []):
            synth_kwargs = dict(
                id=uuid.uuid4(),
                space_id=new_space.id,
                purpose=synth["purpose"],
                space_summary=synth.get("space_summary"),
                theme_notes=synth.get("theme_notes"),
                note_states=synth.get("note_states"),
                dismiss_reasons=synth.get("dismiss_reasons"),
                completion_outcomes=synth.get("completion_outcomes"),
                completion_outcome_images=synth.get("completion_outcome_images"),
                is_current=synth.get("is_current", False),
                generated_at=datetime.fromisoformat(synth["generated_at"]) if synth.get("generated_at") else None,
                created_at=datetime.fromisoformat(synth["created_at"]) if synth.get("created_at") else datetime.utcnow(),
            )
            if _has_expanded:
                synth_kwargs["expanded_summary"] = synth.get("expanded_summary")
                synth_kwargs["expanded_theme_notes"] = synth.get("expanded_theme_notes")
            db.add(SpaceSynthesis(**synth_kwargs))

        # Import synthesis actions
        for sa in payload.get("synthesis_actions", []):
            db.add(SynthesisAction(
                id=uuid.uuid4(),
                space_id=new_space.id,
                theme_name=sa["theme_name"],
                note_text=sa["note_text"],
                action=sa["action"],
                detail=sa.get("detail"),
                created_at=datetime.fromisoformat(sa["created_at"]) if sa.get("created_at") else datetime.utcnow(),
            ))

        # Import snapshots
        for snap in payload.get("snapshots", []):
            db.add(SpaceSnapshot(
                id=uuid.uuid4(),
                space_id=new_space.id,
                created_by_id=owner.id,
                title=snap.get("title"),
                snapshot_type=snap.get("snapshot_type", "manual"),
                snapshot_data=snap.get("snapshot_data", {}),
                created_at=datetime.fromisoformat(snap["created_at"]) if snap.get("created_at") else datetime.utcnow(),
            ))

        # Import activity log
        for log_entry in payload.get("activity_log", []):
            db.add(SpaceActivityLog(
                id=uuid.uuid4(),
                space_id=new_space.id,
                user_name=log_entry.get("user_name"),
                event_type=log_entry["event_type"],
                detail=log_entry.get("detail"),
                created_at=datetime.fromisoformat(log_entry["created_at"]) if log_entry.get("created_at") else datetime.utcnow(),
            ))

        # Import theme events — preserve run grouping with stable ID mapping
        run_id_map: dict[str, uuid.UUID] = {}
        for te in payload.get("theme_events", []):
            old_run_id = te.get("organize_run_id", "")
            if old_run_id not in run_id_map:
                run_id_map[old_run_id] = uuid.uuid4()
            db.add(ThemeEvent(
                id=uuid.uuid4(),
                space_id=new_space.id,
                organize_run_id=run_id_map[old_run_id],
                event_type=te["event_type"],
                theme_name=te["theme_name"],
                theme_color=te.get("theme_color"),
                details=te.get("details", {}),
                created_at=datetime.fromisoformat(te["created_at"]) if te.get("created_at") else datetime.utcnow(),
            ))

        db.commit()

        log_audit(
            admin_id=admin.id,
            admin_username=admin.username,
            action="import_space",
            entity_type="space",
            entity_id=str(new_space.id),
            details={
                "title": new_space.title,
                "owner_email": target_email,
                "ideas": len(payload.get("ideas", [])),
                "themes": len(payload.get("themes", [])),
            },
        )

        return {
            "success": True,
            "space_id": str(new_space.id),
            "title": new_space.title,
            "ideas_imported": len(payload.get("ideas", [])),
            "themes_imported": len(payload.get("themes", [])),
            "syntheses_imported": len(payload.get("syntheses", [])),
            "snapshots_imported": len(payload.get("snapshots", [])),
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Space import failed: {e}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}",
        )


@router.get("/spaces")
async def admin_list_spaces(
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
    search: Optional[str] = None,
):
    """List spaces for admin browsing."""
    query = db.query(Space).order_by(Space.created_at.desc())
    if search:
        query = query.filter(
            or_(
                Space.title.ilike(f"%{search}%"),
                Space.description.ilike(f"%{search}%"),
            )
        )
    total = query.count()
    spaces = query.offset(offset).limit(limit).all()

    results = []
    for s in spaces:
        owner = db.query(User).filter(User.id == s.owner_id).first()
        idea_count = db.query(func.count(Idea.id)).filter(Idea.space_id == s.id).scalar()
        theme_count = db.query(func.count(Theme.id)).filter(Theme.space_id == s.id).scalar()
        results.append({
            "id": str(s.id),
            "title": s.title,
            "description": s.description,
            "owner_email": owner.email if owner else None,
            "owner_name": owner.full_name if owner else None,
            "idea_count": idea_count,
            "theme_count": theme_count,
            "clustering_mode": s.clustering_mode,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        })

    return {"spaces": results, "total": total}

