"""Journal routes for individual mode.

Journals are user-facing entities backed by a Journal model (which wraps a Conversation).
The API uses /journals/ as the primary resource. All conversation internals
(access_code, anonymity_level, etc.) are hidden from the user.
"""

import logging
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from zoneinfo import ZoneInfo

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.conversation import Conversation
from app.models.journal import Journal as JournalModel
from app.models.journal_template import JournalTemplate
from app.models.response import Response
from app.models.question import Question
from app.models.journal_analysis import JournalAnalysis
from app.models.journal_entry_analysis import JournalEntryAnalysis
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
    JournalEntryAnalysisResponse,
    JournalStreak,
    JournalAnalysisResponse,
    JournalAnalysisStatus,
    JournalTemplateResponse,
    JournalTemplatePrompt,
    JournalDraftSave,
    JournalDraftLoad,
    JournalDraftSaveResponse,
    _validate_frequency_pair,
)
from app.services.scheduler_service import calculate_next_analysis_time

logger = logging.getLogger(__name__)

router = APIRouter()

MIN_ENTRIES_FOR_ANALYSIS = 3


def run_journal_analysis_task(journal_id: UUID, db_url: str):
    """Background task to run journal analysis via LLM."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.services.journal_analysis_service import JournalAnalysisService

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        journal = db.query(JournalModel).filter(
            JournalModel.id == journal_id,
        ).first()
        if not journal:
            logger.error(f"Journal {journal_id} not found for analysis")
            return

        conv = journal.conversation

        questions = db.query(Question).filter(
            Question.conversation_id == conv.id,
        ).order_by(Question.question_order).all()
        question_map = {str(q.id): q for q in questions}

        # Check for previous analysis (windowed mode)
        previous_analysis = db.query(JournalAnalysis).filter(
            JournalAnalysis.conversation_id == conv.id,
        ).order_by(JournalAnalysis.created_at.desc()).first()

        prior_context = None

        if previous_analysis and previous_analysis.date_range_end:
            # Windowed: only fetch entries since last analysis
            responses = db.query(Response).filter(
                Response.conversation_id == conv.id,
                Response.status == "submitted",
                Response.submitted_at > previous_analysis.date_range_end,
            ).order_by(Response.submitted_at.asc()).all()

            if len(responses) < 1:
                logger.info(f"Journal {journal_id} has no new entries since last analysis, skipping")
                return

            # Build prior context from previous analysis
            prior_context = {
                "total_entries_analyzed": previous_analysis.total_entries_analyzed,
                "date_range_start": previous_analysis.date_range_start.strftime("%Y-%m-%d") if previous_analysis.date_range_start else "",
                "date_range_end": previous_analysis.date_range_end.strftime("%Y-%m-%d") if previous_analysis.date_range_end else "",
                "overall_summary": previous_analysis.overall_summary or "",
                "theme_timeline": previous_analysis.theme_timeline or [],
                "patterns": previous_analysis.patterns or [],
            }
        else:
            # First analysis: fetch all responses
            responses = db.query(Response).filter(
                Response.conversation_id == conv.id,
                Response.status == "submitted",
            ).order_by(Response.submitted_at.asc()).all()

            if len(responses) < MIN_ENTRIES_FOR_ANALYSIS:
                logger.warning(f"Journal {journal_id} has fewer than {MIN_ENTRIES_FOR_ANALYSIS} entries, skipping analysis")
                return

        # Build entries list for the analysis service
        entries = []
        for i, resp in enumerate(responses, 1):
            entry_responses = []
            if resp.response_data and "entry_responses" in resp.response_data:
                for r in resp.response_data["entry_responses"]:
                    pid = r.get("prompt_id", "")
                    q = question_map.get(pid)
                    entry_responses.append({
                        "prompt_text": q.question_text if q else r.get("prompt_text", ""),
                        "type": q.question_type if q else r.get("type", "text"),
                        "text": r.get("text"),
                        "rating_value": r.get("rating_value"),
                        "choice_value": r.get("choice_value"),
                    })
            else:
                # Legacy single-text entry
                first_q = next(iter(question_map.values()), None)
                if first_q:
                    entry_responses.append({
                        "prompt_text": first_q.question_text,
                        "type": "text",
                        "text": resp.response_text,
                    })

            entry_date = resp.submitted_at or resp.last_saved_at
            entries.append({
                "entry_number": i,
                "date": entry_date.strftime("%Y-%m-%d") if entry_date else "",
                "responses": entry_responses,
            })

        # Build prompt definitions for context
        prompts = []
        for q in questions:
            p = {"text": q.question_text, "type": q.question_type or "text"}
            if q.options:
                p.update(q.options)
            prompts.append(p)

        # Run analysis
        service = JournalAnalysisService()
        results = service.analyze_journal(
            entries=entries,
            journal_title=conv.title,
            journal_description=conv.description,
            prompts=prompts,
            prior_context=prior_context,
        )

        # Determine date range
        date_range_start = responses[0].submitted_at or responses[0].last_saved_at
        date_range_end = responses[-1].submitted_at or responses[-1].last_saved_at

        # Store results
        analysis = JournalAnalysis(
            conversation_id=conv.id,
            overall_summary=results.get("overall_summary"),
            theme_timeline=results.get("theme_timeline"),
            mood_trajectory=results.get("mood_trajectory"),
            patterns=results.get("patterns"),
            total_entries_analyzed=len(entries),
            date_range_start=date_range_start,
            date_range_end=date_range_end,
            llm_provider=results.get("llm_provider"),
            llm_model=results.get("llm_model"),
            analysis_duration_ms=results.get("analysis_duration_ms"),
        )
        db.add(analysis)
        db.commit()

        logger.info(f"Journal analysis completed for {journal_id}: {len(entries)} entries analyzed in {results.get('analysis_duration_ms', 0)}ms")

    except Exception as e:
        logger.error(f"Journal analysis failed for {journal_id}: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()
        engine.dispose()


def run_entry_analysis_task(response_id: UUID, journal_id: UUID, db_url: str):
    """Background task to run per-entry analysis via LLM."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.services.journal_analysis_service import JournalAnalysisService

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        journal = db.query(JournalModel).filter(
            JournalModel.id == journal_id,
        ).first()
        if not journal:
            logger.error(f"Journal {journal_id} not found for entry analysis")
            return

        conv = journal.conversation

        response = db.query(Response).filter(
            Response.id == response_id,
            Response.status == "submitted",
        ).first()
        if not response:
            logger.error(f"Response {response_id} not found for entry analysis")
            return

        # Check if analysis already exists
        existing = db.query(JournalEntryAnalysis).filter(
            JournalEntryAnalysis.response_id == response_id,
        ).first()
        if existing:
            return

        questions = db.query(Question).filter(
            Question.conversation_id == conv.id,
        ).order_by(Question.question_order).all()
        question_map = {str(q.id): q for q in questions}

        # Build current entry dict
        entry_responses = []
        if response.response_data and "entry_responses" in response.response_data:
            for r in response.response_data["entry_responses"]:
                pid = r.get("prompt_id", "")
                q = question_map.get(pid)
                entry_responses.append({
                    "prompt_text": q.question_text if q else r.get("prompt_text", ""),
                    "type": q.question_type if q else r.get("type", "text"),
                    "text": r.get("text"),
                    "rating_value": r.get("rating_value"),
                    "choice_value": r.get("choice_value"),
                })

        entry_date = response.submitted_at or response.last_saved_at
        entry_number = db.query(func.count(Response.id)).filter(
            Response.conversation_id == conv.id,
            Response.status == "submitted",
            Response.submitted_at <= response.submitted_at,
        ).scalar() or 1

        current_entry = {
            "entry_number": entry_number,
            "date": entry_date.strftime("%Y-%m-%d") if entry_date else "",
            "responses": entry_responses,
        }

        # Fetch last 5 previous entries for connection context
        recent_responses = db.query(Response).filter(
            Response.conversation_id == conv.id,
            Response.status == "submitted",
            Response.id != response_id,
        ).order_by(Response.submitted_at.desc()).limit(5).all()

        recent_entries = []
        for i, resp in enumerate(reversed(recent_responses)):
            resp_entries = []
            if resp.response_data and "entry_responses" in resp.response_data:
                for r in resp.response_data["entry_responses"]:
                    pid = r.get("prompt_id", "")
                    q = question_map.get(pid)
                    resp_entries.append({
                        "prompt_text": q.question_text if q else r.get("prompt_text", ""),
                        "type": q.question_type if q else r.get("type", "text"),
                        "text": r.get("text"),
                        "rating_value": r.get("rating_value"),
                        "choice_value": r.get("choice_value"),
                    })
            rd = resp.submitted_at or resp.last_saved_at
            recent_entries.append({
                "entry_number": i + 1,
                "date": rd.strftime("%Y-%m-%d") if rd else "",
                "responses": resp_entries,
            })

        # Build prompt definitions
        prompts = []
        for q in questions:
            p = {"text": q.question_text, "type": q.question_type or "text"}
            if q.options:
                p.update(q.options)
            prompts.append(p)

        # Run analysis
        service = JournalAnalysisService()
        results = service.analyze_entry(
            entry=current_entry,
            journal_title=conv.title,
            journal_description=conv.description,
            prompts=prompts,
            recent_entries=recent_entries if recent_entries else None,
        )

        # Store results
        entry_analysis = JournalEntryAnalysis(
            response_id=response_id,
            conversation_id=conv.id,
            themes=results.get("themes"),
            mood_score=results.get("mood_score"),
            mood_label=results.get("mood_label"),
            key_takeaway=results.get("key_takeaway"),
            connections=results.get("connections"),
            suggested_followups=results.get("suggested_followups"),
            llm_provider=results.get("llm_provider"),
            llm_model=results.get("llm_model"),
            analysis_duration_ms=results.get("analysis_duration_ms"),
        )
        db.add(entry_analysis)
        db.commit()

        logger.info(f"Entry analysis completed for response {response_id} in {results.get('analysis_duration_ms', 0)}ms")

    except Exception as e:
        logger.error(f"Entry analysis failed for response {response_id}: {e}", exc_info=True)
        db.rollback()
    finally:
        db.close()
        engine.dispose()


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
) -> JournalModel:
    """Get a journal by ID, ensuring the current user is the owner."""
    query = db.query(JournalModel).join(Conversation).filter(
        JournalModel.id == journal_id,
        JournalModel.owner_id == current_user.id,
        Conversation.state != "deleted",
    )
    if load_questions:
        query = query.options(joinedload(JournalModel.conversation).joinedload(Conversation.questions))
    else:
        query = query.options(joinedload(JournalModel.conversation))
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


def _build_question_map(conv: Conversation, db: Session) -> dict[str, Question]:
    """Build a {question_id_str: Question} map for the journal's conversation."""
    questions = db.query(Question).filter(
        Question.conversation_id == conv.id,
    ).order_by(Question.question_order).all()
    return {str(q.id): q for q in questions}


def _get_entry_count(conversation_id: UUID, db: Session) -> int:
    """Get total submitted entries for a journal."""
    return db.query(func.count(Response.id)).filter(
        Response.conversation_id == conversation_id,
        Response.status == "submitted",
    ).scalar() or 0


def _has_analysis(conversation_id: UUID, db: Session) -> bool:
    """Check if a journal has at least one analysis."""
    return db.query(JournalAnalysis.id).filter(
        JournalAnalysis.conversation_id == conversation_id,
    ).first() is not None


def _response_to_entry(
    response: Response,
    entry_number: int,
    question_map: dict[str, Question],
    entry_analysis: JournalEntryAnalysis | None = None,
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

    analysis_data = None
    if entry_analysis:
        analysis_data = JournalEntryAnalysisResponse(
            id=entry_analysis.id,
            themes=entry_analysis.themes or [],
            mood_score=entry_analysis.mood_score or 0.0,
            mood_label=entry_analysis.mood_label or "",
            key_takeaway=entry_analysis.key_takeaway or "",
            connections=entry_analysis.connections or "",
            suggested_followups=entry_analysis.suggested_followups or [],
            created_at=entry_analysis.created_at,
        )

    return JournalEntry(
        id=response.id,
        entry_number=entry_number,
        responses=entry_responses,
        created_at=response.submitted_at or response.last_saved_at or datetime.utcnow(),
        is_edited=response.is_edited or False,
        edited_at=response.edited_at,
        word_count=word_count,
        analysis=analysis_data,
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


def _get_streak(journal: JournalModel, db: Session) -> JournalStreak:
    """Compute streak for a journal."""
    conv = journal.conversation
    all_dates = db.query(Response.submitted_at).filter(
        Response.conversation_id == conv.id,
        Response.status == "submitted",
        Response.submitted_at.isnot(None),
    ).order_by(Response.submitted_at.desc()).limit(365).all()

    streak = _compute_streak(
        [d[0] for d in all_dates],
        timezone=conv.timezone or "UTC",
    )
    # Override total_entries with exact count (streak calc may deduplicate dates)
    streak.total_entries = _get_entry_count(conv.id, db)
    return streak


def _get_period_start(frequency: str, now: datetime) -> datetime | None:
    """Compute the start of the current period for frequency enforcement."""
    bounds = _get_period_bounds(frequency, now)
    return bounds[0] if bounds else None


def _get_period_bounds(frequency: str, dt: datetime) -> tuple[datetime, datetime] | None:
    """Return (start, end_exclusive) for the period containing dt.

    Returns None for unlimited frequency (no enforcement).
    """
    if frequency == "every_minute":
        start = dt.replace(second=0, microsecond=0)
        end = start + timedelta(minutes=1)
    elif frequency == "daily":
        start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=1)
    elif frequency == "weekly":
        start = (dt - timedelta(days=dt.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=7)
    elif frequency == "biweekly":
        week_num = dt.isocalendar()[1]
        days_back = dt.weekday() + (7 if week_num % 2 == 0 else 0)
        start = (dt - timedelta(days=days_back)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = start + timedelta(days=14)
    elif frequency == "monthly":
        start = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        # First day of next month
        if start.month == 12:
            end = start.replace(year=start.year + 1, month=1)
        else:
            end = start.replace(month=start.month + 1)
    else:
        return None  # unlimited — no enforcement
    return (start, end)


def _require_journals_flag(current_user: User, db: Session) -> str:
    """Check journals feature flag, return tier. Raises 403 if disabled."""
    from app.services.feature_flag_service import feature_flag_service
    from app.services.subscription_service import subscription_service

    tier = subscription_service.get_tier(db, user_id=current_user.id)
    if not feature_flag_service.is_enabled(
        db, "journals",
        tier=tier,
        user_id=current_user.id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Journals are not available for your account",
        )
    return tier


def _build_journal_response(journal: JournalModel, questions: list[Question], db: Session) -> Journal:
    """Build a Journal schema response from a JournalModel."""
    conv = journal.conversation
    return Journal(
        id=journal.id,
        title=conv.title,
        description=conv.description,
        prompts=_questions_to_prompts(questions),
        analysis_interval=conv.analysis_interval,
        entry_frequency=journal.entry_frequency,
        strict_frequency=journal.strict_frequency,
        total_entries=_get_entry_count(conv.id, db),
        streak=_get_streak(journal, db),
        has_analysis=_has_analysis(conv.id, db),
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


# ============================================================
# Templates (public, no auth)
# ============================================================

@router.get(
    "/templates",
    response_model=list[JournalTemplateResponse],
)
async def list_journal_templates(
    db: Session = Depends(get_db),
):
    """List active journal templates. Public endpoint (no auth required)."""
    templates = db.query(JournalTemplate).filter(
        JournalTemplate.is_active == True,
    ).order_by(JournalTemplate.display_order).all()

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

    Creates a backing Conversation with forced defaults, then a Journal record.
    """
    from app.services.feature_flag_service import feature_flag_service

    tier = _require_journals_flag(current_user, db)

    # Check max_journals limit
    max_journals = feature_flag_service.get_config_value(
        db, "journals", "max_journals",
        tier=tier,
        user_id=current_user.id,
    )
    if max_journals is not None and max_journals != -1:
        current_count = db.query(func.count(JournalModel.id)).join(Conversation).filter(
            JournalModel.owner_id == current_user.id,
            Conversation.state != "deleted",
        ).scalar() or 0
        if current_count >= max_journals:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Journal limit reached ({max_journals}). Upgrade your plan for more.",
            )

    now = datetime.utcnow()

    conversation = Conversation(
        creator_id=current_user.id,
        title=data.title,
        description=data.description,
        context_notes=data.description,  # Also set context_notes for AI analysis context
        access_code=_generate_access_code(),
        # Forced journal defaults
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

    # Create Journal record
    journal = JournalModel(
        conversation_id=conversation.id,
        owner_id=current_user.id,
        entry_frequency=data.entry_frequency.value if data.entry_frequency else None,
        strict_frequency=data.strict_frequency,
    )
    db.add(journal)
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
    db.refresh(journal)

    questions = db.query(Question).filter(
        Question.conversation_id == conversation.id,
    ).order_by(Question.question_order).all()

    return _build_journal_response(journal, questions, db)


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
    _require_journals_flag(current_user, db)

    journals = db.query(JournalModel).join(Conversation).filter(
        JournalModel.owner_id == current_user.id,
        Conversation.state != "deleted",
    ).options(
        joinedload(JournalModel.conversation),
    ).order_by(Conversation.updated_at.desc()).offset(skip).limit(limit).all()

    results = []
    for j in journals:
        conv = j.conversation
        entry_count = _get_entry_count(conv.id, db)

        # Get last entry timestamp
        last_entry = db.query(Response.submitted_at).filter(
            Response.conversation_id == conv.id,
            Response.status == "submitted",
        ).order_by(Response.submitted_at.desc()).first()

        # Get prompt count
        prompt_count = db.query(func.count(Question.id)).filter(
            Question.conversation_id == conv.id,
        ).scalar() or 0

        # Get streak (lightweight — just current_streak for list)
        streak = _get_streak(j, db)

        results.append(JournalListItem(
            id=j.id,
            title=conv.title,
            description=conv.description,
            prompt_count=prompt_count,
            total_entries=entry_count,
            current_streak=streak.current_streak,
            last_entry_at=last_entry[0] if last_entry else None,
            has_analysis=_has_analysis(conv.id, db),
            analysis_interval=conv.analysis_interval,
            entry_frequency=j.entry_frequency,
            strict_frequency=j.strict_frequency,
            created_at=conv.created_at,
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
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db, load_questions=True)
    conv = journal.conversation

    return _build_journal_response(journal, conv.questions, db)


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
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db, load_questions=True)
    conv = journal.conversation

    if data.title is not None:
        conv.title = data.title
    if data.description is not None:
        conv.description = data.description
        conv.context_notes = data.description
    if data.analysis_interval is not None:
        conv.analysis_interval = data.analysis_interval.value
        conv.next_analysis_at = calculate_next_analysis_time(
            datetime.utcnow(), data.analysis_interval.value
        )

    # Journal-specific fields
    if data.entry_frequency is not None:
        journal.entry_frequency = data.entry_frequency.value if data.entry_frequency.value != "unlimited" else None
    if data.strict_frequency is not None:
        journal.strict_frequency = data.strict_frequency

    # Validate resolved frequency pair before commit
    resolved_entry_freq = journal.entry_frequency
    resolved_analysis_interval = conv.analysis_interval
    try:
        _validate_frequency_pair(resolved_entry_freq, resolved_analysis_interval)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    # Replace prompts if provided
    if data.prompts is not None:
        # Delete existing questions
        db.query(Question).filter(
            Question.conversation_id == conv.id,
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
                conversation_id=conv.id,
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
        Question.conversation_id == conv.id,
    ).order_by(Question.question_order).all()

    return _build_journal_response(journal, questions, db)


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
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    journal.conversation.state = "deleted"
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
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    conv = journal.conversation

    total_entries = _get_entry_count(conv.id, db)

    # Get paginated entries (newest first)
    responses = db.query(Response).filter(
        Response.conversation_id == conv.id,
        Response.status == "submitted",
    ).order_by(Response.submitted_at.desc()).offset(skip).limit(limit).all()

    question_map = _build_question_map(conv, db)
    streak = _get_streak(journal, db)

    # Batch-load entry analyses for these responses
    response_ids = [r.id for r in responses]
    entry_analyses = {}
    if response_ids:
        analyses = db.query(JournalEntryAnalysis).filter(
            JournalEntryAnalysis.response_id.in_(response_ids),
        ).all()
        entry_analyses = {a.response_id: a for a in analyses}

    # Compute entry numbers (total - skip - index for descending order)
    entries = []
    for i, resp in enumerate(responses):
        entry_number = total_entries - skip - i
        entries.append(_response_to_entry(resp, entry_number, question_map, entry_analyses.get(resp.id)))

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
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a new journal entry with per-prompt responses."""
    from app.services.feature_flag_service import feature_flag_service

    tier = _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    conv = journal.conversation

    # Check max_entries_per_journal limit
    max_entries = feature_flag_service.get_config_value(
        db, "journals", "max_entries_per_journal",
        tier=tier,
        user_id=current_user.id,
    )
    if max_entries is not None and max_entries != -1:
        current_entries = _get_entry_count(conv.id, db)
        if current_entries >= max_entries:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Entry limit reached ({max_entries} per journal). Upgrade your plan for more.",
            )

    question_map = _build_question_map(conv, db)

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

    # Determine target datetime (for retroactive entries)
    if entry.entry_date is not None:
        target_date = entry.entry_date
        # Target noon UTC on the specified date
        target_dt = datetime(target_date.year, target_date.month, target_date.day, 12, 0, 0)

        # Validate: entry_date must be within current period + 2 previous periods
        if journal.entry_frequency and journal.entry_frequency != "unlimited":
            current_bounds = _get_period_bounds(journal.entry_frequency, now)
            if current_bounds:
                # Walk back 2 periods to find the oldest allowed start
                oldest_start = current_bounds[0]
                for _ in range(2):
                    prev_bounds = _get_period_bounds(journal.entry_frequency, oldest_start - timedelta(seconds=1))
                    if prev_bounds:
                        oldest_start = prev_bounds[0]
                    else:
                        break

                if target_dt < oldest_start or target_dt >= current_bounds[1]:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Entry date is outside the allowed range (current period + 2 previous periods)"
                    )
        elif not journal.entry_frequency:
            # No frequency set — still don't allow future dates
            tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            if target_dt >= tomorrow:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot create entries for future dates"
                )
    else:
        target_dt = now

    # Strict frequency enforcement using bounded period
    if journal.strict_frequency and journal.entry_frequency:
        bounds = _get_period_bounds(journal.entry_frequency, target_dt)
        if bounds is not None:
            period_start, period_end = bounds
            existing = db.query(Response.id).filter(
                Response.conversation_id == conv.id,
                Response.status == "submitted",
                Response.submitted_at >= period_start,
                Response.submitted_at < period_end,
            ).first()
            if existing:
                freq_label = journal.entry_frequency.replace("_", " ")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"You've already written an entry for this {freq_label} period. Try again later."
                )

    first_question = next(iter(question_map.values()))

    response = Response(
        conversation_id=conv.id,
        question_id=first_question.id,  # FK points to first question
        response_text=_build_response_text(entry.responses, question_map),
        response_data=_build_response_data(entry.responses, question_map),
        participant_id=current_user.id,
        anonymity_level="platform_tracked",
        status="submitted",
        submitted_at=target_dt,
    )
    db.add(response)

    # Clear any existing draft for this user/journal
    db.query(Response).filter(
        Response.conversation_id == conv.id,
        Response.participant_id == current_user.id,
        Response.status == "draft",
    ).delete()

    db.commit()
    db.refresh(response)

    # Queue per-entry analysis in background
    from app.core.config import settings
    background_tasks.add_task(
        run_entry_analysis_task,
        response_id=response.id,
        journal_id=journal.id,
        db_url=str(settings.DATABASE_URL),
    )

    # Compute entry number
    entry_number = _get_entry_count(conv.id, db)

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
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    conv = journal.conversation

    response = db.query(Response).filter(
        Response.id == entry_id,
        Response.conversation_id == conv.id,
        Response.status == "submitted",
    ).first()

    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entry not found"
        )

    question_map = _build_question_map(conv, db)

    # Load entry analysis
    entry_analysis = db.query(JournalEntryAnalysis).filter(
        JournalEntryAnalysis.response_id == entry_id,
    ).first()

    # Compute this entry's number
    entries_before = db.query(func.count(Response.id)).filter(
        Response.conversation_id == conv.id,
        Response.status == "submitted",
        Response.submitted_at <= response.submitted_at,
    ).scalar() or 0

    return _response_to_entry(response, entries_before, question_map, entry_analysis)


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
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    conv = journal.conversation
    question_map = _build_question_map(conv, db)

    response = db.query(Response).filter(
        Response.id == entry_id,
        Response.conversation_id == conv.id,
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
        Response.conversation_id == conv.id,
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
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    conv = journal.conversation

    response = db.query(Response).filter(
        Response.id == entry_id,
        Response.conversation_id == conv.id,
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
# Draft endpoints
# ============================================================

@router.post(
    "/{journal_id}/draft",
    response_model=JournalDraftSaveResponse,
)
async def save_journal_draft(
    journal_id: UUID,
    data: JournalDraftSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Save or update a journal entry draft."""
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    conv = journal.conversation
    question_map = _build_question_map(conv, db)

    if not question_map:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Journal has no prompts configured"
        )

    now = datetime.utcnow()
    first_question = next(iter(question_map.values()))

    # Upsert: delete existing draft, create new one
    db.query(Response).filter(
        Response.conversation_id == conv.id,
        Response.participant_id == current_user.id,
        Response.status == "draft",
    ).delete()

    draft_data = {
        "responses": data.responses,
        "rating_responses": data.rating_responses,
        "choice_responses": data.choice_responses,
    }

    draft = Response(
        conversation_id=conv.id,
        question_id=first_question.id,
        response_data=draft_data,
        participant_id=current_user.id,
        anonymity_level="platform_tracked",
        status="draft",
        submitted_at=now,
    )
    db.add(draft)
    db.commit()

    return JournalDraftSaveResponse(
        success=True,
        last_saved_at=now,
        message="Draft saved",
    )


@router.get(
    "/{journal_id}/draft",
    response_model=JournalDraftLoad,
)
async def load_journal_draft(
    journal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Load the current draft for a journal."""
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    conv = journal.conversation

    draft = db.query(Response).filter(
        Response.conversation_id == conv.id,
        Response.participant_id == current_user.id,
        Response.status == "draft",
    ).first()

    if not draft or not draft.response_data:
        return JournalDraftLoad(has_draft=False)

    return JournalDraftLoad(
        has_draft=True,
        last_saved_at=draft.submitted_at,
        responses=draft.response_data.get("responses", {}),
        rating_responses=draft.response_data.get("rating_responses", {}),
        choice_responses=draft.response_data.get("choice_responses", {}),
    )


@router.delete(
    "/{journal_id}/draft",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_journal_draft(
    journal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete the current draft for a journal."""
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    conv = journal.conversation

    db.query(Response).filter(
        Response.conversation_id == conv.id,
        Response.participant_id == current_user.id,
        Response.status == "draft",
    ).delete()
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
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    conv = journal.conversation

    total_entries = _get_entry_count(conv.id, db)

    latest = db.query(JournalAnalysis).filter(
        JournalAnalysis.conversation_id == conv.id,
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
            journal_id=journal.id,
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
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger journal analysis on-demand. Returns 202 Accepted."""
    from app.core.config import settings
    from app.services.feature_flag_service import feature_flag_service
    from app.services.usage_service import usage_service

    tier = _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    conv = journal.conversation

    # Check journal_analyses_per_month limit
    limit = feature_flag_service.get_config_value(
        db, "journals", "journal_analyses_per_month",
        tier=tier,
        user_id=current_user.id,
    )
    if limit is not None and limit != -1:
        is_allowed, current_usage = usage_service.check_limit(
            db, "journal_analyses", limit,
            user_id=current_user.id,
        )
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "LIMIT_REACHED",
                    "feature": "journal_analyses",
                    "limit": limit,
                    "usage": current_usage,
                    "message": f"Monthly analysis limit reached ({current_usage}/{limit}). Upgrade your plan for more.",
                },
            )

    total_entries = _get_entry_count(conv.id, db)

    # Check if there's a previous analysis (windowed mode needs only 1 new entry)
    has_previous = db.query(JournalAnalysis.id).filter(
        JournalAnalysis.conversation_id == conv.id,
    ).first() is not None

    if not has_previous and total_entries < MIN_ENTRIES_FOR_ANALYSIS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Need at least {MIN_ENTRIES_FOR_ANALYSIS} entries to run analysis. Currently have {total_entries}."
        )

    # Increment usage before queuing work
    usage_service.increment_usage(
        db, "journal_analyses",
        user_id=current_user.id,
    )

    background_tasks.add_task(
        run_journal_analysis_task,
        journal_id=journal.id,
        db_url=str(settings.DATABASE_URL),
    )

    logger.info(f"Journal analysis queued for journal {journal_id} by user {current_user.id}")

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
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    conv = journal.conversation

    analyses = db.query(JournalAnalysis).filter(
        JournalAnalysis.conversation_id == conv.id,
    ).order_by(JournalAnalysis.created_at.desc()).all()

    return [
        JournalAnalysisResponse(
            id=a.id,
            journal_id=journal.id,
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
    "/{journal_id}/entry-dates",
)
async def get_journal_entry_dates(
    journal_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all entry dates for a journal (lightweight, no pagination)."""
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    conv = journal.conversation

    rows = db.query(Response.id, Response.submitted_at).filter(
        Response.conversation_id == conv.id,
        Response.status == "submitted",
        Response.submitted_at.isnot(None),
    ).order_by(Response.submitted_at.asc()).all()

    return [
        {
            "date": row.submitted_at.strftime("%Y-%m-%d"),
            "entry_id": str(row.id),
        }
        for row in rows
    ]


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
    _require_journals_flag(current_user, db)
    journal = _get_journal_or_404(journal_id, current_user, db)
    return _get_streak(journal, db)
