"""Admin portal routes."""

import logging
import traceback
import uuid
from typing import Optional, List
from uuid import UUID

logger = logging.getLogger(__name__)
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
from app.models.organization import Organization
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
)
from app.schemas.analysis import Analysis as AnalysisSchema
from app.schemas.common import SuccessResponse
from app.schemas.conversation import ConversationState, ConversationUpdate, ConversationWithQuestions

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
        service = TestDataService()
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
    sample_url = f"{settings.FRONTEND_URL}/join/{access_code}"
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
    sample_url = f"{settings.FRONTEND_URL}/join/{access_code}"
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
                    <a href="{invite_link}" style="background-color: #1a1a2e; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">Join Conversation</a>
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
        button_text = "Join Conversation"

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

