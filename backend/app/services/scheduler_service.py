"""Scheduler service for background jobs."""

from datetime import datetime, timedelta
from uuid import UUID
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.conversation import Conversation
from app.models.response import Response
from app.models.question import Question
from app.models.conversation_invitation import ConversationInvitation
from app.models.user import User
from app.schemas.conversation import ConversationState
from app.routes.analysis import run_analysis_task
from app.utils.access_code import generate_access_code
from app.services.email_service import email_service
from typing import Optional
import logging
import asyncio

logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = AsyncIOScheduler()


async def send_pending_invitation_emails(
    conversation: Conversation,
    db: Session
) -> None:
    """
    Send invitation emails to all pending invitations for a conversation.

    Args:
        conversation: The conversation to send invitations for
        db: Database session
    """
    if not conversation.invite_only:
        return

    # Get all pending invitations for this conversation
    pending_invitations = db.query(ConversationInvitation).filter(
        ConversationInvitation.conversation_id == conversation.id
    ).all()

    if not pending_invitations:
        return

    # Get inviter name from the first invitation
    inviter_name = None
    if pending_invitations and pending_invitations[0].invited_by_id:
        inviter = db.query(User).filter(User.id == pending_invitations[0].invited_by_id).first()
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
            logger.error(f"Failed to send invitation email to {invitation.email}: {str(e)}", exc_info=True)


async def check_scheduled_activations():
    """
    Check for conversations that should be activated.

    Note: scheduled_activate_at is stored in UTC in the database.
    The comparison is done in UTC, so this works correctly regardless of server timezone.
    """
    db: Session = SessionLocal()
    try:
        # Compare UTC to UTC (all stored times are in UTC)
        now = datetime.utcnow()
        conversations = db.query(Conversation).filter(
            Conversation.state == ConversationState.DRAFT.value,
            Conversation.scheduled_activate_at <= now,
            Conversation.scheduled_activate_at.isnot(None)
        ).all()

        if conversations:
            logger.info(f"Found {len(conversations)} conversation(s) to activate")

        for conv in conversations:
            logger.info(f"Activating conversation {conv.id} (scheduled for {conv.scheduled_activate_at})")
            conv.state = ConversationState.ACTIVE.value
            conv.activated_at = datetime.utcnow()
            conv.scheduled_activate_at = None  # Clear scheduled time after activation

            # Calculate auto_close_at from duration_minutes if set
            if conv.duration_minutes:
                conv.auto_close_at = conv.activated_at + timedelta(minutes=conv.duration_minutes)

        if conversations:
            db.commit()
            logger.info(f"Successfully activated {len(conversations)} conversation(s)")

            # Send invitation emails for all activated conversations
            for conv in conversations:
                try:
                    await send_pending_invitation_emails(conv, db)
                except Exception as e:
                    # Log error but don't fail - emails are sent asynchronously
                    logger.error(f"Failed to send invitation emails for conversation {conv.id}: {str(e)}", exc_info=True)
    except Exception as e:
        logger.error(f"Error checking scheduled activations: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


async def check_scheduled_closures():
    """
    Check for conversations that should be closed.

    Note: auto_close_at is stored in UTC in the database.
    The comparison is done in UTC, so this works correctly regardless of server timezone.
    """
    db: Session = SessionLocal()
    try:
        # Compare UTC to UTC (all stored times are in UTC)
        now = datetime.utcnow()
        conversations = db.query(Conversation).filter(
            Conversation.state == ConversationState.ACTIVE.value,
            Conversation.auto_close_at <= now,
            Conversation.auto_close_at.isnot(None)
        ).all()

        if conversations:
            logger.info(f"Found {len(conversations)} conversation(s) to close")

        conversations_to_analyze = []

        for conv in conversations:
            logger.info(f"Closing conversation {conv.id} (auto_close_at: {conv.auto_close_at})")
            conv.state = ConversationState.CLOSED.value
            conv.closed_at = datetime.utcnow()

            # Collect conversations that need auto-analysis
            if conv.auto_analyze:
                # Check if there are responses to analyze
                response_count = db.query(Response).filter(
                    Response.conversation_id == conv.id
                ).count()

                if response_count > 0:
                    conversations_to_analyze.append(conv.id)

        if conversations:
            db.commit()
            logger.info(f"Successfully closed {len(conversations)} conversation(s)")

        # Trigger auto-analysis for conversations that have it enabled
        # Do this after committing the close, and run in background
        for conv_id in conversations_to_analyze:
            logger.info(f"Triggering auto-analysis for conversation {conv_id}")
            # Run analysis in background thread (non-blocking)
            try:
                # Use asyncio.to_thread to run the sync function in a thread pool
                # This returns a coroutine that we can schedule
                task = asyncio.create_task(
                    asyncio.to_thread(
                        run_analysis_task,
                        conv_id,
                        settings.DATABASE_URL,
                        2  # min_cluster_size
                    )
                )
                # Don't await - let it run in background
                # The task will complete independently
            except Exception as e:
                logger.error(f"Failed to trigger auto-analysis for conversation {conv_id}: {e}", exc_info=True)
    except Exception as e:
        logger.error(f"Error checking scheduled closures: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


async def create_recurring_instances():
    """
    Check for recurring conversation templates and create new instances.

    Finds templates where:
    - next_instance_date <= now
    - recurrence_pattern is set
    - recurrence_end_date has not passed (or is None)
    """
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()

        # Find templates that need new instances
        # Templates are conversations with series_id = NULL and recurrence_pattern set
        templates = db.query(Conversation).filter(
            Conversation.series_id.is_(None),
            Conversation.recurrence_pattern.isnot(None),
            Conversation.next_instance_date <= now,
            Conversation.next_instance_date.isnot(None),
            # Either no end date, or end date hasn't passed
            (Conversation.recurrence_end_date.is_(None)) | (Conversation.recurrence_end_date > now)
        ).all()

        if templates:
            logger.info(f"Found {len(templates)} recurring template(s) to create instances for")

        for template in templates:
            try:
                logger.info(f"Creating recurring instance for template {template.id} ({template.title})")

                # Calculate instance number for title
                existing_instances = db.query(Conversation).filter(
                    Conversation.series_id == template.id
                ).count()
                instance_number = existing_instances + 1

                # Determine title for new instance
                # Try to increment existing number or add new number
                import re
                match = re.search(r'#(\d+)$', template.title)
                if match:
                    base_title = template.title[:match.start()].strip()
                    new_title = f"{base_title} #{instance_number}"
                else:
                    new_title = f"{template.title} #{instance_number}"

                # Generate unique access code
                access_code = generate_access_code()
                while db.query(Conversation).filter(Conversation.access_code == access_code).first():
                    access_code = generate_access_code()

                # Find the latest instance to use as parent
                latest_instance = db.query(Conversation).filter(
                    Conversation.series_id == template.id
                ).order_by(Conversation.created_at.desc()).first()

                parent_id = latest_instance.id if latest_instance else template.id

                # Create new instance
                new_instance = Conversation(
                    creator_id=template.creator_id,
                    organization_id=template.organization_id,
                    parent_conversation_id=parent_id,
                    series_id=template.id,
                    is_recurring_instance=True,
                    title=new_title,
                    description=template.description,
                    access_code=access_code,
                    state=ConversationState.DRAFT.value,
                    anonymity_level=template.anonymity_level,
                    results_access=template.results_access,
                    invite_only=template.invite_only,
                    auto_analyze=template.auto_analyze,
                    max_response_length=template.max_response_length,
                    duration_minutes=template.duration_minutes,
                    manual_close_enabled=template.manual_close_enabled,
                    time_extension_enabled=template.time_extension_enabled,
                    timezone=template.timezone,
                )

                db.add(new_instance)
                db.flush()  # Get the new instance ID

                # Copy questions from template
                template_questions = db.query(Question).filter(
                    Question.conversation_id == template.id
                ).order_by(Question.question_order).all()

                for q in template_questions:
                    new_question = Question(
                        conversation_id=new_instance.id,
                        question_text=q.question_text,
                        question_type=q.question_type,
                        question_order=q.question_order,
                        options=q.options
                    )
                    db.add(new_question)

                # Copy invitations from template
                template_invitations = db.query(ConversationInvitation).filter(
                    ConversationInvitation.conversation_id == template.id
                ).all()

                for inv in template_invitations:
                    if inv.invited_user_id:
                        new_invitation = ConversationInvitation(
                            conversation_id=new_instance.id,
                            invited_by_user_id=template.creator_id,
                            invited_user_id=inv.invited_user_id,
                            status="pending"
                        )
                        db.add(new_invitation)

                # Calculate next instance date based on recurrence pattern
                next_date = calculate_next_instance_date(
                    template.next_instance_date,
                    template.recurrence_pattern
                )

                # Update template's next_instance_date
                template.next_instance_date = next_date

                db.commit()
                logger.info(f"Successfully created recurring instance {new_instance.id} for template {template.id}")
                logger.info(f"Next instance scheduled for {next_date}")

            except Exception as e:
                logger.error(f"Error creating instance for template {template.id}: {e}", exc_info=True)
                db.rollback()
                # Continue with other templates
                continue

    except Exception as e:
        logger.error(f"Error in create_recurring_instances: {e}", exc_info=True)
    finally:
        db.close()


def calculate_next_instance_date(current_date: datetime, pattern: str) -> datetime:
    """
    Calculate the next instance date based on recurrence pattern.

    Args:
        current_date: Current next_instance_date
        pattern: Recurrence pattern (weekly, biweekly, monthly, quarterly)

    Returns:
        Next instance datetime
    """
    if pattern == "weekly":
        return current_date + timedelta(weeks=1)
    elif pattern == "biweekly":
        return current_date + timedelta(weeks=2)
    elif pattern == "monthly":
        # Add approximately one month (30 days)
        # For more precise month handling, we'd use dateutil
        return current_date + timedelta(days=30)
    elif pattern == "quarterly":
        # Add approximately 3 months (90 days)
        return current_date + timedelta(days=90)
    else:
        logger.warning(f"Unknown recurrence pattern: {pattern}, defaulting to weekly")
        return current_date + timedelta(weeks=1)


def start_scheduler():
    """Start the background scheduler."""
    if scheduler.running:
        logger.warning("Scheduler is already running")
        return

    # Add job to check for scheduled activations every minute
    scheduler.add_job(
        check_scheduled_activations,
        trigger=IntervalTrigger(minutes=1),
        id='check_activations',
        replace_existing=True,
        max_instances=1
    )

    # Add job to check for scheduled closures every minute
    scheduler.add_job(
        check_scheduled_closures,
        trigger=IntervalTrigger(minutes=1),
        id='check_closures',
        replace_existing=True,
        max_instances=1
    )

    # Add job to create recurring instances every 15 minutes
    scheduler.add_job(
        create_recurring_instances,
        trigger=IntervalTrigger(minutes=15),
        id='create_recurring_instances',
        replace_existing=True,
        max_instances=1
    )

    scheduler.start()
    logger.info("Scheduler started with activation, closure, and recurring instance check jobs")


def shutdown_scheduler():
    """Shutdown the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down")
    else:
        logger.warning("Scheduler was not running")

