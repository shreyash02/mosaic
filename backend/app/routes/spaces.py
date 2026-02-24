"""Routes for the Spaces feature (second-brain ideas with auto-organization)."""

import logging
import secrets
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.space import Space
from app.models.space_member import SpaceMember
from app.models.space_invitation import SpaceInvitation
from app.models.idea import Idea
from app.models.theme import Theme
from app.models.idea_theme import IdeaTheme
from app.models.theme_connection import ThemeConnection
from app.models.user import User
from app.models.synthesis_action import SynthesisAction
from app.schemas.space import (
    SpaceCreate,
    SpaceUpdate,
    SpaceResponse,
    SpaceListItem,
    SpaceMemberResponse,
    SpaceInviteRequest,
    SpaceInvitationResponse,
    IdeaCreate,
    IdeaUpdate,
    IdeaResponse,
    IdeaThemeAssignment,
    ThemeResponse,
    ThemeUpdate,
    ThemeMerge,
    GraphData,
    OrganizeRunResponse,
    ThemeEventResponse,
    SynthesisNoteStateUpdate,
    SynthesisActivityEntry,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Helpers ---

def _require_spaces_flag(current_user: User, db: Session) -> str:
    """Check spaces feature flag, return tier. Raises 403 if disabled."""
    from app.services.feature_flag_service import feature_flag_service
    from app.services.subscription_service import subscription_service
    from app.services.platform_settings_service import is_spaces_enabled

    # Platform-level kill switch
    if not is_spaces_enabled(db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Spaces are not currently available",
        )

    tier = subscription_service.get_tier(db, user_id=current_user.id)
    if not feature_flag_service.is_enabled(
        db, "spaces",
        tier=tier,
        user_id=current_user.id,
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Spaces are not available for your account",
        )
    return tier


def _get_space_or_404(space_id: UUID, current_user: User, db: Session) -> Space:
    """Get a space if user is the owner or a member. Raises 404 otherwise."""
    space = db.query(Space).filter(Space.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    if space.owner_id == current_user.id:
        return space
    member = db.query(SpaceMember).filter(
        SpaceMember.space_id == space_id,
        SpaceMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


def _require_space_owner(space: Space, current_user: User) -> None:
    """Raise 403 if the current user is not the space owner."""
    if space.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the space owner can perform this action",
        )


def _require_space_editor(space_id: UUID, current_user: User, db: Session) -> None:
    """Raise 403 if the current user is a viewer (read-only). Owners and editors pass."""
    member = db.query(SpaceMember).filter(
        SpaceMember.space_id == space_id,
        SpaceMember.user_id == current_user.id,
    ).first()
    if member and member.role == "viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You have view-only access to this space",
        )


def _get_space_member_ids(db: Session, space_id: UUID) -> List[UUID]:
    """Get all member user IDs for a space (including owner)."""
    return [
        row[0] for row in
        db.query(SpaceMember.user_id).filter(SpaceMember.space_id == space_id).all()
    ]


def _get_space_purpose(space: Space) -> str:
    """Read purpose from settings JSONB, defaulting to 'explore'."""
    if space.settings and isinstance(space.settings, dict):
        return space.settings.get("purpose", "explore")
    return "explore"


PURPOSE_DESCRIPTIONS = {
    "explore": "freely explore and collect ideas",
    "organize": "sort ideas into clear, distinct groups",
    "connections": "understand how their ideas relate and overlap",
    "insights": "discover patterns, trends, and surprising findings",
    "actions": "identify actionable next steps from their ideas",
}


def _build_space_context(space: Space) -> str:
    """Build context string from space metadata for AI prompts."""
    purpose = _get_space_purpose(space)
    purpose_desc = PURPOSE_DESCRIPTIONS.get(purpose, PURPOSE_DESCRIPTIONS["explore"])
    parts = [f'Space: "{space.title}"']
    if space.description:
        parts.append(f"Description: {space.description}")
    parts.append(f"Purpose: The user wants to {purpose_desc}.")
    return "\n".join(parts)


def _build_space_response(space: Space, db: Session, current_user: Optional[User] = None) -> dict:
    """Build a SpaceResponse dict with counts and membership info."""
    idea_count = db.query(func.count(Idea.id)).filter(
        Idea.space_id == space.id, Idea.status == "active"
    ).scalar() or 0
    theme_count = db.query(func.count(Theme.id)).filter(
        Theme.space_id == space.id
    ).scalar() or 0
    purpose_synthesis = None
    if space.settings and isinstance(space.settings, dict):
        purpose_synthesis = space.settings.get("purpose_synthesis")

    # Query persisted synthesis activity log
    activity_rows = (
        db.query(SynthesisAction)
        .filter(SynthesisAction.space_id == space.id)
        .order_by(SynthesisAction.created_at.desc())
        .limit(200)
        .all()
    )
    activity_log = [
        SynthesisActivityEntry.model_validate(row).model_dump()
        for row in activity_rows
    ] if activity_rows else None

    # Member info
    member_count = db.query(func.count(SpaceMember.id)).filter(
        SpaceMember.space_id == space.id,
    ).scalar() or 1

    members_data = None
    if current_user:
        member_rows = (
            db.query(SpaceMember, User)
            .join(User, SpaceMember.user_id == User.id)
            .filter(SpaceMember.space_id == space.id)
            .all()
        )
        members_data = [
            {
                "id": m.id,
                "space_id": m.space_id,
                "user_id": m.user_id,
                "role": m.role,
                "joined_at": m.joined_at,
                "user_name": u.full_name,
                "user_email": u.email,
            }
            for m, u in member_rows
        ]

    is_owner = current_user.id == space.owner_id if current_user else True

    # Determine edit permission: owners and editors can edit, viewers cannot
    can_edit = True
    if current_user and not is_owner:
        if members_data:
            user_member = next(
                (m for m, _u in member_rows if m.user_id == current_user.id), None
            )
        else:
            user_member = db.query(SpaceMember).filter(
                SpaceMember.space_id == space.id,
                SpaceMember.user_id == current_user.id,
            ).first()
        if user_member and user_member.role == "viewer":
            can_edit = False

    return {
        "id": space.id,
        "title": space.title,
        "description": space.description,
        "purpose": _get_space_purpose(space),
        "purpose_synthesis": purpose_synthesis,
        "synthesis_activity_log": activity_log,
        "idea_count": idea_count,
        "theme_count": theme_count,
        "auto_organize": space.auto_organize,
        "clustering_mode": space.clustering_mode,
        "last_organized_at": space.last_organized_at,
        "created_at": space.created_at,
        "updated_at": space.updated_at,
        "owner_id": space.owner_id,
        "is_owner": is_owner,
        "can_edit": can_edit,
        "member_count": member_count,
        "members": members_data,
    }


def _build_idea_response(idea: Idea, db: Session) -> dict:
    """Build an IdeaResponse dict with theme assignments."""
    assignments = (
        db.query(IdeaTheme, Theme)
        .join(Theme, IdeaTheme.theme_id == Theme.id)
        .filter(IdeaTheme.idea_id == idea.id)
        .all()
    )
    themes = [
        {
            "theme_id": theme.id,
            "theme_name": theme.name,
            "confidence": assignment.confidence,
            "assigned_by": assignment.assigned_by,
        }
        for assignment, theme in assignments
    ]
    return {
        "id": idea.id,
        "text": idea.text,
        "status": idea.status,
        "themes": themes,
        "created_at": idea.created_at,
        "updated_at": idea.updated_at,
    }


# --- Background tasks ---

def _broadcast_sse_to_space(db: Session, space_id: UUID, event_type: str, data: dict):
    """Send an SSE event to all members of a space."""
    from app.services.sse_service import sse_service
    member_ids = _get_space_member_ids(db, space_id)
    for uid in member_ids:
        sse_service.send_to_user_sync(uid, event_type, data)


def run_classify_idea_task(idea_id: UUID, space_id: UUID, owner_id: UUID, db_url: str):
    """Background task to classify a new idea against existing themes."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.services.space_service import SpaceService
    from app.services.platform_settings_service import get_llm_model

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        llm_model = get_llm_model(db)
        service = SpaceService(model=llm_model)
        service.classify_idea(db, idea_id, space_id)
        logger.info(f"Classified idea {idea_id} in space {space_id}")
        _broadcast_sse_to_space(db, space_id, "space_classify_completed", {"space_id": str(space_id)})

        # Expire cached session state so should_auto_organize gets fresh counts
        db.expire_all()

        # Check if auto-organize should trigger
        should_organize = service.should_auto_organize(db, space_id)
        logger.info(f"should_auto_organize={should_organize} for space {space_id}")
        if should_organize:
            logger.info(f"Auto-organizing space {space_id}")
            space = db.query(Space).filter(Space.id == space_id).first()
            clustering_mode = space.clustering_mode if space else "dbscan"
            context = _build_space_context(space) if space else None
            _broadcast_sse_to_space(db, space_id, "space_organize_started", {"space_id": str(space_id)})
            service.organize(db, space_id, context=context, clustering_mode=clustering_mode)
            logger.info(f"Auto-organize completed for space {space_id}")

            # Persist completed/dismissed notes before replacing synthesis
            if space:
                SpaceService.save_synthesis_actions(db, space)

            # Generate purpose synthesis after auto-organize
            if space:
                purpose = _get_space_purpose(space)
                synthesis = service.generate_purpose_synthesis(db, space_id, purpose)
                current_settings = dict(space.settings) if space.settings else {}
                if synthesis:
                    current_settings["purpose_synthesis"] = synthesis
                else:
                    current_settings.pop("purpose_synthesis", None)
                space.settings = current_settings
                flag_modified(space, "settings")
                db.commit()

            _broadcast_sse_to_space(db, space_id, "space_organize_completed", {"space_id": str(space_id)})
    except Exception as e:
        logger.error(f"Error in classify/auto-organize for idea {idea_id} in space {space_id}: {e}", exc_info=True)
    finally:
        db.close()
        engine.dispose()


def run_organize_space_task(space_id: UUID, owner_id: UUID, db_url: str, context: Optional[str] = None):
    """Background task to run full space organization."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.services.space_service import SpaceService
    from app.services.platform_settings_service import get_llm_model

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        llm_model = get_llm_model(db)
        service = SpaceService(model=llm_model)
        space = db.query(Space).filter(Space.id == space_id).first()
        clustering_mode = space.clustering_mode if space else "dbscan"
        service.organize(db, space_id, context=context, clustering_mode=clustering_mode)
        logger.info(f"Organized space {space_id}")

        # Persist completed/dismissed notes before replacing synthesis
        if space:
            SpaceService.save_synthesis_actions(db, space)

        # Generate purpose synthesis
        if space:
            purpose = _get_space_purpose(space)
            synthesis = service.generate_purpose_synthesis(db, space_id, purpose)
            current_settings = dict(space.settings) if space.settings else {}
            if synthesis:
                current_settings["purpose_synthesis"] = synthesis
            else:
                current_settings.pop("purpose_synthesis", None)
            space.settings = current_settings
            flag_modified(space, "settings")
            db.commit()

        _broadcast_sse_to_space(db, space_id, "space_organize_completed", {"space_id": str(space_id)})
    except Exception as e:
        logger.error(f"Error organizing space {space_id}: {e}")
    finally:
        db.close()
        engine.dispose()


def run_check_and_resynthesize_task(space_id: UUID, owner_id: UUID, db_url: str):
    """Background task triggered by note feedback.

    Checks auto-organize score. If threshold met, does full re-organize
    (which regenerates synthesis). Otherwise, just regenerates synthesis
    so the AI incorporates the feedback without re-clustering.
    """
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.services.space_service import SpaceService
    from app.services.platform_settings_service import get_llm_model

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        llm_model = get_llm_model(db)
        service = SpaceService(model=llm_model)
        space = db.query(Space).filter(Space.id == space_id).first()
        if not space:
            return

        # Persist completed/dismissed notes before any synthesis replacement
        SpaceService.save_synthesis_actions(db, space)

        if service.should_auto_organize(db, space_id):
            # Full re-organize (includes synthesis regeneration)
            logger.info(f"Note feedback triggered auto-organize for space {space_id}")
            context = _build_space_context(space)
            clustering_mode = space.clustering_mode
            _broadcast_sse_to_space(db, space_id, "space_organize_started", {"space_id": str(space_id)})
            service.organize(db, space_id, context=context, clustering_mode=clustering_mode)

            purpose = _get_space_purpose(space)
            synthesis = service.generate_purpose_synthesis(db, space_id, purpose)
            current_settings = dict(space.settings) if space.settings else {}
            if synthesis:
                current_settings["purpose_synthesis"] = synthesis
            else:
                current_settings.pop("purpose_synthesis", None)
            space.settings = current_settings
            flag_modified(space, "settings")
            db.commit()
            _broadcast_sse_to_space(db, space_id, "space_organize_completed", {"space_id": str(space_id)})
        else:
            # Just regenerate synthesis to incorporate feedback (no re-clustering)
            logger.info(f"Regenerating synthesis for space {space_id} after note feedback")
            purpose = _get_space_purpose(space)
            synthesis = service.generate_purpose_synthesis(db, space_id, purpose)
            if synthesis:
                current_settings = dict(space.settings) if space.settings else {}
                current_settings["purpose_synthesis"] = synthesis
                space.settings = current_settings
                flag_modified(space, "settings")
                db.commit()
                _broadcast_sse_to_space(db, space_id, "space_organize_completed", {"space_id": str(space_id)})
    except Exception as e:
        logger.error(f"Error in check-and-resynthesize for space {space_id}: {e}", exc_info=True)
    finally:
        db.close()
        engine.dispose()


# --- Space CRUD ---

@router.post("", response_model=SpaceResponse, status_code=status.HTTP_201_CREATED)
def create_space(
    data: SpaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new space."""
    from app.services.feature_flag_service import feature_flag_service

    tier = _require_spaces_flag(current_user, db)

    # Check max_spaces limit
    max_spaces = feature_flag_service.get_config_value(
        db, "spaces", "max_spaces",
        tier=tier,
        user_id=current_user.id,
    )
    if max_spaces is not None and max_spaces != -1:
        current_count = db.query(func.count(Space.id)).filter(
            Space.owner_id == current_user.id,
        ).scalar() or 0
        if current_count >= max_spaces:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You have reached the maximum number of spaces ({max_spaces}) for your plan",
            )

    space_settings = {}
    if data.purpose:
        space_settings["purpose"] = data.purpose

    space = Space(
        title=data.title,
        description=data.description,
        owner_id=current_user.id,
        settings=space_settings if space_settings else None,
    )
    db.add(space)
    db.flush()

    # Create owner membership row
    owner_member = SpaceMember(
        space_id=space.id,
        user_id=current_user.id,
        role="owner",
    )
    db.add(owner_member)
    db.commit()
    db.refresh(space)

    return _build_space_response(space, db, current_user)


@router.get("", response_model=list[SpaceListItem])
def list_spaces(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List spaces the current user owns or is a member of."""
    member_space_ids = (
        db.query(SpaceMember.space_id)
        .filter(SpaceMember.user_id == current_user.id)
        .subquery()
    )
    spaces = (
        db.query(Space)
        .filter(
            or_(
                Space.owner_id == current_user.id,
                Space.id.in_(db.query(member_space_ids)),
            )
        )
        .order_by(Space.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_build_space_response(s, db, current_user) for s in spaces]


@router.get("/{space_id}", response_model=SpaceResponse)
def get_space(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a space with counts."""
    space = _get_space_or_404(space_id, current_user, db)
    return _build_space_response(space, db, current_user)


@router.patch("/{space_id}", response_model=SpaceResponse)
def update_space(
    space_id: UUID,
    data: SpaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a space's settings. Owner only."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)
    if data.title is not None:
        space.title = data.title
    if data.description is not None:
        space.description = data.description
    if data.auto_organize is not None:
        space.auto_organize = data.auto_organize
    if data.clustering_mode is not None:
        space.clustering_mode = data.clustering_mode
    if data.purpose is not None:
        current_settings = dict(space.settings) if space.settings else {}
        current_settings["purpose"] = data.purpose
        # Clear stale synthesis when purpose changes
        current_settings.pop("purpose_synthesis", None)
        space.settings = current_settings
        flag_modified(space, "settings")
    db.commit()
    db.refresh(space)
    return _build_space_response(space, db, current_user)


@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_space(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a space and all its ideas/themes. Owner only."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)
    db.delete(space)
    db.commit()


# --- Ideas ---

@router.post("/{space_id}/ideas", response_model=IdeaResponse, status_code=status.HTTP_201_CREATED)
def create_idea(
    space_id: UUID,
    data: IdeaCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Drop a new idea into a space. Triggers background classification."""
    from app.services.feature_flag_service import feature_flag_service
    from app.services.subscription_service import subscription_service
    from app.services.space_service import SpaceService

    _require_spaces_flag(current_user, db)
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    # Check max_ideas_per_space limit using the space OWNER's tier
    owner_tier = subscription_service.get_tier(db, user_id=space.owner_id)
    max_ideas = feature_flag_service.get_config_value(
        db, "spaces", "max_ideas_per_space",
        tier=owner_tier,
        user_id=space.owner_id,
    )
    if max_ideas is not None and max_ideas != -1:
        current_count = db.query(func.count(Idea.id)).filter(
            Idea.space_id == space_id, Idea.status == "active"
        ).scalar() or 0
        if current_count >= max_ideas:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You have reached the maximum number of ideas ({max_ideas}) for your plan",
            )

    # Generate embedding synchronously (fast enough for single idea)
    from app.services.platform_settings_service import get_llm_model
    service = SpaceService(model=get_llm_model(db))
    embedding = service.generate_embedding(data.text)

    idea = Idea(
        space_id=space_id,
        author_id=current_user.id,
        text=data.text,
        embedding=embedding,
    )
    db.add(idea)
    db.commit()
    db.refresh(idea)

    # Notify other members that a new idea was added
    from app.services.sse_service import sse_service
    member_ids = _get_space_member_ids(db, space_id)
    for uid in member_ids:
        if uid != current_user.id:
            sse_service.send_to_user_sync(uid, "space_idea_added", {"space_id": str(space_id)})

    # Classify in background against existing themes
    background_tasks.add_task(
        run_classify_idea_task,
        idea_id=idea.id,
        space_id=space_id,
        owner_id=space.owner_id,
        db_url=str(settings.DATABASE_URL),
    )

    return _build_idea_response(idea, db)


@router.get("/{space_id}/ideas", response_model=list[IdeaResponse])
def list_ideas(
    space_id: UUID,
    theme_id: Optional[UUID] = Query(None),
    unthemed: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List ideas in a space, optionally filtered by theme or unthemed."""
    _get_space_or_404(space_id, current_user, db)

    query = db.query(Idea).filter(Idea.space_id == space_id, Idea.status == "active")

    if unthemed:
        # Filter ideas that have no theme assignments
        themed_ids = (
            db.query(IdeaTheme.idea_id)
            .join(Theme, IdeaTheme.theme_id == Theme.id)
            .filter(Theme.space_id == space_id)
            .distinct()
            .subquery()
        )
        query = query.filter(~Idea.id.in_(db.query(themed_ids)))
    elif theme_id:
        # Filter ideas that are assigned to this theme
        assigned_ids = (
            db.query(IdeaTheme.idea_id)
            .filter(IdeaTheme.theme_id == theme_id)
            .subquery()
        )
        query = query.filter(Idea.id.in_(db.query(assigned_ids)))

    ideas = query.order_by(Idea.created_at.desc()).offset(skip).limit(limit).all()
    return [_build_idea_response(i, db) for i in ideas]


@router.patch("/{space_id}/ideas/{idea_id}", response_model=IdeaResponse)
def update_idea(
    space_id: UUID,
    idea_id: UUID,
    data: IdeaUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit an idea's text. Re-triggers classification."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    idea = db.query(Idea).filter(
        Idea.id == idea_id, Idea.space_id == space_id
    ).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    # Update text and re-embed
    from app.services.space_service import SpaceService
    from app.services.platform_settings_service import get_llm_model
    service = SpaceService(model=get_llm_model(db))

    idea.text = data.text
    idea.embedding = service.generate_embedding(data.text)

    # Clear AI theme assignments (will be re-classified)
    db.query(IdeaTheme).filter(
        IdeaTheme.idea_id == idea_id, IdeaTheme.assigned_by == "ai"
    ).delete()

    db.commit()
    db.refresh(idea)

    # Re-classify in background
    background_tasks.add_task(
        run_classify_idea_task,
        idea_id=idea.id,
        space_id=space_id,
        owner_id=space.owner_id,
        db_url=str(settings.DATABASE_URL),
    )

    return _build_idea_response(idea, db)


@router.delete("/{space_id}/ideas/{idea_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_idea(
    space_id: UUID,
    idea_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Archive an idea (soft delete)."""
    _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    idea = db.query(Idea).filter(
        Idea.id == idea_id, Idea.space_id == space_id
    ).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")

    idea.status = "archived"
    db.commit()


# --- Themes ---

@router.get("/{space_id}/themes", response_model=list[ThemeResponse])
def list_themes(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List themes in a space with idea counts."""
    _get_space_or_404(space_id, current_user, db)

    themes = db.query(Theme).filter(Theme.space_id == space_id).order_by(Theme.created_at).all()
    result = []
    for theme in themes:
        idea_count = (
            db.query(func.count(IdeaTheme.id))
            .filter(IdeaTheme.theme_id == theme.id)
            .scalar() or 0
        )
        result.append({
            "id": theme.id,
            "name": theme.name,
            "summary": theme.summary,
            "color": theme.color,
            "is_ai_generated": theme.is_ai_generated,
            "idea_count": idea_count,
            "created_at": theme.created_at,
            "updated_at": theme.updated_at,
        })
    return result


@router.patch("/{space_id}/themes/{theme_id}", response_model=ThemeResponse)
def update_theme(
    space_id: UUID,
    theme_id: UUID,
    data: ThemeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rename or recolor a theme."""
    _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    theme = db.query(Theme).filter(Theme.id == theme_id, Theme.space_id == space_id).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")

    if data.name is not None:
        theme.name = data.name
        theme.is_ai_generated = False
    if data.color is not None:
        theme.color = data.color

    db.commit()
    db.refresh(theme)

    idea_count = (
        db.query(func.count(IdeaTheme.id))
        .filter(IdeaTheme.theme_id == theme.id)
        .scalar() or 0
    )
    return {
        "id": theme.id,
        "name": theme.name,
        "summary": theme.summary,
        "color": theme.color,
        "is_ai_generated": theme.is_ai_generated,
        "idea_count": idea_count,
        "created_at": theme.created_at,
        "updated_at": theme.updated_at,
    }


@router.post("/{space_id}/themes/merge", response_model=ThemeResponse)
def merge_themes(
    space_id: UUID,
    data: ThemeMerge,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Merge source theme into target theme."""
    _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    source = db.query(Theme).filter(Theme.id == data.source_theme_id, Theme.space_id == space_id).first()
    target = db.query(Theme).filter(Theme.id == data.target_theme_id, Theme.space_id == space_id).first()
    if not source or not target:
        raise HTTPException(status_code=404, detail="Theme not found")
    if source.id == target.id:
        raise HTTPException(status_code=400, detail="Cannot merge a theme into itself")

    # Move all idea assignments from source to target
    source_assignments = db.query(IdeaTheme).filter(IdeaTheme.theme_id == source.id).all()
    for assignment in source_assignments:
        existing = db.query(IdeaTheme).filter(
            IdeaTheme.idea_id == assignment.idea_id,
            IdeaTheme.theme_id == target.id,
        ).first()
        if existing:
            # Keep higher confidence
            existing.confidence = max(existing.confidence, assignment.confidence)
            db.delete(assignment)
        else:
            assignment.theme_id = target.id

    # Delete connections involving source theme
    db.query(ThemeConnection).filter(
        (ThemeConnection.theme_a_id == source.id) | (ThemeConnection.theme_b_id == source.id)
    ).delete(synchronize_session=False)

    # Delete source theme
    db.delete(source)
    db.commit()
    db.refresh(target)

    idea_count = (
        db.query(func.count(IdeaTheme.id))
        .filter(IdeaTheme.theme_id == target.id)
        .scalar() or 0
    )
    return {
        "id": target.id,
        "name": target.name,
        "summary": target.summary,
        "color": target.color,
        "is_ai_generated": target.is_ai_generated,
        "idea_count": idea_count,
        "created_at": target.created_at,
        "updated_at": target.updated_at,
    }


@router.delete("/{space_id}/themes/{theme_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_theme(
    space_id: UUID,
    theme_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a theme. Ideas become unthemed."""
    _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    theme = db.query(Theme).filter(Theme.id == theme_id, Theme.space_id == space_id).first()
    if not theme:
        raise HTTPException(status_code=404, detail="Theme not found")

    # Assignments cascade-delete via FK
    # Delete connections involving this theme
    db.query(ThemeConnection).filter(
        (ThemeConnection.theme_a_id == theme_id) | (ThemeConnection.theme_b_id == theme_id)
    ).delete(synchronize_session=False)

    db.delete(theme)
    db.commit()


# --- Organize + Graph ---

@router.post("/{space_id}/organize", status_code=status.HTTP_202_ACCEPTED)
def organize_space(
    space_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Trigger full re-organization of a space (background task)."""
    _require_spaces_flag(current_user, db)
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    # Check minimum ideas
    idea_count = db.query(func.count(Idea.id)).filter(
        Idea.space_id == space_id, Idea.status == "active"
    ).scalar() or 0
    if idea_count < 2:
        raise HTTPException(
            status_code=400,
            detail="Need at least 2 ideas to organize",
        )

    context = _build_space_context(space)

    # Send organize_started to all members immediately
    from app.services.sse_service import sse_service
    for uid in _get_space_member_ids(db, space_id):
        sse_service.send_to_user_sync(uid, "space_organize_started", {"space_id": str(space_id)})

    background_tasks.add_task(
        run_organize_space_task,
        space_id=space.id,
        owner_id=space.owner_id,
        db_url=str(settings.DATABASE_URL),
        context=context,
    )

    return {"message": "Organization started", "idea_count": idea_count}


@router.get("/{space_id}/graph", response_model=GraphData)
def get_graph_data(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get network graph data for a space."""
    _get_space_or_404(space_id, current_user, db)

    from app.services.space_service import SpaceService
    service = SpaceService()
    return service.get_graph_data(db, space_id)


@router.patch("/{space_id}/synthesis/note-state")
def update_synthesis_note_state(
    space_id: UUID,
    data: SynthesisNoteStateUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update the state of a single synthesis note (completed/dismissed/reset)."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    if not space.settings or not isinstance(space.settings, dict):
        raise HTTPException(status_code=400, detail="No synthesis data exists")

    synthesis = space.settings.get("purpose_synthesis")
    if not synthesis or not isinstance(synthesis, dict):
        raise HTTPException(status_code=400, detail="No synthesis data exists")

    theme_notes = synthesis.get("theme_notes", {})
    if data.theme_id not in theme_notes:
        raise HTTPException(status_code=404, detail="Theme not found in synthesis")

    notes_list = theme_notes[data.theme_id]
    if data.note_index >= len(notes_list):
        raise HTTPException(status_code=404, detail="Note index out of range")

    note_key = f"{data.theme_id}:{data.note_index}"
    note_states = synthesis.get("note_states", {})
    dismiss_reasons = synthesis.get("dismiss_reasons", {})
    completion_outcomes = synthesis.get("completion_outcomes", {})

    if data.state is None:
        note_states.pop(note_key, None)
        dismiss_reasons.pop(note_key, None)
        completion_outcomes.pop(note_key, None)
    else:
        note_states[note_key] = data.state
        if data.state == "dismissed" and data.reason:
            dismiss_reasons[note_key] = data.reason
        elif data.state != "dismissed":
            dismiss_reasons.pop(note_key, None)
        if data.state == "completed" and data.outcome:
            completion_outcomes[note_key] = data.outcome
        elif data.state != "completed":
            completion_outcomes.pop(note_key, None)

    synthesis["note_states"] = note_states
    synthesis["dismiss_reasons"] = dismiss_reasons
    synthesis["completion_outcomes"] = completion_outcomes
    current_settings = dict(space.settings)
    current_settings["purpose_synthesis"] = synthesis
    space.settings = current_settings
    flag_modified(space, "settings")
    db.commit()

    # Actionable feedback (reason or outcome) is a signal to re-synthesize.
    # Check auto-organize score — note feedback weight may push it over threshold.
    has_feedback = (
        (data.state == "dismissed" and data.reason)
        or (data.state == "completed" and data.outcome)
    )
    if has_feedback and space.auto_organize:
        background_tasks.add_task(
            run_check_and_resynthesize_task,
            space_id=space.id,
            owner_id=space.owner_id,
            db_url=str(settings.DATABASE_URL),
        )

    return synthesis


@router.get("/{space_id}/evolution", response_model=list[OrganizeRunResponse])
def get_evolution(
    space_id: UUID,
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get theme evolution timeline grouped by organize runs."""
    from app.models.theme_event import ThemeEvent
    from collections import defaultdict

    _get_space_or_404(space_id, current_user, db)

    events = (
        db.query(ThemeEvent)
        .filter(ThemeEvent.space_id == space_id)
        .order_by(ThemeEvent.created_at.desc())
        .all()
    )

    # Group by organize_run_id
    runs: dict = defaultdict(list)
    for event in events:
        runs[event.organize_run_id].append(event)

    # Build response sorted newest first, limited
    result = []
    for run_id, run_events in runs.items():
        run_events.sort(key=lambda e: e.event_type)  # created, persisted, retired
        result.append(OrganizeRunResponse(
            run_id=run_id,
            events=[ThemeEventResponse.model_validate(e) for e in run_events],
            created_at=run_events[0].created_at,
        ))
    result.sort(key=lambda r: r.created_at, reverse=True)
    return result[:limit]


# --- Members + Invitations ---

@router.get("/{space_id}/members", response_model=list[SpaceMemberResponse])
def list_members(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all members of a space. Any member can view."""
    _get_space_or_404(space_id, current_user, db)
    rows = (
        db.query(SpaceMember, User)
        .join(User, SpaceMember.user_id == User.id)
        .filter(SpaceMember.space_id == space_id)
        .order_by(SpaceMember.joined_at)
        .all()
    )
    return [
        {
            "id": m.id,
            "space_id": m.space_id,
            "user_id": m.user_id,
            "role": m.role,
            "joined_at": m.joined_at,
            "user_name": u.full_name,
            "user_email": u.email,
        }
        for m, u in rows
    ]


@router.delete("/{space_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    space_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a member from a space. Owner only."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot remove yourself as the owner")

    member = db.query(SpaceMember).filter(
        SpaceMember.space_id == space_id,
        SpaceMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.delete(member)
    db.commit()


@router.patch("/{space_id}/members/{user_id}")
def update_member_role(
    space_id: UUID,
    user_id: UUID,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change a member's role (editor <-> viewer). Owner only."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)

    new_role = data.get("role")
    if new_role not in ("editor", "viewer"):
        raise HTTPException(status_code=400, detail="role must be 'editor' or 'viewer'")

    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")

    member = db.query(SpaceMember).filter(
        SpaceMember.space_id == space_id,
        SpaceMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot change the owner's role")

    member.role = new_role
    db.commit()

    # Return updated member with user info
    user = db.query(User).filter(User.id == user_id).first()
    return {
        "id": member.id,
        "space_id": member.space_id,
        "user_id": member.user_id,
        "role": member.role,
        "joined_at": member.joined_at,
        "user_name": user.full_name if user else None,
        "user_email": user.email if user else None,
    }


@router.post("/{space_id}/invitations", status_code=status.HTTP_201_CREATED)
async def invite_to_space(
    space_id: UUID,
    data: SpaceInviteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Invite users to a space by email. Owner only."""
    from app.services.email_service import email_service
    from app.services.in_app_notification_service import in_app_notification_service
    from app.utils.email_preferences import should_send_email

    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)

    created_invitations = []

    for email in data.emails:
        email = email.strip().lower()
        if not email:
            continue

        # Check if already a member
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            existing_member = db.query(SpaceMember).filter(
                SpaceMember.space_id == space_id,
                SpaceMember.user_id == existing_user.id,
            ).first()
            if existing_member:
                continue

        # Check if pending invitation exists
        existing_invitation = db.query(SpaceInvitation).filter(
            SpaceInvitation.space_id == space_id,
            SpaceInvitation.email == email,
            SpaceInvitation.is_accepted == False,
        ).first()
        if existing_invitation:
            continue

        # Create invitation
        invitation_token = secrets.token_urlsafe(32)
        invite_role = data.role or "editor"
        invitation = SpaceInvitation(
            space_id=space_id,
            email=email,
            invited_by_id=current_user.id,
            invited_user_id=existing_user.id if existing_user else None,
            invitation_token=invitation_token,
            role=invite_role,
        )
        db.add(invitation)
        created_invitations.append(invitation)

    db.commit()
    for inv in created_invitations:
        db.refresh(inv)

    # Send emails and in-app notifications
    for invitation in created_invitations:
        if should_send_email(db, invitation.email, "space_invitations"):
            try:
                await email_service.send_space_invitation_email(
                    to_email=invitation.email,
                    space_title=space.title,
                    invitation_token=invitation.invitation_token,
                    inviter_name=current_user.full_name,
                )
            except Exception as e:
                logger.error(f"Failed to send space invitation email to {invitation.email}: {e}", exc_info=True)

        # In-app notification if user exists
        if invitation.invited_user_id:
            try:
                await in_app_notification_service.notify_space_invitation(
                    db=db,
                    user_id=invitation.invited_user_id,
                    space_title=space.title,
                    space_id=space_id,
                    invitation_token=invitation.invitation_token,
                    inviter_name=current_user.full_name,
                )
            except Exception as e:
                logger.error(f"Failed to send space invitation notification: {e}", exc_info=True)

    return {
        "invitations_created": len(created_invitations),
        "space_id": str(space_id),
    }


@router.get("/{space_id}/invitations", response_model=list[SpaceInvitationResponse])
def list_invitations(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List invitations for a space. Owner only."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)

    invitations = (
        db.query(SpaceInvitation)
        .filter(SpaceInvitation.space_id == space_id)
        .order_by(SpaceInvitation.created_at.desc())
        .all()
    )
    return [
        {
            "id": inv.id,
            "space_id": inv.space_id,
            "email": inv.email,
            "invited_by_id": inv.invited_by_id,
            "is_accepted": inv.is_accepted,
            "created_at": inv.created_at,
        }
        for inv in invitations
    ]


@router.delete("/{space_id}/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_invitation(
    space_id: UUID,
    invitation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Cancel a pending invitation. Owner only."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)

    invitation = db.query(SpaceInvitation).filter(
        SpaceInvitation.id == invitation_id,
        SpaceInvitation.space_id == space_id,
    ).first()
    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found")

    db.delete(invitation)
    db.commit()


@router.post("/accept-invite/{token}")
def accept_space_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Accept a space invitation by token."""
    invitation = db.query(SpaceInvitation).filter(
        SpaceInvitation.invitation_token == token,
    ).first()

    if not invitation:
        raise HTTPException(status_code=404, detail="Invitation not found or has expired")

    if invitation.is_accepted:
        raise HTTPException(status_code=400, detail="This invitation has already been accepted")

    if invitation.expires_at and invitation.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="This invitation has expired")

    # Verify email matches
    if invitation.email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation was sent to a different email address",
        )

    # Check if already a member
    existing_member = db.query(SpaceMember).filter(
        SpaceMember.space_id == invitation.space_id,
        SpaceMember.user_id == current_user.id,
    ).first()

    if existing_member:
        invitation.is_accepted = True
        invitation.accepted_at = datetime.utcnow()
        db.commit()
        return {"space_id": str(invitation.space_id)}

    # Create membership with the role specified in the invitation
    member = SpaceMember(
        space_id=invitation.space_id,
        user_id=current_user.id,
        role=invitation.role or "editor",
    )
    db.add(member)

    invitation.is_accepted = True
    invitation.accepted_at = datetime.utcnow()
    db.commit()

    return {"space_id": str(invitation.space_id)}
