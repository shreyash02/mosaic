"""Scheduler service for background jobs."""

from datetime import datetime, timedelta
from uuid import UUID
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings
from app.models.conversation import Conversation
from app.models.journal import Journal as JournalModel
from app.models.response import Response
from app.models.question import Question
from app.models.conversation_invitation import ConversationInvitation
from app.models.user import User
from app.models.periodic_analysis import PeriodicAnalysis
from app.models.continuous_trends import ContinuousTrends
from app.schemas.conversation import ConversationState
from app.routes.analysis import run_analysis_task
from app.utils.access_code import generate_access_code
from app.services.email_service import email_service
from app.services.notification_service import notification_service
from app.services.platform_settings_service import get_llm_model
from app.utils.email_preferences import should_send_email
from typing import Optional
from contextlib import asynccontextmanager
import logging
import asyncio
import uuid

logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = AsyncIOScheduler()


class JobContext:
    """Context object for tracking job execution metrics."""

    def __init__(self):
        self.items_processed = 0
        self.items_failed = 0
        self.details = {}

    def add_processed(self, count: int = 1) -> None:
        """Increment the count of successfully processed items."""
        self.items_processed += count

    def add_failed(self, count: int = 1) -> None:
        """Increment the count of failed items."""
        self.items_failed += count

    def set_details(self, data: dict) -> None:
        """Update the details dictionary with job-specific data."""
        self.details.update(data)


@asynccontextmanager
async def log_job_execution(job_name: str):
    """
    Context manager to automatically log job execution with timing and results.

    Creates a 'started' log entry at the beginning, then updates it to
    'completed' or 'failed' when the job finishes.

    Usage:
        async with log_job_execution('check_scheduled_activations') as ctx:
            # Do work...
            ctx.add_processed(5)
            ctx.set_details({'conversations_found': 5})

    Args:
        job_name: The name of the scheduler job being executed
    """
    from app.models.scheduler_job_log import SchedulerJobLog

    db = SessionLocal()
    log_id = uuid.uuid4()
    start_time = datetime.utcnow()
    context = JobContext()

    # Create started log entry
    job_log = SchedulerJobLog(
        id=log_id,
        job_name=job_name,
        status='started',
        started_at=start_time,
    )
    try:
        db.add(job_log)
        db.commit()
    except Exception as e:
        logger.error(f"Failed to create job log for {job_name}: {e}")
        db.rollback()

    try:
        yield context

        # Update with success
        end_time = datetime.utcnow()
        try:
            # Re-fetch the log entry in case db session was closed
            job_log = db.query(SchedulerJobLog).filter(SchedulerJobLog.id == log_id).first()
            if job_log:
                job_log.status = 'completed'
                job_log.completed_at = end_time
                job_log.duration_ms = int((end_time - start_time).total_seconds() * 1000)
                job_log.items_processed = context.items_processed
                job_log.items_failed = context.items_failed
                job_log.details = context.details if context.details else None
                db.commit()
        except Exception as e:
            logger.error(f"Failed to update job log for {job_name}: {e}")
            db.rollback()

    except Exception as e:
        # Update with failure
        end_time = datetime.utcnow()
        try:
            job_log = db.query(SchedulerJobLog).filter(SchedulerJobLog.id == log_id).first()
            if job_log:
                job_log.status = 'failed'
                job_log.completed_at = end_time
                job_log.duration_ms = int((end_time - start_time).total_seconds() * 1000)
                job_log.items_processed = context.items_processed
                job_log.items_failed = context.items_failed
                job_log.error_message = str(e)[:1000]  # Truncate long error messages
                job_log.details = context.details if context.details else None
                db.commit()
        except Exception as log_error:
            logger.error(f"Failed to update job log for {job_name}: {log_error}")
            db.rollback()
        raise
    finally:
        db.close()


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

    # Get inviter for Slack notifications
    inviter = None
    if pending_invitations and pending_invitations[0].invited_by_id:
        inviter = db.query(User).filter(User.id == pending_invitations[0].invited_by_id).first()

    # Send invitation emails and Slack notifications asynchronously
    # Don't block if sending fails
    for invitation in pending_invitations:
        # Send email if user hasn't opted out
        if should_send_email(db, invitation.email, "conversation_invitations"):
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
        else:
            logger.info(f"Skipping invitation email to {invitation.email} - user opted out")

        # Send Slack DM if user is registered
        if invitation.invited_user_id:
            try:
                await notification_service.notify_user_added_to_conversation(
                    user_id=invitation.invited_user_id,
                    conversation=conversation,
                    inviter=inviter,
                    db=db,
                )
            except Exception as e:
                logger.error(f"Failed to send Slack notification to user {invitation.invited_user_id}: {str(e)}", exc_info=True)


async def check_scheduled_activations():
    """
    Check for conversations that should be activated.

    Note: scheduled_activate_at is stored in UTC in the database.
    The comparison is done in UTC, so this works correctly regardless of server timezone.
    """
    async with log_job_execution('check_scheduled_activations') as ctx:
        db: Session = SessionLocal()
        try:
            # Compare UTC to UTC (all stored times are in UTC)
            now = datetime.utcnow()
            conversations = db.query(Conversation).filter(
                Conversation.state == ConversationState.DRAFT.value,
                Conversation.scheduled_activate_at <= now,
                Conversation.scheduled_activate_at.isnot(None),
                Conversation.is_template == False  # Templates are never activated
            ).all()

            ctx.set_details({'conversations_found': len(conversations)})

            if conversations:
                logger.info(f"Found {len(conversations)} conversation(s) to activate")

            for conv in conversations:
                try:
                    logger.info(f"Activating conversation {conv.id} (scheduled for {conv.scheduled_activate_at})")
                    conv.state = ConversationState.ACTIVE.value
                    conv.activated_at = datetime.utcnow()
                    conv.scheduled_activate_at = None  # Clear scheduled time after activation

                    # Calculate auto_close_at from duration_minutes if set
                    if conv.duration_minutes:
                        conv.auto_close_at = conv.activated_at + timedelta(minutes=conv.duration_minutes)
                    ctx.add_processed()
                except Exception as e:
                    ctx.add_failed()
                    logger.error(f"Failed to activate conversation {conv.id}: {e}", exc_info=True)

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

                    # Send Slack channel notification if configured
                    try:
                        await notification_service.notify_channel_conversation_activated(
                            conversation=conv,
                            db=db,
                        )
                    except Exception as e:
                        logger.error(f"Failed to send Slack channel notification for conversation {conv.id}: {e}")
        except Exception as e:
            logger.error(f"Error checking scheduled activations: {e}", exc_info=True)
            db.rollback()
            raise
        finally:
            db.close()


async def check_scheduled_closures():
    """
    Check for conversations that should be closed.

    Note: auto_close_at is stored in UTC in the database.
    The comparison is done in UTC, so this works correctly regardless of server timezone.
    """
    async with log_job_execution('check_scheduled_closures') as ctx:
        db: Session = SessionLocal()
        try:
            # Compare UTC to UTC (all stored times are in UTC)
            now = datetime.utcnow()
            conversations = db.query(Conversation).filter(
                Conversation.state == ConversationState.ACTIVE.value,
                Conversation.auto_close_at <= now,
                Conversation.auto_close_at.isnot(None)
            ).all()

            ctx.set_details({'conversations_found': len(conversations)})

            if conversations:
                logger.info(f"Found {len(conversations)} conversation(s) to close")

            conversations_to_analyze = []
            conversations_to_notify = []

            for conv in conversations:
                try:
                    logger.info(f"Closing conversation {conv.id} (auto_close_at: {conv.auto_close_at})")
                    conv.state = ConversationState.CLOSED.value
                    conv.closed_at = datetime.utcnow()

                    # Check if there are responses
                    response_count = db.query(Response).filter(
                        Response.conversation_id == conv.id
                    ).count()

                    # Collect conversations that need auto-analysis
                    # Respect response threshold — skip auto-analysis if threshold not met
                    threshold_met = (
                        conv.response_threshold is None
                        or response_count >= conv.response_threshold
                    )
                    if conv.auto_analyze and response_count > 0 and threshold_met:
                        conversations_to_analyze.append(conv.id)
                    elif conv.auto_analyze and response_count > 0 and not threshold_met:
                        logger.info(
                            f"Auto-analysis skipped for conversation {conv.id}: "
                            f"{response_count}/{conv.response_threshold} responses (threshold not met)"
                        )

                    # Collect conversations for closed notifications
                    conversations_to_notify.append((conv, response_count))
                    ctx.add_processed()
                except Exception as e:
                    ctx.add_failed()
                    logger.error(f"Failed to close conversation {conv.id}: {e}", exc_info=True)

            if conversations:
                db.commit()
                logger.info(f"Successfully closed {len(conversations)} conversation(s)")

            # Send closed notifications
            for conv, response_count in conversations_to_notify:
                await _send_conversation_closed_notifications(conv, response_count, db)

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
            raise
        finally:
            db.close()


async def check_closing_warnings():
    """
    Check for conversations that are closing soon and notify users who haven't responded.

    Sends Slack DMs and/or emails to users who:
    - Are invited to a conversation
    - Haven't submitted a response
    - The conversation is closing within the next hour

    Runs every 15 minutes.
    """
    async with log_job_execution('check_closing_warnings') as ctx:
        db: Session = SessionLocal()
        try:
            now = datetime.utcnow()
            # Look for conversations closing in the next hour
            warning_window = now + timedelta(hours=1)

            # Find active conversations closing soon (include all conversations, not just org ones)
            conversations = db.query(Conversation).filter(
                Conversation.state == ConversationState.ACTIVE.value,
                Conversation.auto_close_at.isnot(None),
                Conversation.auto_close_at > now,
                Conversation.auto_close_at <= warning_window,
            ).all()

            ctx.set_details({'conversations_found': len(conversations)})

            if not conversations:
                return

            logger.info(f"Found {len(conversations)} conversation(s) closing soon")

            for conv in conversations:
                try:
                    await _send_closing_warnings_for_conversation(conv, db)
                    ctx.add_processed()
                except Exception as e:
                    ctx.add_failed()
                    logger.error(f"Failed to send closing warnings for {conv.id}: {e}", exc_info=True)

        except Exception as e:
            logger.error(f"Error checking closing warnings: {e}", exc_info=True)
            raise
        finally:
            db.close()


async def _send_closing_warnings_for_conversation(
    conversation: Conversation,
    db: Session,
) -> None:
    """Send closing warnings (Slack + email) to users who haven't responded to a conversation."""
    from app.models.response import Response

    # Get all invitations for this conversation (with or without user accounts)
    invitations = db.query(ConversationInvitation).filter(
        ConversationInvitation.conversation_id == conversation.id,
    ).all()

    if not invitations:
        return

    # Get users who have already responded
    responded_user_ids = set(
        r.participant_id for r in db.query(Response).filter(
            Response.conversation_id == conversation.id,
            Response.participant_id.isnot(None),
        ).all()
    )

    respond_url = f"{settings.FRONTEND_URL}/respond/{conversation.access_code}"

    # Send warnings to users who haven't responded
    for invitation in invitations:
        # Skip if user has responded
        if invitation.invited_user_id and invitation.invited_user_id in responded_user_ids:
            continue

        # Skip if we've already sent a closing warning for this conversation
        if invitation.closing_warning_sent_at:
            continue

        slack_sent = False
        email_sent = False

        # Try Slack notification for registered users (if org has Slack)
        if invitation.invited_user_id and conversation.organization_id:
            try:
                slack_sent = await notification_service.notify_conversation_closing_soon(
                    user_id=invitation.invited_user_id,
                    conversation=conversation,
                    db=db,
                )
            except Exception as e:
                logger.error(
                    f"Failed to send Slack closing warning to user {invitation.invited_user_id}: {e}",
                    exc_info=True
                )

        # Send email to all invited users (as primary for non-Slack users, or as backup)
        if invitation.email and should_send_email(db, invitation.email, "closing_reminders"):
            try:
                email_sent = await email_service.send_closing_warning_email(
                    to_email=invitation.email,
                    conversation_title=conversation.title,
                    closes_at=conversation.auto_close_at,
                    respond_url=respond_url,
                )
            except Exception as e:
                logger.error(
                    f"Failed to send closing warning email to {invitation.email}: {e}",
                    exc_info=True
                )

        # Mark warning as sent if either channel succeeded
        if slack_sent or email_sent:
            invitation.closing_warning_sent_at = datetime.utcnow()

    # Commit the tracking updates
    try:
        db.commit()
    except Exception as e:
        logger.error(f"Failed to commit closing warning tracking: {e}", exc_info=True)
        db.rollback()


async def _send_conversation_closed_notifications(
    conversation: Conversation,
    response_count: int,
    db: Session,
) -> None:
    """Send email notifications when a conversation is closed."""
    # Determine results URL based on results_access
    results_url = None
    if conversation.results_access != "creator_only":
        results_url = f"{settings.FRONTEND_URL}/analysis/{conversation.id}"

    # Send to creator
    if conversation.creator_id:
        creator = db.query(User).filter(User.id == conversation.creator_id).first()
        if creator and creator.email and should_send_email(db, creator.email, "conversation_closed"):
            try:
                await email_service.send_conversation_closed_email(
                    to_email=creator.email,
                    conversation_title=conversation.title,
                    response_count=response_count,
                    results_url=f"{settings.FRONTEND_URL}/analysis/{conversation.id}",  # Creator always gets link
                    is_creator=True,
                )
            except Exception as e:
                logger.error(f"Failed to send closed email to creator {creator.email}: {e}", exc_info=True)

    # Send to participants who submitted responses (if results are accessible)
    if results_url:
        # Get unique participants who responded
        participant_ids = db.query(Response.participant_id).filter(
            Response.conversation_id == conversation.id,
            Response.participant_id.isnot(None),
            Response.status == "submitted",
        ).distinct().all()

        participant_ids = [p[0] for p in participant_ids if p[0] != conversation.creator_id]

        for participant_id in participant_ids:
            user = db.query(User).filter(User.id == participant_id).first()
            if user and user.email and should_send_email(db, user.email, "conversation_closed"):
                try:
                    await email_service.send_conversation_closed_email(
                        to_email=user.email,
                        conversation_title=conversation.title,
                        response_count=response_count,
                        results_url=results_url,
                        is_creator=False,
                    )
                except Exception as e:
                    logger.error(f"Failed to send closed email to participant {user.email}: {e}", exc_info=True)

    # Send Slack channel notification if configured
    try:
        await notification_service.notify_channel_conversation_closed(
            conversation=conversation,
            response_count=response_count,
            db=db,
        )
    except Exception as e:
        logger.error(f"Failed to send Slack channel closed notification: {e}")


async def create_recurring_instances():
    """
    Check for recurring conversation templates and create new instances.

    Finds templates where:
    - next_instance_date <= now
    - recurrence_pattern is set
    - recurrence_end_date has not passed (or is None)
    """
    async with log_job_execution('create_recurring_instances') as ctx:
        db: Session = SessionLocal()
        try:
            now = datetime.utcnow()

            # Find templates that need new instances
            # Templates are conversations with is_template = True and recurrence_pattern set
            templates = db.query(Conversation).filter(
                Conversation.is_template == True,
                Conversation.recurrence_pattern.isnot(None),
                Conversation.next_instance_date <= now,
                Conversation.next_instance_date.isnot(None),
                # Either no end date, or end date hasn't passed
                (Conversation.recurrence_end_date.is_(None)) | (Conversation.recurrence_end_date > now),
                # Skip paused templates
                Conversation.recurrence_paused == False
            ).all()

            ctx.set_details({'templates_found': len(templates)})

            if templates:
                logger.info(f"Found {len(templates)} recurring template(s) to create instances for")

            for template in templates:
                try:
                    logger.info(f"Creating recurring instance for template {template.id} ({template.title})")

                    # Calculate instance number for title
                    # Count instances that belong to template's series (if any)
                    if template.template_series_id:
                        existing_instances = db.query(Conversation).filter(
                            Conversation.series_id == template.template_series_id
                        ).count()
                    else:
                        # Count instances with this template as parent (fallback)
                        existing_instances = db.query(Conversation).filter(
                            Conversation.parent_conversation_id == template.id
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
                    if template.template_series_id:
                        latest_instance = db.query(Conversation).filter(
                            Conversation.series_id == template.template_series_id
                        ).order_by(Conversation.created_at.desc()).first()
                    else:
                        latest_instance = db.query(Conversation).filter(
                            Conversation.parent_conversation_id == template.id
                        ).order_by(Conversation.created_at.desc()).first()

                    parent_id = latest_instance.id if latest_instance else template.id

                    # Determine series_id for new instance
                    # If template has template_series_id, instances join that series
                    instance_series_id = template.template_series_id

                    # Create new instance
                    new_instance = Conversation(
                        creator_id=template.creator_id,
                        organization_id=template.organization_id,
                        workspace_id=template.workspace_id,
                        parent_conversation_id=parent_id,
                        series_id=instance_series_id,
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
                            options=q.options,
                            is_required=q.is_required
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

                    # Send email notifications
                    await _send_recurring_instance_notifications(
                        new_instance=new_instance,
                        template=template,
                        instance_number=instance_number,
                        template_invitations=template_invitations,
                        db=db,
                    )
                    ctx.add_processed()

                except Exception as e:
                    ctx.add_failed()
                    logger.error(f"Error creating instance for template {template.id}: {e}", exc_info=True)
                    db.rollback()
                    # Continue with other templates
                    continue

        except Exception as e:
            logger.error(f"Error in create_recurring_instances: {e}", exc_info=True)
            raise
        finally:
            db.close()


async def _send_recurring_instance_notifications(
    new_instance: Conversation,
    template: Conversation,
    instance_number: int,
    template_invitations: list,
    db: Session,
) -> None:
    """Send email notifications when a new recurring instance is created."""
    # Send to creator
    if template.creator_id:
        creator = db.query(User).filter(User.id == template.creator_id).first()
        if creator and creator.email and should_send_email(db, creator.email, "recurring_instances"):
            # Creator gets link to manage/activate the conversation
            manage_url = f"{settings.FRONTEND_URL}/conversations/{new_instance.id}"
            try:
                await email_service.send_recurring_instance_created_email(
                    to_email=creator.email,
                    conversation_title=new_instance.title,
                    instance_number=instance_number,
                    join_url=manage_url,
                    is_creator=True,
                )
            except Exception as e:
                logger.error(f"Failed to send recurring instance email to creator {creator.email}: {e}", exc_info=True)

    # Note: Don't notify invitees yet - the instance is in DRAFT state
    # They'll be notified when the conversation is activated (via send_pending_invitation_emails)


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


def calculate_period_start(period_end: datetime, interval: str) -> datetime:
    """
    Calculate the start of the analysis period based on interval.

    Args:
        period_end: End of the analysis period
        interval: Analysis interval (daily, weekly, biweekly, monthly)

    Returns:
        Start datetime of the period
    """
    if interval == "every_10_minutes":
        return period_end - timedelta(minutes=10)
    elif interval == "daily":
        return period_end - timedelta(days=1)
    elif interval == "weekly":
        return period_end - timedelta(weeks=1)
    elif interval == "biweekly":
        return period_end - timedelta(weeks=2)
    elif interval == "monthly":
        return period_end - timedelta(days=30)
    else:
        return period_end - timedelta(weeks=1)


def calculate_next_analysis_time(current: datetime, interval: str) -> datetime:
    """
    Calculate when the next periodic analysis should run.

    Args:
        current: Current analysis time
        interval: Analysis interval (daily, weekly, biweekly, monthly)

    Returns:
        Next analysis datetime
    """
    if interval == "every_10_minutes":
        return current + timedelta(minutes=10)
    elif interval == "daily":
        return current + timedelta(days=1)
    elif interval == "weekly":
        return current + timedelta(weeks=1)
    elif interval == "biweekly":
        return current + timedelta(weeks=2)
    elif interval == "monthly":
        return current + timedelta(days=30)
    else:
        return current + timedelta(weeks=1)


def calculate_next_analysis_time_scheduled(
    current_utc: datetime,
    interval: str,
    timezone_name: Optional[str] = None,
    time_of_day: Optional[str] = None,
    day_of_week: Optional[int] = None,
    day_of_month: Optional[int] = None,
) -> datetime:
    """
    Calendar-aware version of calculate_next_analysis_time.

    Computes the next analysis time based on user-chosen schedule preferences
    (target time, day of week, day of month) in the user's timezone, then
    converts back to UTC for storage.

    For dev intervals (every_10_minutes), falls back to the simple version.

    Args:
        current_utc: Current time in UTC (e.g. now or last analysis time)
        interval: Analysis interval (daily, weekly, biweekly, monthly)
        timezone_name: IANA timezone (e.g. "America/New_York"). Falls back to UTC.
        time_of_day: "HH:MM" 24h format. Defaults to "09:00".
        day_of_week: 0=Mon..6=Sun. Used for weekly/biweekly.
        day_of_month: 1-28. Used for monthly.

    Returns:
        Next analysis datetime in UTC.
    """
    from zoneinfo import ZoneInfo

    # Dev intervals: use simple offset
    if interval == "every_10_minutes":
        return current_utc + timedelta(minutes=10)

    # Parse timezone
    try:
        tz = ZoneInfo(timezone_name) if timezone_name else ZoneInfo("UTC")
    except Exception:
        tz = ZoneInfo("UTC")

    # Parse target time
    target_hour, target_minute = 9, 0
    if time_of_day:
        try:
            parts = time_of_day.split(":")
            target_hour, target_minute = int(parts[0]), int(parts[1])
        except (ValueError, IndexError):
            pass

    # Convert current UTC to local
    local_now = current_utc.replace(tzinfo=ZoneInfo("UTC")).astimezone(tz)

    if interval == "daily":
        # Next occurrence of target_hour:target_minute in local tz
        candidate = local_now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
        if candidate <= local_now:
            candidate += timedelta(days=1)

    elif interval in ("weekly", "biweekly"):
        target_dow = day_of_week if day_of_week is not None else local_now.weekday()
        candidate = local_now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
        # Find next occurrence of target_dow
        days_ahead = (target_dow - candidate.weekday()) % 7
        if days_ahead == 0 and candidate <= local_now:
            days_ahead = 7
        candidate += timedelta(days=days_ahead)
        # For biweekly, ensure at least 7 days out
        if interval == "biweekly":
            min_date = local_now + timedelta(days=7)
            if candidate < min_date:
                candidate += timedelta(weeks=1)

    elif interval == "monthly":
        target_day = day_of_month if day_of_month is not None else 1
        target_day = max(1, min(28, target_day))
        candidate = local_now.replace(
            day=target_day, hour=target_hour, minute=target_minute,
            second=0, microsecond=0,
        )
        if candidate <= local_now:
            # Move to next month
            if candidate.month == 12:
                candidate = candidate.replace(year=candidate.year + 1, month=1)
            else:
                candidate = candidate.replace(month=candidate.month + 1)

    else:
        # Fallback
        return current_utc + timedelta(weeks=1)

    # Convert back to UTC (naive)
    candidate_utc = candidate.astimezone(ZoneInfo("UTC")).replace(tzinfo=None)
    return candidate_utc


def generate_period_label(period_start: datetime, period_end: datetime, interval: str) -> str:
    """
    Generate a human-readable label for the analysis period.

    Args:
        period_start: Start of the period
        period_end: End of the period
        interval: Analysis interval

    Returns:
        Period label string (e.g., "2024-W01", "2024-01", "2024-01-15")
    """
    if interval == "every_10_minutes":
        return period_start.strftime("%Y-%m-%d %H:%M")
    elif interval == "daily":
        return period_start.strftime("%Y-%m-%d")
    elif interval in ["weekly", "biweekly"]:
        year, week, _ = period_start.isocalendar()
        return f"{year}-W{week:02d}"
    elif interval == "monthly":
        return period_start.strftime("%Y-%m")
    else:
        return period_start.strftime("%Y-%m-%d")


def generate_incremental_period_label(
    db,
    conversation_id: UUID,
    period_start: datetime,
    period_end: datetime,
    interval: str
) -> str:
    """
    Generate a period label with suffix for incremental analyses.

    If analyses already exist for the base period (e.g., 2026-W07), this will
    generate labels like 2026-W07-a, 2026-W07-b, etc.

    Args:
        db: Database session
        conversation_id: ID of the conversation
        period_start: Start of the period
        period_end: End of the period
        interval: Analysis interval

    Returns:
        Period label string with suffix (e.g., "2024-W01-a")
    """
    from app.models.periodic_analysis import PeriodicAnalysis

    base_label = generate_period_label(period_start, period_end, interval)

    # Find existing analyses with this base label or suffixed variants
    existing = db.query(PeriodicAnalysis).filter(
        PeriodicAnalysis.conversation_id == conversation_id,
        PeriodicAnalysis.period_label.like(f"{base_label}%")
    ).all()

    if not existing:
        # No existing analysis for this period, use suffix 'a'
        return f"{base_label}-a"

    # Find the highest suffix used
    max_suffix = None
    for analysis in existing:
        label = analysis.period_label
        if label == base_label:
            # Base label exists without suffix
            if max_suffix is None:
                max_suffix = ''  # empty string means base exists
        elif label.startswith(f"{base_label}-"):
            suffix = label[len(base_label) + 1:]  # Get the part after "-"
            if len(suffix) == 1 and suffix.isalpha():
                if max_suffix is None or suffix > max_suffix:
                    max_suffix = suffix

    # Generate next suffix
    if max_suffix is None or max_suffix == '':
        return f"{base_label}-a"
    else:
        # Increment the suffix (a -> b -> c, etc.)
        next_suffix = chr(ord(max_suffix) + 1)
        return f"{base_label}-{next_suffix}"


def run_periodic_analysis_task(
    conversation_id: UUID,
    period_start: datetime,
    period_end: datetime,
    period_type: str,
    db_url: str,
    period_label_override: Optional[str] = None,
    trigger_type: str = 'scheduled'
) -> None:
    """
    Run periodic analysis for a continuous conversation.

    This function runs in a background thread and analyzes responses
    within the specified time window.

    Args:
        conversation_id: ID of the conversation to analyze
        period_start: Start of analysis window (UTC)
        period_end: End of analysis window (UTC)
        period_type: Type of period (daily, weekly, biweekly, monthly)
        db_url: Database connection URL
        period_label_override: Optional override for the period label (for incremental analyses)
        trigger_type: How the analysis was triggered ('scheduled', 'manual', 'manual_incremental')
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.services.analysis_service import AnalysisService
    from app.services.continuous_trends_service import ContinuousTrendsService

    logger.info(f"Starting periodic analysis for conversation {conversation_id}, period {period_start} to {period_end}")

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Get conversation and validate
        conversation = db.query(Conversation).filter(
            Conversation.id == conversation_id
        ).first()

        if not conversation:
            logger.error(f"Conversation {conversation_id} not found for periodic analysis")
            return

        if not conversation.is_continuous:
            logger.warning(f"Conversation {conversation_id} is not continuous, skipping periodic analysis")
            return

        # Get questions
        questions = db.query(Question).filter(
            Question.conversation_id == conversation_id
        ).order_by(Question.question_order).all()

        # Get all responses (we'll filter in the service)
        responses = db.query(Response).filter(
            Response.conversation_id == conversation_id
        ).all()

        # Run windowed analysis with context notes
        analysis_service = AnalysisService(model=get_llm_model(db))
        analysis_result = analysis_service.analyze_conversation_windowed(
            questions=questions,
            responses=responses,
            start_time=period_start,
            end_time=period_end,
            min_cluster_size=2,
            context_notes=conversation.context_notes
        )

        # Generate period label (use override if provided, for incremental analyses)
        period_label = period_label_override or generate_period_label(period_start, period_end, period_type)

        # Check if analysis for this period already exists (shouldn't happen, but be safe)
        existing = db.query(PeriodicAnalysis).filter(
            PeriodicAnalysis.conversation_id == conversation_id,
            PeriodicAnalysis.period_label == period_label
        ).first()

        if existing:
            logger.warning(f"Periodic analysis for {period_label} already exists, updating")
            existing.overall_summary = analysis_result.get("overall_summary")
            existing.question_analyses = analysis_result.get("question_analyses")
            existing.surprising_insights = analysis_result.get("surprising_insights")
            existing.total_responses_analyzed = analysis_result.get("total_responses_analyzed")
            existing.num_clusters_found = analysis_result.get("num_clusters_found")
            existing.analysis_duration_ms = analysis_result.get("analysis_duration_ms")
            existing.embedding_provider = analysis_result.get("embedding_provider")
            existing.embedding_model = analysis_result.get("embedding_model")
            existing.clustering_algorithm = analysis_result.get("clustering_algorithm")
            existing.llm_provider = analysis_result.get("llm_provider")
            existing.llm_model = analysis_result.get("llm_model")
        else:
            # Create new periodic analysis
            periodic_analysis = PeriodicAnalysis(
                id=uuid.uuid4(),
                conversation_id=conversation_id,
                period_start=period_start,
                period_end=period_end,
                period_label=period_label,
                period_type=period_type,
                trigger_type=trigger_type,
                overall_summary=analysis_result.get("overall_summary"),
                question_analyses=analysis_result.get("question_analyses"),
                surprising_insights=analysis_result.get("surprising_insights"),
                total_responses_analyzed=analysis_result.get("total_responses_analyzed"),
                num_clusters_found=analysis_result.get("num_clusters_found"),
                analysis_duration_ms=analysis_result.get("analysis_duration_ms"),
                embedding_provider=analysis_result.get("embedding_provider"),
                embedding_model=analysis_result.get("embedding_model"),
                clustering_algorithm=analysis_result.get("clustering_algorithm"),
                llm_provider=analysis_result.get("llm_provider"),
                llm_model=analysis_result.get("llm_model"),
            )
            db.add(periodic_analysis)

        db.commit()

        logger.info(f"Periodic analysis completed for conversation {conversation_id}, period {period_label}")
        logger.info(f"Analyzed {analysis_result.get('total_responses_analyzed', 0)} responses in {analysis_result.get('analysis_duration_ms', 0)}ms")

        # Update trends if we have at least 2 analyses
        analyses_count = db.query(PeriodicAnalysis).filter(
            PeriodicAnalysis.conversation_id == conversation_id
        ).count()

        if analyses_count >= 2:
            logger.info(f"Recomputing trends for conversation {conversation_id} ({analyses_count} analyses)")

            all_analyses = db.query(PeriodicAnalysis).filter(
                PeriodicAnalysis.conversation_id == conversation_id
            ).order_by(PeriodicAnalysis.period_start).all()

            trends_service = ContinuousTrendsService()
            trends_data = trends_service.compute_trends(all_analyses, period_type)

            # Update or create trends record
            trends = db.query(ContinuousTrends).filter(
                ContinuousTrends.conversation_id == conversation_id
            ).first()

            if trends:
                trends.trends = trends_data
                trends.periods_analyzed = analyses_count
                trends.last_computed_at = datetime.utcnow()
                trends.computation_duration_ms = trends_data.get("computation_duration_ms")
            else:
                trends = ContinuousTrends(
                    id=uuid.uuid4(),
                    conversation_id=conversation_id,
                    trends=trends_data,
                    periods_analyzed=analyses_count,
                    computation_duration_ms=trends_data.get("computation_duration_ms")
                )
                db.add(trends)

            db.commit()
            logger.info(f"Trends updated for conversation {conversation_id}")

        # Send email notification to creator
        if conversation.creator_id:
            creator = db.query(User).filter(User.id == conversation.creator_id).first()
            if creator and creator.email and should_send_email(db, creator.email, "periodic_analysis"):
                results_url = f"{settings.FRONTEND_URL}/conversations/{conversation_id}/continuous"
                responses_analyzed = analysis_result.get("total_responses_analyzed", 0)
                try:
                    import asyncio
                    asyncio.run(
                        email_service.send_periodic_analysis_ready_email(
                            to_email=creator.email,
                            conversation_title=conversation.title,
                            period_label=period_label,
                            results_url=results_url,
                            responses_analyzed=responses_analyzed,
                        )
                    )
                except Exception as e:
                    logger.error(f"Failed to send periodic analysis email to {creator.email}: {e}", exc_info=True)

        # Send Slack channel notification if configured
        try:
            import asyncio
            asyncio.run(
                notification_service.notify_channel_analysis_ready(
                    conversation=conversation,
                    db=db,
                )
            )
        except Exception as e:
            logger.error(f"Failed to send Slack channel periodic analysis notification: {e}")

    except Exception as e:
        logger.error(f"Error running periodic analysis for conversation {conversation_id}: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()
        engine.dispose()


async def check_scheduled_reminders():
    """
    Check for scheduled reminders that should be sent.

    Runs every 5 minutes and sends reminders where:
    - status = 'pending'
    - reminder_type = 'scheduled'
    - scheduled_at <= now
    """
    from app.models.conversation_reminder import ConversationReminder
    from app.services.reminder_service import reminder_service

    async with log_job_execution('check_scheduled_reminders') as ctx:
        db: Session = SessionLocal()

        try:
            now = datetime.utcnow()

            # Find scheduled reminders that are due
            reminders = db.query(ConversationReminder).filter(
                ConversationReminder.status == "pending",
                ConversationReminder.reminder_type == "scheduled",
                ConversationReminder.scheduled_at <= now,
            ).all()

            ctx.set_details({'reminders_found': len(reminders)})

            if not reminders:
                return

            logger.info(f"Found {len(reminders)} scheduled reminder(s) to send")

            for reminder in reminders:
                try:
                    # Get the conversation
                    conversation = db.query(Conversation).filter(
                        Conversation.id == reminder.conversation_id
                    ).first()

                    if not conversation:
                        logger.warning(f"Conversation not found for reminder {reminder.id}")
                        reminder.status = "cancelled"
                        db.commit()
                        ctx.add_processed()  # Still counts as processed (cancelled)
                        continue

                    # Skip if conversation is no longer active
                    if conversation.state != "active":
                        logger.info(f"Skipping reminder {reminder.id} - conversation is not active")
                        reminder.status = "cancelled"
                        db.commit()
                        ctx.add_processed()  # Still counts as processed (cancelled)
                        continue

                    # Send the reminders
                    await reminder_service.send_reminders(reminder, conversation, db)
                    logger.info(f"Successfully sent scheduled reminder {reminder.id}")
                    ctx.add_processed()

                except Exception as e:
                    ctx.add_failed()
                    logger.error(f"Error sending scheduled reminder {reminder.id}: {e}", exc_info=True)
                    # Don't mark as failed, let it retry next cycle
                    continue

        except Exception as e:
            logger.error(f"Error in check_scheduled_reminders: {e}", exc_info=True)
            raise
        finally:
            db.close()


async def check_periodic_analyses():
    """
    Check for continuous conversations that need periodic analysis.

    Runs periodically and triggers analysis for conversations where:
    - is_continuous = True
    - analysis_interval is set
    - next_analysis_at <= now
    - state is ACTIVE
    """
    async with log_job_execution('check_periodic_analyses') as ctx:
        db: Session = SessionLocal()
        try:
            now = datetime.utcnow()

            # Find continuous conversations needing analysis
            conversations = db.query(Conversation).filter(
                Conversation.is_continuous == True,
                Conversation.state == ConversationState.ACTIVE.value,
                Conversation.analysis_interval.isnot(None),
                Conversation.next_analysis_at <= now,
                Conversation.next_analysis_at.isnot(None)
            ).all()

            ctx.set_details({'conversations_found': len(conversations)})

            if conversations:
                logger.info(f"Found {len(conversations)} continuous conversation(s) needing periodic analysis")

            for conv in conversations:
                try:
                    # Check if this conversation backs a journal
                    journal = db.query(JournalModel).filter(
                        JournalModel.conversation_id == conv.id,
                    ).first()

                    period_end = conv.next_analysis_at

                    if journal:
                        # Journal: run cumulative analysis (themes, mood, patterns)
                        from app.routes.journals import run_journal_analysis_task
                        from app.services.feature_flag_service import feature_flag_service
                        from app.services.subscription_service import subscription_service
                        from app.services.usage_service import usage_service

                        # Check feature flag for journal owner
                        owner_tier = subscription_service.get_tier(db, user_id=journal.owner_id)
                        if not feature_flag_service.is_enabled(
                            db, "journals", tier=owner_tier, user_id=journal.owner_id,
                        ):
                            logger.info(f"Journals feature disabled for owner of journal {journal.id}, skipping")
                        else:
                            # Check monthly analysis limit
                            analysis_limit = feature_flag_service.get_config_value(
                                db, "journals", "journal_analyses_per_month",
                                tier=owner_tier, user_id=journal.owner_id,
                            )
                            skip_analysis = False
                            if analysis_limit is not None and analysis_limit != -1:
                                is_allowed, current_usage = usage_service.check_limit(
                                    db, "journal_analyses", analysis_limit,
                                    user_id=journal.owner_id,
                                )
                                if not is_allowed:
                                    logger.info(f"Journal analysis limit reached for owner of journal {journal.id} ({current_usage}/{analysis_limit}), skipping")
                                    skip_analysis = True

                            if not skip_analysis:
                                usage_service.increment_usage(
                                    db, "journal_analyses", user_id=journal.owner_id,
                                )
                                logger.info(f"Triggering journal analysis for journal {journal.id} (conversation {conv.id})")
                                asyncio.create_task(
                                    asyncio.to_thread(
                                        run_journal_analysis_task,
                                        journal.id,
                                        settings.DATABASE_URL,
                                    )
                                )
                    else:
                        # Group conversation: run windowed periodic analysis
                        logger.info(f"Triggering periodic analysis for conversation {conv.id}")

                        period_start = calculate_period_start(period_end, conv.analysis_interval)

                        # Check if there are responses in this window
                        response_count = db.query(Response).filter(
                            Response.conversation_id == conv.id,
                            Response.submitted_at >= period_start,
                            Response.submitted_at < period_end
                        ).count()

                        if response_count == 0:
                            logger.info(f"No responses in period for conversation {conv.id}, skipping analysis")
                        elif conv.response_threshold is not None and response_count < conv.response_threshold:
                            logger.info(
                                f"Response threshold not met for conversation {conv.id}: "
                                f"{response_count}/{conv.response_threshold} responses in period, skipping analysis"
                            )
                        else:
                            asyncio.create_task(
                                asyncio.to_thread(
                                    run_periodic_analysis_task,
                                    conv.id,
                                    period_start,
                                    period_end,
                                    conv.analysis_interval,
                                    settings.DATABASE_URL
                                )
                            )

                    # Update next_analysis_at using calendar-aware scheduling if fields are set
                    if conv.analysis_time_of_day is not None or conv.analysis_day_of_week is not None or conv.analysis_day_of_month is not None:
                        conv.next_analysis_at = calculate_next_analysis_time_scheduled(
                            current_utc=period_end,
                            interval=conv.analysis_interval,
                            timezone_name=conv.analysis_timezone or conv.timezone,
                            time_of_day=conv.analysis_time_of_day,
                            day_of_week=conv.analysis_day_of_week,
                            day_of_month=conv.analysis_day_of_month,
                        )
                    else:
                        conv.next_analysis_at = calculate_next_analysis_time(period_end, conv.analysis_interval)
                    ctx.add_processed()

                except Exception as e:
                    ctx.add_failed()
                    logger.error(f"Error processing periodic analysis for {conv.id}: {e}", exc_info=True)

            if conversations:
                db.commit()

        except Exception as e:
            logger.error(f"Error in check_periodic_analyses: {e}", exc_info=True)
            db.rollback()
            raise
        finally:
            db.close()


async def recover_stale_analyses():
    """
    Recover conversations stuck in ANALYZING state for longer than 10 minutes.

    If the LLM hangs or the background task crashes, conversations can get
    permanently stuck in ANALYZING state with no way for the user to retry.
    This job resets them to CLOSED so analysis can be re-triggered.

    Runs every 5 minutes.
    """
    async with log_job_execution('recover_stale_analyses') as ctx:
        db: Session = SessionLocal()
        try:
            cutoff = datetime.utcnow() - timedelta(minutes=10)

            stale_conversations = db.query(Conversation).filter(
                Conversation.state == ConversationState.ANALYZING.value,
                Conversation.updated_at < cutoff
            ).all()

            ctx.set_details({'stale_found': len(stale_conversations)})

            for conv in stale_conversations:
                try:
                    logger.warning(
                        f"Recovering stale analysis for conversation {conv.id} "
                        f"(stuck since {conv.updated_at})"
                    )
                    conv.state = ConversationState.CLOSED.value
                    ctx.add_processed()
                except Exception as e:
                    ctx.add_failed()
                    logger.error(f"Failed to recover conversation {conv.id}: {e}", exc_info=True)

            if stale_conversations:
                db.commit()
                logger.info(f"Recovered {len(stale_conversations)} stale analyzing conversation(s)")

        except Exception as e:
            logger.error(f"Error recovering stale analyses: {e}", exc_info=True)
            db.rollback()
            raise
        finally:
            db.close()


async def cleanup_old_job_logs():
    """
    Auto-cleanup scheduler logs older than 7 days.

    Runs daily to prevent unbounded growth of the scheduler_job_logs table.
    """
    from app.models.scheduler_job_log import SchedulerJobLog

    async with log_job_execution('cleanup_job_logs') as ctx:
        db: Session = SessionLocal()
        try:
            cutoff = datetime.utcnow() - timedelta(days=7)
            deleted = db.query(SchedulerJobLog).filter(
                SchedulerJobLog.started_at < cutoff
            ).delete()
            db.commit()
            ctx.add_processed(deleted)
            ctx.set_details({'deleted_count': deleted, 'cutoff_date': cutoff.isoformat()})
            logger.info(f"Cleaned up {deleted} old scheduler job logs")
        except Exception as e:
            logger.error(f"Error cleaning up old job logs: {e}", exc_info=True)
            db.rollback()
            raise
        finally:
            db.close()


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

    # Add job to check for periodic analyses every 2 minutes
    scheduler.add_job(
        check_periodic_analyses,
        trigger=IntervalTrigger(minutes=2),
        id='check_periodic_analyses',
        replace_existing=True,
        max_instances=1
    )

    # Add job to send closing warning notifications every 15 minutes
    scheduler.add_job(
        check_closing_warnings,
        trigger=IntervalTrigger(minutes=15),
        id='check_closing_warnings',
        replace_existing=True,
        max_instances=1
    )

    # Add job to check for scheduled reminders every 5 minutes
    scheduler.add_job(
        check_scheduled_reminders,
        trigger=IntervalTrigger(minutes=5),
        id='check_scheduled_reminders',
        replace_existing=True,
        max_instances=1
    )

    # Add job to recover conversations stuck in ANALYZING state every 5 minutes
    scheduler.add_job(
        recover_stale_analyses,
        trigger=IntervalTrigger(minutes=5),
        id='recover_stale_analyses',
        replace_existing=True,
        max_instances=1
    )

    # Add job to cleanup old scheduler logs daily
    scheduler.add_job(
        cleanup_old_job_logs,
        trigger=IntervalTrigger(hours=24),
        id='cleanup_job_logs',
        replace_existing=True,
        max_instances=1
    )

    scheduler.start()
    logger.info("Scheduler started with activation, closure, recurring instance, periodic analysis, closing warning, scheduled reminder, stale analysis recovery, and log cleanup jobs")


def shutdown_scheduler():
    """Shutdown the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down")
    else:
        logger.warning("Scheduler was not running")

