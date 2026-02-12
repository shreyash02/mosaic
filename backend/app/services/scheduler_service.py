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
from app.models.periodic_analysis import PeriodicAnalysis
from app.models.continuous_trends import ContinuousTrends
from app.schemas.conversation import ConversationState
from app.routes.analysis import run_analysis_task
from app.utils.access_code import generate_access_code
from app.services.email_service import email_service
from app.services.notification_service import notification_service
from typing import Optional
import logging
import asyncio
import uuid

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

    # Get inviter for Slack notifications
    inviter = None
    if pending_invitations and pending_invitations[0].invited_by_id:
        inviter = db.query(User).filter(User.id == pending_invitations[0].invited_by_id).first()

    # Send invitation emails and Slack notifications asynchronously
    # Don't block if sending fails
    for invitation in pending_invitations:
        # Send email
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


async def check_closing_warnings():
    """
    Check for conversations that are closing soon and notify users who haven't responded.

    Sends Slack DMs to users who:
    - Are invited to a conversation
    - Haven't submitted a response
    - The conversation is closing within the next hour

    Runs every 15 minutes.
    """
    db: Session = SessionLocal()
    try:
        now = datetime.utcnow()
        # Look for conversations closing in the next hour
        warning_window = now + timedelta(hours=1)

        # Find active conversations closing soon
        conversations = db.query(Conversation).filter(
            Conversation.state == ConversationState.ACTIVE.value,
            Conversation.auto_close_at.isnot(None),
            Conversation.auto_close_at > now,
            Conversation.auto_close_at <= warning_window,
            Conversation.organization_id.isnot(None),  # Only org conversations have Slack
        ).all()

        if not conversations:
            return

        logger.info(f"Found {len(conversations)} conversation(s) closing soon")

        for conv in conversations:
            await _send_closing_warnings_for_conversation(conv, db)

    except Exception as e:
        logger.error(f"Error checking closing warnings: {e}", exc_info=True)
    finally:
        db.close()


async def _send_closing_warnings_for_conversation(
    conversation: Conversation,
    db: Session,
) -> None:
    """Send closing warnings to users who haven't responded to a conversation."""
    from app.models.response import Response

    # Get all invited users for this conversation
    invitations = db.query(ConversationInvitation).filter(
        ConversationInvitation.conversation_id == conversation.id,
        ConversationInvitation.invited_user_id.isnot(None),  # Only registered users
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

    # Send warnings to users who haven't responded
    for invitation in invitations:
        if invitation.invited_user_id in responded_user_ids:
            continue  # User has responded, no warning needed

        try:
            await notification_service.notify_conversation_closing_soon(
                user_id=invitation.invited_user_id,
                conversation=conversation,
                db=db,
            )
        except Exception as e:
            logger.error(
                f"Failed to send closing warning to user {invitation.invited_user_id}: {e}",
                exc_info=True
            )


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


def calculate_period_start(period_end: datetime, interval: str) -> datetime:
    """
    Calculate the start of the analysis period based on interval.

    Args:
        period_end: End of the analysis period
        interval: Analysis interval (daily, weekly, biweekly, monthly)

    Returns:
        Start datetime of the period
    """
    if interval == "daily":
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
    if interval == "daily":
        return current + timedelta(days=1)
    elif interval == "weekly":
        return current + timedelta(weeks=1)
    elif interval == "biweekly":
        return current + timedelta(weeks=2)
    elif interval == "monthly":
        return current + timedelta(days=30)
    else:
        return current + timedelta(weeks=1)


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
    if interval == "daily":
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

        # Run windowed analysis
        analysis_service = AnalysisService()
        analysis_result = analysis_service.analyze_conversation_windowed(
            questions=questions,
            responses=responses,
            start_time=period_start,
            end_time=period_end,
            min_cluster_size=2
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

    except Exception as e:
        logger.error(f"Error running periodic analysis for conversation {conversation_id}: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()
        engine.dispose()


async def check_periodic_analyses():
    """
    Check for continuous conversations that need periodic analysis.

    Runs periodically and triggers analysis for conversations where:
    - is_continuous = True
    - analysis_interval is set
    - next_analysis_at <= now
    - state is ACTIVE
    """
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

        if conversations:
            logger.info(f"Found {len(conversations)} continuous conversation(s) needing periodic analysis")

        for conv in conversations:
            try:
                logger.info(f"Triggering periodic analysis for conversation {conv.id}")

                # Calculate analysis window
                period_end = conv.next_analysis_at
                period_start = calculate_period_start(period_end, conv.analysis_interval)

                # Check if there are responses in this window
                response_count = db.query(Response).filter(
                    Response.conversation_id == conv.id,
                    Response.submitted_at >= period_start,
                    Response.submitted_at < period_end
                ).count()

                if response_count > 0:
                    # Trigger analysis in background
                    task = asyncio.create_task(
                        asyncio.to_thread(
                            run_periodic_analysis_task,
                            conv.id,
                            period_start,
                            period_end,
                            conv.analysis_interval,
                            settings.DATABASE_URL
                        )
                    )
                    # Don't await - let it run in background
                else:
                    logger.info(f"No responses in period for conversation {conv.id}, skipping analysis")

                # Update next_analysis_at regardless (even if no responses, move to next period)
                conv.next_analysis_at = calculate_next_analysis_time(period_end, conv.analysis_interval)

            except Exception as e:
                logger.error(f"Error processing periodic analysis for {conv.id}: {e}", exc_info=True)

        if conversations:
            db.commit()

    except Exception as e:
        logger.error(f"Error in check_periodic_analyses: {e}", exc_info=True)
        db.rollback()
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

    # Add job to check for periodic analyses every 15 minutes
    scheduler.add_job(
        check_periodic_analyses,
        trigger=IntervalTrigger(minutes=15),
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

    scheduler.start()
    logger.info("Scheduler started with activation, closure, recurring instance, periodic analysis, and closing warning jobs")


def shutdown_scheduler():
    """Shutdown the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down")
    else:
        logger.warning("Scheduler was not running")

