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
from app.schemas.conversation import ConversationState
from app.routes.analysis import run_analysis_task
import logging
import asyncio

logger = logging.getLogger(__name__)

# Initialize scheduler
scheduler = AsyncIOScheduler()


async def check_scheduled_activations():
    """Check for conversations that should be activated."""
    db: Session = SessionLocal()
    try:
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
    except Exception as e:
        logger.error(f"Error checking scheduled activations: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()


async def check_scheduled_closures():
    """Check for conversations that should be closed."""
    db: Session = SessionLocal()
    try:
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
    
    scheduler.start()
    logger.info("Scheduler started with activation and closure check jobs")


def shutdown_scheduler():
    """Shutdown the scheduler."""
    if scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler shut down")
    else:
        logger.warning("Scheduler was not running")

