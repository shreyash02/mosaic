"""Routes for the Spaces feature (second-brain ideas with auto-organization)."""

import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.space import Space
from app.models.idea import Idea
from app.models.theme import Theme
from app.models.idea_theme import IdeaTheme
from app.models.theme_connection import ThemeConnection
from app.models.user import User
from app.schemas.space import (
    SpaceCreate,
    SpaceUpdate,
    SpaceResponse,
    SpaceListItem,
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
    """Get a space owned by the current user or raise 404."""
    space = db.query(Space).filter(
        Space.id == space_id,
        Space.owner_id == current_user.id,
    ).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    return space


def _build_space_response(space: Space, db: Session) -> dict:
    """Build a SpaceResponse dict with counts."""
    idea_count = db.query(func.count(Idea.id)).filter(
        Idea.space_id == space.id, Idea.status == "active"
    ).scalar() or 0
    theme_count = db.query(func.count(Theme.id)).filter(
        Theme.space_id == space.id
    ).scalar() or 0
    return {
        "id": space.id,
        "title": space.title,
        "description": space.description,
        "idea_count": idea_count,
        "theme_count": theme_count,
        "auto_organize": space.auto_organize,
        "clustering_mode": space.clustering_mode,
        "last_organized_at": space.last_organized_at,
        "created_at": space.created_at,
        "updated_at": space.updated_at,
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

def run_classify_idea_task(idea_id: UUID, space_id: UUID, owner_id: UUID, db_url: str):
    """Background task to classify a new idea against existing themes."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.services.space_service import SpaceService
    from app.services.platform_settings_service import get_llm_model
    from app.services.sse_service import sse_service

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        llm_model = get_llm_model(db)
        service = SpaceService(model=llm_model)
        service.classify_idea(db, idea_id, space_id)
        logger.info(f"Classified idea {idea_id} in space {space_id}")
        sse_service.send_to_user_sync(owner_id, "space_classify_completed", {"space_id": str(space_id)})

        # Check if auto-organize should trigger
        if service.should_auto_organize(db, space_id):
            logger.info(f"Auto-organizing space {space_id}")
            space = db.query(Space).filter(Space.id == space_id).first()
            clustering_mode = space.clustering_mode if space else "dbscan"
            sse_service.send_to_user_sync(owner_id, "space_organize_started", {"space_id": str(space_id)})
            service.organize(db, space_id, clustering_mode=clustering_mode)
            sse_service.send_to_user_sync(owner_id, "space_organize_completed", {"space_id": str(space_id)})
    except Exception as e:
        logger.error(f"Error classifying idea {idea_id}: {e}")
    finally:
        db.close()
        engine.dispose()


def run_organize_space_task(space_id: UUID, owner_id: UUID, db_url: str, context: Optional[str] = None):
    """Background task to run full space organization."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.services.space_service import SpaceService
    from app.services.platform_settings_service import get_llm_model
    from app.services.sse_service import sse_service

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
        sse_service.send_to_user_sync(owner_id, "space_organize_completed", {"space_id": str(space_id)})
    except Exception as e:
        logger.error(f"Error organizing space {space_id}: {e}")
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

    space = Space(
        title=data.title,
        description=data.description,
        owner_id=current_user.id,
    )
    db.add(space)
    db.commit()
    db.refresh(space)

    return _build_space_response(space, db)


@router.get("", response_model=list[SpaceListItem])
def list_spaces(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List spaces owned by the current user."""
    spaces = (
        db.query(Space)
        .filter(Space.owner_id == current_user.id)
        .order_by(Space.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return [_build_space_response(s, db) for s in spaces]


@router.get("/{space_id}", response_model=SpaceResponse)
def get_space(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a space with counts."""
    space = _get_space_or_404(space_id, current_user, db)
    return _build_space_response(space, db)


@router.patch("/{space_id}", response_model=SpaceResponse)
def update_space(
    space_id: UUID,
    data: SpaceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a space's settings."""
    space = _get_space_or_404(space_id, current_user, db)
    if data.title is not None:
        space.title = data.title
    if data.description is not None:
        space.description = data.description
    if data.auto_organize is not None:
        space.auto_organize = data.auto_organize
    if data.clustering_mode is not None:
        space.clustering_mode = data.clustering_mode
    db.commit()
    db.refresh(space)
    return _build_space_response(space, db)


@router.delete("/{space_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_space(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a space and all its ideas/themes."""
    space = _get_space_or_404(space_id, current_user, db)
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
    from app.services.space_service import SpaceService

    tier = _require_spaces_flag(current_user, db)
    space = _get_space_or_404(space_id, current_user, db)

    # Check max_ideas_per_space limit
    max_ideas = feature_flag_service.get_config_value(
        db, "spaces", "max_ideas_per_space",
        tier=tier,
        user_id=current_user.id,
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

    # Classify in background against existing themes
    background_tasks.add_task(
        run_classify_idea_task,
        idea_id=idea.id,
        space_id=space_id,
        owner_id=current_user.id,
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
    _get_space_or_404(space_id, current_user, db)

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
        owner_id=current_user.id,
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

    # Check minimum ideas
    idea_count = db.query(func.count(Idea.id)).filter(
        Idea.space_id == space_id, Idea.status == "active"
    ).scalar() or 0
    if idea_count < 2:
        raise HTTPException(
            status_code=400,
            detail="Need at least 2 ideas to organize",
        )

    background_tasks.add_task(
        run_organize_space_task,
        space_id=space.id,
        owner_id=current_user.id,
        db_url=str(settings.DATABASE_URL),
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
