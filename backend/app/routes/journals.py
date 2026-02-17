"""Journal routes for individual mode.

Journals are user-facing entities backed by the Conversation model internally.
The API uses /journals/ as the primary resource, not /conversations/.
All conversation internals (access_code, anonymity_level, etc.) are hidden.
"""

import logging
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.conversation import Conversation
from app.models.response import Response
from app.models.question import Question
from app.models.journal_analysis import JournalAnalysis
from app.models.user import User
from app.schemas.journal import (
    JournalCreate,
    JournalUpdate,
    Journal,
    JournalListItem,
    JournalPrompt,
    JournalEntryCreate,
    JournalEntryUpdate,
    JournalEntry,
    JournalEntryList,
    EntryPromptResponse,
    JournalStreak,
    JournalAnalysisResponse,
    JournalAnalysisStatus,
)
from app.services.scheduler_service import calculate_next_analysis_time

logger = logging.getLogger(__name__)

router = APIRouter()

MIN_ENTRIES_FOR_ANALYSIS = 3


# --- Helpers ---

def _generate_access_code(length: int = 12) -> str:
    """Generate a random access code for the backing conversation."""
    alphabet = string.ascii_uppercase + string.digits
    alphabet = alphabet.replace('O', '').replace('0', '').replace('I', '').replace('1', '')
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def _get_journal_or_404(
    journal_id: UUID,
    current_user: User,
    db: Session,
    load_questions: bool = False,
) -> Conversation:
    """Get a journal by ID, ensuring the current user is the owner."""
    query = db.query(Conversation).filter(
        Conversation.id == journal_id,
        Conversation.is_individual == True,
        Conversation.journal_owner_id == current_user.id,
        Conversation.state != "deleted",
    )
    if load_questions:
        query = query.options(joinedload(Conversation.questions))
    journal = query.first()

    if not journal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Journal not found"
        )
    return journal


def _questions_to_prompts(questions: list[Question]) -> list[JournalPrompt]:
    """Convert Question records to JournalPrompt schemas."""
    return [
        JournalPrompt(
            id=q.id,
            text=q.question_text,
            type=q.question_type or "text",
            order_index=q.question_order,
            rating_min=q.options.get("rating_min") if q.options else None,
            rating_max=q.options.get("rating_max") if q.options else None,
            choices=q.options.get("choices") if q.options else None,
        )
        for q in sorted(questions, key=lambda q: q.question_order)
    ]


def _build_question_map(journal: Conversation, db: Session) -> dict[str, Question]:
    """Build a {question_id_str: Question} map for the journal."""
    questions = db.query(Question).filter(
        Question.conversation_id == journal.id,
    ).order_by(Question.question_order).all()
    return {str(q.id): q for q in questions}


def _get_entry_count(journal_id: UUID, db: Session) -> int:
    """Get total submitted entries for a journal."""
    return db.query(func.count(Response.id)).filter(
        Response.conversation_id == journal_id,
        Response.status == "submitted",
    ).scalar() or 0


def _has_analysis(journal_id: UUID, db: Session) -> bool:
    """Check if a journal has at least one analysis."""
    return db.query(JournalAnalysis.id).filter(
        JournalAnalysis.conversation_id == journal_id,
    ).first() is not None


def _response_to_entry(
    response: Response,
    entry_number: int,
    question_map: dict[str, Question],
) -> JournalEntry:
    """Convert a Response record to a JournalEntry schema."""
    # Parse structured per-prompt responses from response_data
    entry_responses = []
    if response.response_data and "entry_responses" in response.response_data:
        for r in response.response_data["entry_responses"]:
            pid = r.get("prompt_id", "")
            q = question_map.get(pid)
            entry_responses.append(EntryPromptResponse(
                prompt_id=pid,
                prompt_text=q.question_text if q else r.get("prompt_text", ""),
                type=q.question_type if q else r.get("type", "text"),
                text=r.get("text"),
                rating_value=r.get("rating_value"),
                choice_value=r.get("choice_value"),
            ))
    else:
        # Legacy: single-text entry without structured data
        # Find the first question to attach it to
        first_q = next(iter(question_map.values()), None)
        if first_q:
            entry_responses.append(EntryPromptResponse(
                prompt_id=first_q.id,
                prompt_text=first_q.question_text,
                type=first_q.question_type or "text",
                text=response.response_text,
            ))

    word_count = len((response.response_text or "").split())

    return JournalEntry(
        id=response.id,
        entry_number=entry_number,
        responses=entry_responses,
        created_at=response.submitted_at or response.last_saved_at or datetime.utcnow(),
        is_edited=response.is_edited or False,
        edited_at=response.edited_at,
        word_count=word_count,
    )


def _build_response_text(responses: list, question_map: dict[str, Question]) -> str:
    """Build concatenated response_text from per-prompt responses for analysis."""
    parts = []
    for r in responses:
        pid = str(r.prompt_id)
        q = question_map.get(pid)
        prompt_text = q.question_text if q else ""
        if r.text:
            parts.append(f"**{prompt_text}**\n{r.text}")
        elif r.rating_value is not None:
            parts.append(f"**{prompt_text}**\n{r.rating_value}")
        elif r.choice_value is not None:
            parts.append(f"**{prompt_text}**\n{r.choice_value}")
    return "\n\n".join(parts)


def _build_response_data(responses: list, question_map: dict[str, Question]) -> dict:
    """Build structured response_data JSONB for an entry."""
    return {
        "entry_responses": [
            {
                "prompt_id": str(r.prompt_id),
                "prompt_text": question_map[str(r.prompt_id)].question_text if str(r.prompt_id) in question_map else "",
                "type": question_map[str(r.prompt_id)].question_type if str(r.prompt_id) in question_map else "text",
                "text": r.text,
                "rating_value": r.rating_value,
                "choice_value": r.choice_value,
            }
            for r in responses
        ]
    }


def _compute_streak(entries_dates: list[datetime], timezone: str = "UTC") -> JournalStreak:
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

    # Current streak: count consecutive days from today (allow yesterday)
    current_streak = 0
    if local_dates[0] == today:
        current_streak = 1
        for i in range(1, len(local_dates)):
            if local_dates[i] == today - timedelta(days=i):
                current_streak += 1
            else:
                break
    elif local_dates[0] == today - timedelta(days=1):
        current_streak = 1
        for i in range(1, len(local_dates)):
            expected = local_dates[0] - timedelta(days=i)
            if local_dates[i] == expected:
                current_streak += 1
            else:
                break

    # Longest streak
    sorted_asc = sorted(local_dates)
    longest_streak = 1
    current_run = 1
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
        last_entry_at=entries_dates[0] if entries_dates else None,
    )


def _get_streak(journal: Conversation, db: Session) -> JournalStreak:
    """Compute streak for a journal."""
    all_dates = db.query(Response.submitted_at).filter(
        Response.conversation_id == journal.id,
        Response.status == "submitted",
        Response.submitted_at.isnot(None),
    ).order_by(Response.submitted_at.desc()).limit(365).all()

    streak = _compute_streak(
        [d[0] for d in all_dates],
        timezone=journal.timezone or "UTC",
    )
    # Override total_entries with exact count (streak calc may deduplicate dates)
    streak.total_entries = _get_entry_count(journal.id, db)
    return streak


# ============================================================
# Journal CRUD
# ============================================================

@router.post(
    "",
    response_model=Journal,
    status_code=status.HTTP_201_CREATED,
)
async def create_journal(
    data: JournalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new journal.

    Internally creates a Conversation with forced defaults for individual mode:
    continuous, no end date, periodic analysis, creator-only access.
    """
    now = datetime.utcnow()

    conversation = Conversation(
        creator_id=current_user.id,
        title=data.title,
        description=data.description,
        context_notes=data.description,  # Also set context_notes for AI analysis context
        access_code=_generate_access_code(),
        # Forced journal defaults
        is_individual=True,
        journal_owner_id=current_user.id,
        is_continuous=True,
        anonymity_level="platform_tracked",
        results_access="creator_only",
        invite_only=True,
        auto_analyze=True,
        show_verbatim_responses=True,
        allow_response_editing=True,
        manual_close_enabled=False,
        time_extension_enabled=False,
        state="active",
        activated_at=now,
        # Periodic analysis
        analysis_interval=data.analysis_interval.value,
        next_analysis_at=calculate_next_analysis_time(now, data.analysis_interval.value),
        timezone="UTC",
    )

    db.add(conversation)
    db.flush()

    # Create question records for each prompt
    for prompt in data.prompts:
        options = None
        if prompt.type == "rating":
            options = {
                "rating_min": prompt.rating_min or 1,
                "rating_max": prompt.rating_max or 10,
            }
        elif prompt.type == "single_choice" and prompt.choices:
            options = {"choices": prompt.choices}
        question = Question(
            conversation_id=conversation.id,
            question_text=prompt.text,
            question_type=prompt.type,
            question_order=prompt.order_index,
            options=options,
            is_required=True,
        )
        db.add(question)

    db.commit()
    db.refresh(conversation)

    questions = db.query(Question).filter(
        Question.conversation_id == conversation.id,
    ).order_by(Question.question_order).all()

    return Journal(
        id=conversation.id,
        title=conversation.title,
        description=conversation.description,
        prompts=_questions_to_prompts(questions),
        analysis_interval=conversation.analysis_interval,
        total_entries=0,
        streak=JournalStreak(),
        has_analysis=False,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@router.get(
    "",
    response_model=list[JournalListItem],
)
async def list_journals(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List the current user's journals."""
    journals = db.query(Conversation).filter(
        Conversation.is_individual == True,
        Conversation.journal_owner_id == current_user.id,
        Conversation.state != "deleted",
    ).order_by(Conversation.updated_at.desc()).offset(skip).limit(limit).all()

    results = []
    for j in journals:
        entry_count = _get_entry_count(j.id, db)

        # Get last entry timestamp
        last_entry = db.query(Response.submitted_at).filter(
            Response.conversation_id == j.id,
            Response.status == "submitted",
        ).order_by(Response.submitted_at.desc()).first()

        # Get prompt count
        prompt_count = db.query(func.count(Question.id)).filter(
            Question.conversation_id == j.id,
        ).scalar() or 0

        # Get streak (lightweight — just current_streak for list)
        streak = _get_streak(j, db)

        results.append(JournalListItem(
            id=j.id,
            title=j.title,
            description=j.description,
            prompt_count=prompt_count,
            total_entries=entry_count,
            current_streak=streak.current_streak,
            last_entry_at=last_entry[0] if last_entry else None,
            has_analysis=_has_analysis(j.id, db),
            analysis_interval=j.analysis_interval,
            created_at=j.created_at,
        ))

    return results


@router.get(
    "/{journal_id}",
    response_model=Journal,
)
async def get_journal(
    journal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a journal's full details."""
    journal = _get_journal_or_404(journal_id, current_user, db, load_questions=True)

    return Journal(
        id=journal.id,
        title=journal.title,
        description=journal.description,
        prompts=_questions_to_prompts(journal.questions),
        analysis_interval=journal.analysis_interval,
        total_entries=_get_entry_count(journal.id, db),
        streak=_get_streak(journal, db),
        has_analysis=_has_analysis(journal.id, db),
        created_at=journal.created_at,
        updated_at=journal.updated_at,
    )


@router.patch(
    "/{journal_id}",
    response_model=Journal,
)
async def update_journal(
    journal_id: UUID,
    data: JournalUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update journal settings."""
    journal = _get_journal_or_404(journal_id, current_user, db, load_questions=True)

    if data.title is not None:
        journal.title = data.title
    if data.description is not None:
        journal.description = data.description
        journal.context_notes = data.description
    if data.analysis_interval is not None:
        journal.analysis_interval = data.analysis_interval.value
        journal.next_analysis_at = calculate_next_analysis_time(
            datetime.utcnow(), data.analysis_interval.value
        )

    # Replace prompts if provided
    if data.prompts is not None:
        # Delete existing questions
        db.query(Question).filter(
            Question.conversation_id == journal.id,
        ).delete()

        # Create new questions
        for prompt in data.prompts:
            options = None
            if prompt.type == "rating":
                options = {
                    "rating_min": prompt.rating_min or 1,
                    "rating_max": prompt.rating_max or 10,
                }
            elif prompt.type == "single_choice" and prompt.choices:
                options = {"choices": prompt.choices}
            question = Question(
                conversation_id=journal.id,
                question_text=prompt.text,
                question_type=prompt.type,
                question_order=prompt.order_index,
                options=options,
                is_required=True,
            )
            db.add(question)

    db.commit()
    db.refresh(journal)

    questions = db.query(Question).filter(
        Question.conversation_id == journal.id,
    ).order_by(Question.question_order).all()

    return Journal(
        id=journal.id,
        title=journal.title,
        description=journal.description,
        prompts=_questions_to_prompts(questions),
        analysis_interval=journal.analysis_interval,
        total_entries=_get_entry_count(journal.id, db),
        streak=_get_streak(journal, db),
        has_analysis=_has_analysis(journal.id, db),
        created_at=journal.created_at,
        updated_at=journal.updated_at,
    )


@router.delete(
    "/{journal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_journal(
    journal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Soft-delete a journal."""
    journal = _get_journal_or_404(journal_id, current_user, db)
    journal.state = "deleted"
    db.commit()


# ============================================================
# Entry endpoints
# ============================================================

@router.get(
    "/{journal_id}/entries",
    response_model=JournalEntryList,
)
async def list_journal_entries(
    journal_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List journal entries with streak information."""
    journal = _get_journal_or_404(journal_id, current_user, db)

    total_entries = _get_entry_count(journal.id, db)

    # Get paginated entries (newest first)
    responses = db.query(Response).filter(
        Response.conversation_id == journal.id,
        Response.status == "submitted",
    ).order_by(Response.submitted_at.desc()).offset(skip).limit(limit).all()

    question_map = _build_question_map(journal, db)
    streak = _get_streak(journal, db)

    # Compute entry numbers (total - skip - index for descending order)
    entries = []
    for i, resp in enumerate(responses):
        entry_number = total_entries - skip - i
        entries.append(_response_to_entry(resp, entry_number, question_map))

    return JournalEntryList(
        journal_id=journal.id,
        total_entries=total_entries,
        has_more=(skip + limit) < total_entries,
        entries=entries,
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
    """Add a new journal entry with per-prompt responses."""
    journal = _get_journal_or_404(journal_id, current_user, db)
    question_map = _build_question_map(journal, db)

    if not question_map:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Journal has no prompts configured"
        )

    # Validate that all prompt_ids belong to this journal
    for r in entry.responses:
        if str(r.prompt_id) not in question_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Prompt {r.prompt_id} does not belong to this journal"
            )

    now = datetime.utcnow()
    first_question = next(iter(question_map.values()))

    response = Response(
        conversation_id=journal.id,
        question_id=first_question.id,  # FK points to first question
        response_text=_build_response_text(entry.responses, question_map),
        response_data=_build_response_data(entry.responses, question_map),
        participant_id=current_user.id,
        anonymity_level="platform_tracked",
        status="submitted",
        submitted_at=now,
    )
    db.add(response)
    db.commit()
    db.refresh(response)

    # Compute entry number
    entry_number = _get_entry_count(journal.id, db)

    return _response_to_entry(response, entry_number, question_map)


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
    journal = _get_journal_or_404(journal_id, current_user, db)

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

    question_map = _build_question_map(journal, db)

    # Compute this entry's number
    entries_before = db.query(func.count(Response.id)).filter(
        Response.conversation_id == journal.id,
        Response.status == "submitted",
        Response.submitted_at <= response.submitted_at,
    ).scalar() or 0

    return _response_to_entry(response, entries_before, question_map)


@router.patch(
    "/{journal_id}/entries/{entry_id}",
    response_model=JournalEntry,
)
async def update_journal_entry(
    journal_id: UUID,
    entry_id: UUID,
    entry: JournalEntryUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit a journal entry."""
    journal = _get_journal_or_404(journal_id, current_user, db)
    question_map = _build_question_map(journal, db)

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

    # Validate prompt_ids
    for r in entry.responses:
        if str(r.prompt_id) not in question_map:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Prompt {r.prompt_id} does not belong to this journal"
            )

    now = datetime.utcnow()
    response.response_text = _build_response_text(entry.responses, question_map)
    response.response_data = _build_response_data(entry.responses, question_map)
    response.is_edited = True
    response.edited_at = now

    db.commit()
    db.refresh(response)

    entries_before = db.query(func.count(Response.id)).filter(
        Response.conversation_id == journal.id,
        Response.status == "submitted",
        Response.submitted_at <= response.submitted_at,
    ).scalar() or 0

    return _response_to_entry(response, entries_before, question_map)


@router.delete(
    "/{journal_id}/entries/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_journal_entry(
    journal_id: UUID,
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a journal entry."""
    journal = _get_journal_or_404(journal_id, current_user, db)

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

    # Soft delete by changing status
    response.status = "deleted"
    db.commit()


# ============================================================
# Analysis endpoints
# ============================================================

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
    journal = _get_journal_or_404(journal_id, current_user, db)

    total_entries = _get_entry_count(journal.id, db)

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
            journal_id=latest.conversation_id,
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
    journal = _get_journal_or_404(journal_id, current_user, db)

    total_entries = _get_entry_count(journal.id, db)

    if total_entries < MIN_ENTRIES_FOR_ANALYSIS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Need at least {MIN_ENTRIES_FOR_ANALYSIS} entries to run analysis. Currently have {total_entries}."
        )

    # TODO: Queue analysis job via background task
    # The JournalAnalysisService will be implemented in the analysis pipeline phase.
    logger.info(f"Journal analysis requested for journal {journal_id} by user {current_user.id}")

    return {
        "status": "accepted",
        "message": "Journal analysis has been queued",
        "total_entries": total_entries,
    }


@router.get(
    "/{journal_id}/analyses",
    response_model=list[JournalAnalysisResponse],
)
async def list_journal_analyses(
    journal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all analyses for a journal."""
    journal = _get_journal_or_404(journal_id, current_user, db)

    analyses = db.query(JournalAnalysis).filter(
        JournalAnalysis.conversation_id == journal.id,
    ).order_by(JournalAnalysis.created_at.desc()).all()

    return [
        JournalAnalysisResponse(
            id=a.id,
            journal_id=a.conversation_id,
            overall_summary=a.overall_summary,
            theme_timeline=a.theme_timeline,
            mood_trajectory=a.mood_trajectory,
            patterns=a.patterns,
            total_entries_analyzed=a.total_entries_analyzed,
            date_range_start=a.date_range_start,
            date_range_end=a.date_range_end,
            created_at=a.created_at,
            updated_at=a.updated_at,
        )
        for a in analyses
    ]


# ============================================================
# Streak endpoint
# ============================================================

@router.get(
    "/{journal_id}/streak",
    response_model=JournalStreak,
)
async def get_journal_streak(
    journal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get streak information for a journal."""
    journal = _get_journal_or_404(journal_id, current_user, db)
    return _get_streak(journal, db)
