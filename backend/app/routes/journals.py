"""Journal routes for individual mode.

Journals are user-facing entities backed by the Conversation model internally.
The API uses /journals/ as the primary resource, not /conversations/.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.conversation import Conversation
from app.models.response import Response
from app.models.question import Question
from app.models.journal_analysis import JournalAnalysis
from app.models.user import User
from app.schemas.journal import (
    JournalEntryCreate,
    JournalEntry,
    JournalEntryList,
    JournalStreak,
    JournalAnalysisResponse,
    JournalAnalysisStatus,
)

logger = logging.getLogger(__name__)

router = APIRouter()

MIN_ENTRIES_FOR_ANALYSIS = 3


# --- Helpers ---

def get_journal_or_404(
    journal_id: UUID,
    current_user: User,
    db: Session,
) -> Conversation:
    """Get a journal by ID, ensuring the current user is the owner."""
    journal = db.query(Conversation).filter(
        Conversation.id == journal_id,
        Conversation.is_individual == True,
        Conversation.journal_owner_id == current_user.id,
        Conversation.state != "deleted",
    ).first()

    if not journal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal not found"
        )
    return journal


def compute_streak(entries_dates: list[datetime], timezone: str = "UTC") -> JournalStreak:
    """Compute journal writing streak from entry dates."""
    if not entries_dates:
        return JournalStreak()

    try:
        tz = ZoneInfo(timezone)
    except Exception:
        tz = ZoneInfo("UTC")

    now = datetime.now(tz)
    today = now.date()

    # Convert to local dates, deduplicate, sort descending
    local_dates = sorted(set(
        e.replace(tzinfo=ZoneInfo("UTC")).astimezone(tz).date()
        for e in entries_dates
        if e is not None
    ), reverse=True)

    if not local_dates:
        return JournalStreak()

    # Current streak: count consecutive days from today (allow yesterday if no entry today)
    current_streak = 0
    start = today
    if local_dates[0] < today:
        # No entry today — start counting from yesterday
        start = today - timedelta(days=1)
        if local_dates[0] < start:
            # Last entry was before yesterday — streak is 0
            current_streak = 0
        else:
            current_streak = 1
            for i in range(1, len(local_dates)):
                expected = start - timedelta(days=i)
                if local_dates[i] == expected:
                    current_streak += 1
                else:
                    break
    else:
        # Entry today
        current_streak = 1
        for i in range(1, len(local_dates)):
            expected = today - timedelta(days=i)
            if local_dates[i] == expected:
                current_streak += 1
            else:
                break

    # Longest streak
    longest_streak = 1
    current_run = 1
    sorted_asc = sorted(local_dates)
    for i in range(1, len(sorted_asc)):
        if sorted_asc[i] == sorted_asc[i - 1] + timedelta(days=1):
            current_run += 1
            longest_streak = max(longest_streak, current_run)
        else:
            current_run = 1

    # Week/month counts
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)
    entries_this_week = sum(1 for d in local_dates if d >= week_start)
    entries_this_month = sum(1 for d in local_dates if d >= month_start)

    return JournalStreak(
        current_streak=current_streak,
        longest_streak=max(longest_streak, current_streak),
        total_entries=len(local_dates),
        entries_this_week=entries_this_week,
        entries_this_month=entries_this_month,
        last_entry_at=entries_dates[0] if entries_dates else None,  # already sorted desc by caller
    )


# --- Entry endpoints ---

@router.get(
    "/{journal_id}/entries",
    response_model=JournalEntryList,
)
async def list_journal_entries(
    journal_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List journal entries with streak information."""
    journal = get_journal_or_404(journal_id, current_user, db)

    # Get total count
    total_entries = db.query(func.count(Response.id)).filter(
        Response.conversation_id == journal.id,
        Response.status == "submitted",
    ).scalar() or 0

    # Get paginated entries
    order = Response.submitted_at.desc() if sort == "desc" else Response.submitted_at.asc()
    entries_query = db.query(Response).filter(
        Response.conversation_id == journal.id,
        Response.status == "submitted",
    ).order_by(order).offset(skip).limit(limit)

    entries = entries_query.all()

    # Get all submitted_at dates for streak calculation (limit to last 365)
    all_dates = db.query(Response.submitted_at).filter(
        Response.conversation_id == journal.id,
        Response.status == "submitted",
        Response.submitted_at.isnot(None),
    ).order_by(Response.submitted_at.desc()).limit(365).all()

    streak = compute_streak(
        [d[0] for d in all_dates],
        timezone=journal.timezone or "UTC",
    )
    streak.total_entries = total_entries

    return JournalEntryList(
        conversation_id=journal.id,
        total_entries=total_entries,
        entries=[
            JournalEntry(
                id=e.id,
                text=e.response_text or "",
                created_at=e.submitted_at or e.last_saved_at or datetime.utcnow(),
                is_edited=e.is_edited or False,
                edited_at=e.edited_at,
                word_count=len((e.response_text or "").split()),
            )
            for e in entries
        ],
        streak=streak,
    )


@router.post(
    "/{journal_id}/entries",
    response_model=JournalEntry,
    status_code=status.HTTP_201_CREATED,
)
async def create_journal_entry(
    journal_id: UUID,
    entry: JournalEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a new journal entry."""
    journal = get_journal_or_404(journal_id, current_user, db)

    # Get the journal's first question (journals have one question)
    question = db.query(Question).filter(
        Question.conversation_id == journal.id,
    ).order_by(Question.question_order).first()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Journal has no prompt configured"
        )

    now = datetime.utcnow()
    response = Response(
        conversation_id=journal.id,
        question_id=question.id,
        response_text=entry.text,
        participant_id=current_user.id,
        anonymity_level="platform_tracked",
        status="submitted",
        submitted_at=now,
    )
    db.add(response)
    db.commit()
    db.refresh(response)

    return JournalEntry(
        id=response.id,
        text=response.response_text or "",
        created_at=response.submitted_at or now,
        is_edited=False,
        edited_at=None,
        word_count=len((response.response_text or "").split()),
    )


@router.get(
    "/{journal_id}/entries/{entry_id}",
    response_model=JournalEntry,
)
async def get_journal_entry(
    journal_id: UUID,
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single journal entry."""
    journal = get_journal_or_404(journal_id, current_user, db)

    response = db.query(Response).filter(
        Response.id == entry_id,
        Response.conversation_id == journal.id,
        Response.status == "submitted",
    ).first()

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found"
        )

    return JournalEntry(
        id=response.id,
        text=response.response_text or "",
        created_at=response.submitted_at or datetime.utcnow(),
        is_edited=response.is_edited or False,
        edited_at=response.edited_at,
        word_count=len((response.response_text or "").split()),
    )


@router.patch(
    "/{journal_id}/entries/{entry_id}",
    response_model=JournalEntry,
)
async def update_journal_entry(
    journal_id: UUID,
    entry_id: UUID,
    entry: JournalEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit a journal entry."""
    journal = get_journal_or_404(journal_id, current_user, db)

    response = db.query(Response).filter(
        Response.id == entry_id,
        Response.conversation_id == journal.id,
        Response.status == "submitted",
    ).first()

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found"
        )

    now = datetime.utcnow()
    response.response_text = entry.text
    response.is_edited = True
    response.edited_at = now

    db.commit()
    db.refresh(response)

    return JournalEntry(
        id=response.id,
        text=response.response_text or "",
        created_at=response.submitted_at or now,
        is_edited=True,
        edited_at=response.edited_at,
        word_count=len((response.response_text or "").split()),
    )


# --- Analysis endpoints ---

@router.get(
    "/{journal_id}/analysis",
    response_model=JournalAnalysisStatus,
)
async def get_journal_analysis(
    journal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the latest journal analysis, or status if not yet available."""
    journal = get_journal_or_404(journal_id, current_user, db)

    total_entries = db.query(func.count(Response.id)).filter(
        Response.conversation_id == journal.id,
        Response.status == "submitted",
    ).scalar() or 0

    # Get latest analysis
    latest = db.query(JournalAnalysis).filter(
        JournalAnalysis.conversation_id == journal.id,
    ).order_by(JournalAnalysis.created_at.desc()).first()

    if not latest and total_entries < MIN_ENTRIES_FOR_ANALYSIS:
        return JournalAnalysisStatus(
            available=False,
            needs_more_entries=True,
            entries_until_analysis=MIN_ENTRIES_FOR_ANALYSIS - total_entries,
            total_entries=total_entries,
        )

    if not latest:
        return JournalAnalysisStatus(
            available=False,
            needs_more_entries=False,
            entries_until_analysis=0,
            total_entries=total_entries,
        )

    return JournalAnalysisStatus(
        available=True,
        needs_more_entries=False,
        entries_until_analysis=0,
        total_entries=total_entries,
        latest_analysis=JournalAnalysisResponse(
            id=latest.id,
            conversation_id=latest.conversation_id,
            overall_summary=latest.overall_summary,
            theme_timeline=latest.theme_timeline,
            mood_trajectory=latest.mood_trajectory,
            patterns=latest.patterns,
            total_entries_analyzed=latest.total_entries_analyzed,
            date_range_start=latest.date_range_start,
            date_range_end=latest.date_range_end,
            created_at=latest.created_at,
            updated_at=latest.updated_at,
        ),
    )


@router.post(
    "/{journal_id}/analyze",
    status_code=status.HTTP_202_ACCEPTED,
)
async def trigger_journal_analysis(
    journal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger journal analysis on-demand. Returns 202 Accepted."""
    journal = get_journal_or_404(journal_id, current_user, db)

    total_entries = db.query(func.count(Response.id)).filter(
        Response.conversation_id == journal.id,
        Response.status == "submitted",
    ).scalar() or 0

    if total_entries < MIN_ENTRIES_FOR_ANALYSIS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Need at least {MIN_ENTRIES_FOR_ANALYSIS} entries to run analysis. Currently have {total_entries}."
        )

    # TODO: Queue analysis job via background task or scheduler
    # For now, return accepted status. The analysis service will be
    # implemented in the analysis pipeline phase.
    logger.info(f"Journal analysis requested for journal {journal_id} by user {current_user.id}")

    return {
        "status": "accepted",
        "message": "Journal analysis has been queued",
        "total_entries": total_entries,
    }
