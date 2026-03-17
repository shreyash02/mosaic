"""Routes for the Spaces feature (second-brain ideas with auto-organization)."""

import logging
import secrets
from datetime import datetime, timezone
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
from app.models.space_activity_log import SpaceActivityLog
from app.services.workspace_activity_service import log_activity as log_workspace_activity
from app.models.space_snapshot import SpaceSnapshot
from app.models.space_synthesis import SpaceSynthesis
from app.models.space_shared_viewer import SpaceSharedViewer
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
    ImageExtractRequest,
    ImageClarifyRequest,
    ImageExtractResponse,
    IdeaBatchCreate,
    ThemeResponse,
    ThemeUpdate,
    ThemeMerge,
    GraphData,
    OrganizeRunResponse,
    ThemeEventResponse,
    SynthesisNoteStateUpdate,
    SynthesisActivityEntry,
    SpaceActivityLogEntry,
    SpaceActivityLogPage,
    ActionOutcomeImageRequest,
    ActionOutcomeImageResponse,
    ResynthesizeRequest,
    SpaceShareUpdate,
    SpaceSharedViewerCreate,
    SpaceSharedViewerUpdate,
    SpaceSharedViewerResponse,
    SpaceSnapshotCreate,
    SpaceSnapshotResponse,
    SpaceSnapshotDetailResponse,
)

logger = logging.getLogger(__name__)


def _utc_iso(dt: datetime | None) -> str | None:
    """Serialize datetime as ISO format."""
    if dt is None:
        return None
    return dt.isoformat()

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


def _get_space_with_sharing(space_id: UUID, current_user: User, db: Session, require_live: bool = False) -> tuple:
    """Get a space if user is owner, member, or has shared access.
    Returns (space, is_shared_view: bool). Raises 404 if not accessible.
    If require_live=True, snapshots-only shared viewers are rejected."""
    space = db.query(Space).filter(Space.id == space_id).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    # Owner always has full access
    if space.owner_id == current_user.id:
        return space, False
    # Check membership
    member = db.query(SpaceMember).filter(
        SpaceMember.space_id == space_id,
        SpaceMember.user_id == current_user.id,
    ).first()
    if member:
        return space, False
    # Check shared viewers list (email-based access)
    shared_viewer = db.query(SpaceSharedViewer).filter(
        SpaceSharedViewer.space_id == space_id,
        SpaceSharedViewer.email == current_user.email.lower(),
    ).first()
    if shared_viewer:
        # Backfill shared_user_id on first access
        if shared_viewer.shared_user_id is None:
            shared_viewer.shared_user_id = current_user.id
            db.commit()
        if require_live and shared_viewer.access_level != "space":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You only have access to snapshots of this space",
            )
        return space, True
    # Check link sharing (anyone authenticated)
    if space.share_access == "authenticated":
        return space, True
    raise HTTPException(status_code=404, detail="Space not found")


def _require_space_owner(space: Space, current_user: User) -> None:
    """Raise 403 if the current user is not the space owner."""
    if space.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the space owner can perform this action",
        )


def _require_space_editor(space_id: UUID, current_user: User, db: Session) -> None:
    """Raise 403 if the current user is not an editor or owner. Blocks suggesters and viewers."""
    member = db.query(SpaceMember).filter(
        SpaceMember.space_id == space_id,
        SpaceMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this space",
        )
    if member.role == "viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You have view-only access to this space",
        )
    if member.role == "suggester":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can suggest ideas but cannot edit this space directly",
        )


def _require_space_suggester(space_id: UUID, current_user: User, db: Session) -> None:
    """Raise 403 if the current user is a viewer. Suggesters, editors, and owners pass."""
    member = db.query(SpaceMember).filter(
        SpaceMember.space_id == space_id,
        SpaceMember.user_id == current_user.id,
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this space",
        )
    if member.role == "viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You have view-only access to this space",
        )


def _is_suggester(space_id: UUID, current_user: User, db: Session) -> bool:
    """Return True if the user's role in this space is 'suggester'."""
    member = db.query(SpaceMember).filter(
        SpaceMember.space_id == space_id,
        SpaceMember.user_id == current_user.id,
    ).first()
    return member is not None and member.role == "suggester"


def _get_space_member_ids(db: Session, space_id: UUID) -> List[UUID]:
    """Get all member user IDs for a space (including owner)."""
    return [
        row[0] for row in
        db.query(SpaceMember.user_id).filter(SpaceMember.space_id == space_id).all()
    ]


def _get_space_purpose(space: Space) -> str:
    """Read the default (first) purpose from settings JSONB, defaulting to 'explore'."""
    if space.settings and isinstance(space.settings, dict):
        purposes = space.settings.get("purposes")
        if isinstance(purposes, list) and purposes:
            return purposes[0]
        return space.settings.get("purpose", "explore")
    return "explore"


def _get_space_purposes(space: Space) -> list:
    """Read purposes list from settings JSONB, with fallback to legacy single purpose."""
    if space.settings and isinstance(space.settings, dict):
        purposes = space.settings.get("purposes")
        if isinstance(purposes, list) and purposes:
            return purposes
        legacy = space.settings.get("purpose", "explore")
        return [legacy]
    return ["explore"]


def _build_snapshot_data(db: Session, space: Space) -> dict:
    """Build a snapshot_data dict capturing the current space state."""
    from app.services.space_service import SpaceService
    service = SpaceService()
    space_id = space.id

    themes_data = []
    themes = db.query(Theme).filter(Theme.space_id == space_id).all()
    for theme in themes:
        idea_count = (
            db.query(func.count(IdeaTheme.id))
            .filter(IdeaTheme.theme_id == theme.id)
            .scalar() or 0
        )
        themes_data.append({
            "id": str(theme.id),
            "name": theme.name,
            "summary": theme.summary,
            "color": theme.color,
            "idea_count": idea_count,
        })

    ideas = db.query(Idea).filter(Idea.space_id == space_id, Idea.status == "active").all()
    ideas_data = []
    for idea in ideas:
        assignments = (
            db.query(IdeaTheme, Theme)
            .join(Theme, IdeaTheme.theme_id == Theme.id)
            .filter(IdeaTheme.idea_id == idea.id)
            .all()
        )
        ideas_data.append({
            "id": str(idea.id),
            "text": idea.text,
            "image_url": idea.image_url,
            "themes": [{"theme_id": str(t.id), "theme_name": t.name} for _, t in assignments],
        })

    graph = service.get_graph_data(db, space_id)

    purpose_synthesis = None
    synthesis_purpose = None
    synthesis_row = _get_current_synthesis(db, space.id)
    if synthesis_row:
        purpose_synthesis = {
            "space_summary": synthesis_row.space_summary,
            "theme_notes": synthesis_row.theme_notes or {},
            "note_states": synthesis_row.note_states or {},
            "dismiss_reasons": synthesis_row.dismiss_reasons or {},
            "completion_outcomes": synthesis_row.completion_outcomes or {},
            "completion_outcome_images": synthesis_row.completion_outcome_images or {},
            "generated_at": synthesis_row.generated_at.isoformat() if synthesis_row.generated_at else None,
            "expanded_summary": synthesis_row.expanded_summary,
            "expanded_theme_notes": synthesis_row.expanded_theme_notes or {},
        }
        synthesis_purpose = synthesis_row.purpose

    return {
        "space": {
            "title": space.title,
            "description": space.description,
            "purposes": _get_space_purposes(space),
            "purpose_synthesis": purpose_synthesis,
            "synthesis_purpose": synthesis_purpose,
        },
        "themes": themes_data,
        "ideas": ideas_data,
        "graph": graph,
    }


def _get_current_synthesis(db: Session, space_id: UUID, purpose: str = None) -> Optional[SpaceSynthesis]:
    """Get current synthesis for a space, optionally filtered by purpose."""
    query = db.query(SpaceSynthesis).filter(
        SpaceSynthesis.space_id == space_id,
        SpaceSynthesis.is_current == True,
    )
    if purpose:
        query = query.filter(SpaceSynthesis.purpose == purpose)
    return query.first()


def _create_synthesis_row(db: Session, space_id: UUID, purpose: str, synthesis_dict: dict) -> SpaceSynthesis:
    """Mark old is_current=False for space+purpose, then insert new row."""
    from datetime import datetime as dt

    db.query(SpaceSynthesis).filter(
        SpaceSynthesis.space_id == space_id,
        SpaceSynthesis.purpose == purpose,
        SpaceSynthesis.is_current == True,
    ).update({"is_current": False})

    generated_at = None
    if synthesis_dict.get("generated_at"):
        try:
            generated_at = dt.fromisoformat(synthesis_dict["generated_at"])
        except (ValueError, TypeError):
            generated_at = dt.utcnow()
    else:
        generated_at = dt.utcnow()

    row = SpaceSynthesis(
        space_id=space_id,
        purpose=purpose,
        space_summary=synthesis_dict.get("space_summary"),
        theme_notes=synthesis_dict.get("theme_notes", {}),
        note_states={},
        dismiss_reasons={},
        completion_outcomes={},
        completion_outcome_images={},
        is_current=True,
        generated_at=generated_at,
    )
    db.add(row)
    db.flush()
    return row


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


def _batch_build_space_list(spaces: list, db: Session, current_user: User) -> list[dict]:
    """Build SpaceListItem dicts for multiple spaces using batched queries.

    Replaces the N+1 pattern of calling _build_space_response() per space.
    Uses ~6 queries total instead of ~8 per space.
    """
    from sqlalchemy import case
    from collections import defaultdict

    if not spaces:
        return []

    space_ids = [s.id for s in spaces]
    owned_space_ids = [s.id for s in spaces if s.owner_id == current_user.id]

    # Q1: Idea counts (active + suggested) — one query for all spaces
    idea_rows = db.query(
        Idea.space_id,
        func.count(case((Idea.status == "active", 1))).label("active_count"),
        func.count(case((Idea.status == "suggested", 1))).label("suggested_count"),
    ).filter(
        Idea.space_id.in_(space_ids),
        Idea.status.in_(["active", "suggested"]),
    ).group_by(Idea.space_id).all()

    idea_counts = {r[0]: r[1] for r in idea_rows}
    suggestion_counts = {r[0]: r[2] for r in idea_rows}

    # Q2: Theme counts — one query
    theme_rows = db.query(
        Theme.space_id,
        func.count(Theme.id).label("theme_count"),
    ).filter(Theme.space_id.in_(space_ids)).group_by(Theme.space_id).all()

    theme_counts = {r[0]: r[1] for r in theme_rows}

    # Q3: Current syntheses — one query
    synthesis_rows = db.query(SpaceSynthesis).filter(
        SpaceSynthesis.space_id.in_(space_ids),
        SpaceSynthesis.is_current == True,
    ).all()

    # Keep first per space_id (if multiple purposes)
    syntheses: dict = {}
    for row in synthesis_rows:
        if row.space_id not in syntheses:
            syntheses[row.space_id] = row

    # Q4: Members + Users — one query
    member_rows = db.query(SpaceMember, User).join(
        User, SpaceMember.user_id == User.id
    ).filter(SpaceMember.space_id.in_(space_ids)).all()

    members_by_space: dict = defaultdict(list)
    for member, user in member_rows:
        members_by_space[member.space_id].append((member, user))

    # Q5: Shared viewers (owner spaces only) — one query
    shared_viewers_by_space: dict = defaultdict(list)
    if owned_space_ids:
        sv_rows = db.query(SpaceSharedViewer, User).outerjoin(
            User, SpaceSharedViewer.shared_user_id == User.id
        ).filter(
            SpaceSharedViewer.space_id.in_(owned_space_ids)
        ).order_by(SpaceSharedViewer.created_at.desc()).all()

        for sv, user in sv_rows:
            shared_viewers_by_space[sv.space_id].append((sv, user))

    # Build response dicts — pure Python, no DB calls
    result = []
    for space in spaces:
        sid = space.id
        is_owner = current_user.id == space.owner_id

        # Synthesis
        synthesis_row = syntheses.get(sid)
        purpose_synthesis = None
        synthesis_purpose = _get_space_purpose(space)
        if synthesis_row:
            purpose_synthesis = {
                "space_summary": synthesis_row.space_summary,
                "theme_notes": synthesis_row.theme_notes or {},
                "note_states": synthesis_row.note_states or {},
                "dismiss_reasons": synthesis_row.dismiss_reasons or {},
                "completion_outcomes": synthesis_row.completion_outcomes or {},
                "completion_outcome_images": synthesis_row.completion_outcome_images or {},
                "generated_at": synthesis_row.generated_at.isoformat() if synthesis_row.generated_at else None,
                "expanded_summary": synthesis_row.expanded_summary,
                "expanded_theme_notes": synthesis_row.expanded_theme_notes or {},
            }
            synthesis_purpose = synthesis_row.purpose

        # Members
        member_pairs = members_by_space.get(sid, [])
        member_count = max(len(member_pairs), 1)
        members_data = [
            {
                "id": m.id, "space_id": m.space_id, "user_id": m.user_id,
                "role": m.role, "joined_at": m.joined_at,
                "user_name": u.full_name, "user_email": u.email,
            }
            for m, u in member_pairs
        ]

        # Role determination
        can_edit = True
        can_suggest = True
        if not is_owner:
            user_member = next((m for m, _ in member_pairs if m.user_id == current_user.id), None)
            if user_member and user_member.role == "viewer":
                can_edit = False
                can_suggest = False
            elif user_member and user_member.role == "suggester":
                can_edit = False

        # Shared viewers (owner only)
        shared_viewers_data = None
        if is_owner:
            shared_viewers_data = [
                {
                    "id": sv.id, "space_id": sv.space_id, "email": sv.email,
                    "access_level": sv.access_level, "can_export": sv.can_export,
                    "shared_user_name": u.full_name if u else None,
                    "created_at": sv.created_at,
                }
                for sv, u in shared_viewers_by_space.get(sid, [])
            ]

        result.append({
            "id": space.id,
            "title": space.title,
            "description": space.description,
            "purpose": _get_space_purpose(space),
            "purposes": _get_space_purposes(space),
            "synthesis_purpose": synthesis_purpose,
            "purpose_synthesis": purpose_synthesis,
            "synthesis_activity_log": None,  # Skipped in list view — loaded on detail
            "idea_count": idea_counts.get(sid, 0),
            "theme_count": theme_counts.get(sid, 0),
            "auto_organize": space.auto_organize,
            "clustering_mode": space.clustering_mode,
            "last_organized_at": space.last_organized_at,
            "created_at": space.created_at,
            "updated_at": space.updated_at,
            "owner_id": space.owner_id,
            "is_owner": is_owner,
            "can_edit": can_edit,
            "can_suggest": can_suggest,
            "suggestion_count": suggestion_counts.get(sid, 0) if can_edit else 0,
            "member_count": member_count,
            "members": members_data,
            "share_access": getattr(space, "share_access", None),
            "is_shared_view": False,
            "shared_viewers": shared_viewers_data,
            "viewer_can_export": None,
            "viewer_access_level": None,
            "graph_min_edge_strength": (space.settings or {}).get("graph_min_edge_strength"),
        })

    return result


def _build_space_response(space: Space, db: Session, current_user: Optional[User] = None, is_shared_view: bool = False) -> dict:
    """Build a SpaceResponse dict with counts and membership info."""
    idea_count = db.query(func.count(Idea.id)).filter(
        Idea.space_id == space.id, Idea.status == "active"
    ).scalar() or 0
    theme_count = db.query(func.count(Theme.id)).filter(
        Theme.space_id == space.id
    ).scalar() or 0
    # Read synthesis from dedicated table
    synthesis_row = _get_current_synthesis(db, space.id)
    purpose_synthesis = None
    synthesis_purpose = _get_space_purpose(space)
    if synthesis_row:
        purpose_synthesis = {
            "space_summary": synthesis_row.space_summary,
            "theme_notes": synthesis_row.theme_notes or {},
            "note_states": synthesis_row.note_states or {},
            "dismiss_reasons": synthesis_row.dismiss_reasons or {},
            "completion_outcomes": synthesis_row.completion_outcomes or {},
            "completion_outcome_images": synthesis_row.completion_outcome_images or {},
            "generated_at": synthesis_row.generated_at.isoformat() if synthesis_row.generated_at else None,
            "expanded_summary": synthesis_row.expanded_summary,
            "expanded_theme_notes": synthesis_row.expanded_theme_notes or {},
        }
        synthesis_purpose = synthesis_row.purpose

    # Shared viewers get limited data
    if is_shared_view:
        # Check if this viewer has a shared_viewer record (for can_export)
        viewer_can_export = None
        viewer_access_level = None
        if current_user:
            sv = db.query(SpaceSharedViewer).filter(
                SpaceSharedViewer.space_id == space.id,
                SpaceSharedViewer.email == current_user.email.lower(),
            ).first()
            if sv:
                viewer_can_export = sv.can_export
                viewer_access_level = sv.access_level
        return {
            "id": space.id,
            "title": space.title,
            "description": space.description,
            "purpose": _get_space_purpose(space),
            "purposes": _get_space_purposes(space),
            "synthesis_purpose": synthesis_purpose,
            "purpose_synthesis": purpose_synthesis,
            "synthesis_activity_log": None,
            "idea_count": idea_count,
            "theme_count": theme_count,
            "auto_organize": space.auto_organize,
            "clustering_mode": space.clustering_mode,
            "last_organized_at": space.last_organized_at,
            "created_at": space.created_at,
            "updated_at": space.updated_at,
            "owner_id": space.owner_id,
            "is_owner": False,
            "can_edit": False,
            "can_suggest": False,
            "suggestion_count": 0,
            "member_count": 0,
            "members": None,
            "share_access": getattr(space, "share_access", None),
            "is_shared_view": True,
            "shared_viewers": None,
            "viewer_can_export": viewer_can_export,
            "viewer_access_level": viewer_access_level,
            "graph_min_edge_strength": (space.settings or {}).get("graph_min_edge_strength"),
        }

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

    # Determine edit/suggest permissions based on role
    can_edit = True
    can_suggest = True
    user_role = "owner" if is_owner else None
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
        if user_member:
            user_role = user_member.role
        if user_member and user_member.role == "viewer":
            can_edit = False
            can_suggest = False
        elif user_member and user_member.role == "suggester":
            can_edit = False

    # Count pending suggestions (only for editors/owners who can review them)
    suggestion_count = 0
    if can_edit:
        suggestion_count = db.query(func.count(Idea.id)).filter(
            Idea.space_id == space.id, Idea.status == "suggested"
        ).scalar() or 0

    # Shared viewers (only for owner)
    shared_viewers_data = None
    if is_owner:
        sv_rows = (
            db.query(SpaceSharedViewer, User)
            .outerjoin(User, SpaceSharedViewer.shared_user_id == User.id)
            .filter(SpaceSharedViewer.space_id == space.id)
            .order_by(SpaceSharedViewer.created_at.desc())
            .all()
        )
        shared_viewers_data = [
            {
                "id": sv.id,
                "space_id": sv.space_id,
                "email": sv.email,
                "access_level": sv.access_level,
                "can_export": sv.can_export,
                "shared_user_name": u.full_name if u else None,
                "created_at": sv.created_at,
            }
            for sv, u in sv_rows
        ]

    return {
        "id": space.id,
        "title": space.title,
        "description": space.description,
        "purpose": _get_space_purpose(space),
        "purposes": _get_space_purposes(space),
        "synthesis_purpose": synthesis_purpose,
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
        "can_suggest": can_suggest,
        "suggestion_count": suggestion_count,
        "member_count": member_count,
        "members": members_data,
        "share_access": getattr(space, "share_access", None),
        "is_shared_view": False,
        "shared_viewers": shared_viewers_data,
        "viewer_can_export": None,
        "viewer_access_level": None,
        "graph_min_edge_strength": (space.settings or {}).get("graph_min_edge_strength"),
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
        "image_url": idea.image_url,
        "author_name": idea.author.full_name if idea.author else None,
        "themes": themes,
        "created_at": idea.created_at,
        "updated_at": idea.updated_at,
    }


def log_space_activity(
    db: Session,
    space_id: UUID,
    user_id: Optional[UUID],
    user_name: Optional[str],
    event_type: str,
    detail: Optional[str] = None,
):
    """Record an activity log entry and broadcast via SSE."""
    if detail and len(detail) > 200:
        detail = detail[:200]
    entry = SpaceActivityLog(
        space_id=space_id,
        user_id=user_id,
        user_name=user_name,
        event_type=event_type,
        detail=detail,
    )
    db.add(entry)
    db.flush()
    # Broadcast to all space members
    _broadcast_sse_to_space(db, space_id, "space_activity", {
        "id": str(entry.id),
        "space_id": str(entry.space_id),
        "user_id": str(entry.user_id) if entry.user_id else None,
        "user_name": entry.user_name,
        "event_type": entry.event_type,
        "detail": entry.detail,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
    })


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
                if synthesis:
                    _create_synthesis_row(db, space_id, purpose, synthesis)
                db.commit()

            _broadcast_sse_to_space(db, space_id, "space_organize_completed", {"space_id": str(space_id)})
    except Exception as e:
        logger.error(f"Error in classify/auto-organize for idea {idea_id} in space {space_id}: {e}", exc_info=True)
    finally:
        db.close()
        engine.dispose()


def run_organize_space_task(space_id: UUID, owner_id: UUID, db_url: str, context: Optional[str] = None, user_name: Optional[str] = None):
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
            if synthesis:
                _create_synthesis_row(db, space_id, purpose, synthesis)
            db.commit()

        # Log organize_completed activity
        theme_count = db.query(func.count(Theme.id)).filter(Theme.space_id == space_id).scalar() or 0
        detail = f"{theme_count} theme{'s' if theme_count != 1 else ''}"
        log_space_activity(db, space_id, owner_id, user_name, "organize_completed", detail=detail)
        db.commit()

        # Auto-snapshot after organize
        if space:
            try:
                snapshot_data = _build_snapshot_data(db, space)
                snapshot = SpaceSnapshot(
                    space_id=space_id,
                    created_by_id=owner_id,
                    title=None,
                    snapshot_type="organize",
                    snapshot_data=snapshot_data,
                )
                db.add(snapshot)
                db.commit()
            except Exception as snap_err:
                logger.error(f"Failed to create auto-snapshot for space {space_id}: {snap_err}")

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
            if synthesis:
                _create_synthesis_row(db, space_id, purpose, synthesis)
            db.commit()
            _broadcast_sse_to_space(db, space_id, "space_organize_completed", {"space_id": str(space_id)})
        else:
            # Just regenerate synthesis to incorporate feedback (no re-clustering)
            logger.info(f"Regenerating synthesis for space {space_id} after note feedback")
            purpose = _get_space_purpose(space)
            synthesis = service.generate_purpose_synthesis(db, space_id, purpose)
            if synthesis:
                _create_synthesis_row(db, space_id, purpose, synthesis)
                db.commit()
                _broadcast_sse_to_space(db, space_id, "space_organize_completed", {"space_id": str(space_id)})
    except Exception as e:
        logger.error(f"Error in check-and-resynthesize for space {space_id}: {e}", exc_info=True)
    finally:
        db.close()
        engine.dispose()


def run_resynthesize_task(space_id: UUID, purpose: str, owner_id: UUID, db_url: str, user_name: Optional[str] = None):
    """Background task to regenerate synthesis with a different purpose lens (no re-clustering)."""
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

        # Persist completed/dismissed notes before replacing synthesis
        SpaceService.save_synthesis_actions(db, space)

        synthesis = service.generate_purpose_synthesis(db, space_id, purpose)
        if synthesis:
            _create_synthesis_row(db, space_id, purpose, synthesis)
        db.commit()

        _broadcast_sse_to_space(db, space_id, "space_organize_completed", {"space_id": str(space_id)})
    except Exception as e:
        logger.error(f"Error in resynthesize for space {space_id}: {e}", exc_info=True)
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
    from app.services.workspace_service import resolve_workspace_id, require_workspace_role

    tier = _require_spaces_flag(current_user, db)

    # Resolve workspace (supports workspace_id, organization_id, or personal fallback)
    workspace_id = resolve_workspace_id(
        db,
        workspace_id=data.workspace_id,
        organization_id=data.organization_id,
        user_id=current_user.id,
    )
    require_workspace_role(db, workspace_id, current_user, "editor")

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
    if data.purposes:
        space_settings["purposes"] = data.purposes
    elif data.purpose:
        space_settings["purposes"] = [data.purpose]

    space = Space(
        title=data.title,
        description=data.description,
        owner_id=current_user.id,
        organization_id=data.organization_id,
        workspace_id=workspace_id,
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

    # Log workspace activity
    if workspace_id:
        log_workspace_activity(
            db,
            workspace_id=workspace_id,
            event_type="space_created",
            user_id=current_user.id,
            user_name=current_user.full_name or current_user.email,
            entity_type="space",
            entity_id=space.id,
            entity_name=space.title,
        )

    db.commit()
    db.refresh(space)

    return _build_space_response(space, db, current_user)


@router.get("", response_model=list[SpaceListItem])
def list_spaces(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    workspace_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    personal: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List spaces the current user owns or is a member of, scoped by workspace context."""
    member_space_ids = (
        db.query(SpaceMember.space_id)
        .filter(SpaceMember.user_id == current_user.id)
        .subquery()
    )
    query = (
        db.query(Space)
        .filter(
            or_(
                Space.owner_id == current_user.id,
                Space.id.in_(db.query(member_space_ids)),
            )
        )
    )

    # Scope by workspace or organization (backward compat)
    if workspace_id:
        query = query.filter(Space.workspace_id == workspace_id)
    elif org_id:
        # Backward compat: resolve org to default workspace
        from app.services.workspace_service import resolve_workspace_id
        resolved_ws_id = resolve_workspace_id(db, organization_id=org_id)
        query = query.filter(Space.workspace_id == resolved_ws_id)
    else:
        query = query.filter(Space.organization_id.is_(None))

    spaces = (
        query
        .order_by(Space.updated_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return _batch_build_space_list(spaces, db, current_user)


@router.get("/{space_id}", response_model=SpaceResponse)
def get_space(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a space with counts. Supports shared viewing."""
    space, is_shared_view = _get_space_with_sharing(space_id, current_user, db)
    return _build_space_response(space, db, current_user, is_shared_view=is_shared_view)


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
    if data.purposes is not None:
        current_settings = dict(space.settings) if space.settings else {}
        old_purposes = set(current_settings.get("purposes", [current_settings.get("purpose", "explore")]))
        current_settings["purposes"] = data.purposes
        # Mark syntheses not current if the set of purposes actually changed
        if set(data.purposes) != old_purposes:
            db.query(SpaceSynthesis).filter(
                SpaceSynthesis.space_id == space.id,
                SpaceSynthesis.is_current == True,
            ).update({"is_current": False})
        space.settings = current_settings
        flag_modified(space, "settings")
    elif data.purpose is not None:
        current_settings = dict(space.settings) if space.settings else {}
        current_settings["purposes"] = [data.purpose]
        # Mark all syntheses not current when purpose changes
        db.query(SpaceSynthesis).filter(
            SpaceSynthesis.space_id == space.id,
            SpaceSynthesis.is_current == True,
        ).update({"is_current": False})
        space.settings = current_settings
        flag_modified(space, "settings")
    if data.graph_min_edge_strength is not None:
        current_settings = dict(space.settings) if space.settings else {}
        current_settings["graph_min_edge_strength"] = data.graph_min_edge_strength
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
    _require_space_suggester(space_id, current_user, db)

    is_suggestion = _is_suggester(space_id, current_user, db)

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
        image_url=data.image_url,
        embedding=embedding,
        status="suggested" if is_suggestion else "active",
    )
    db.add(idea)

    if is_suggestion:
        log_space_activity(db, space_id, current_user.id, current_user.full_name, "suggestion_submitted", detail=data.text[:80])
    else:
        log_space_activity(db, space_id, current_user.id, current_user.full_name, "idea_added", detail=data.text[:80])
    db.commit()
    db.refresh(idea)

    from app.services.sse_service import sse_service
    member_ids = _get_space_member_ids(db, space_id)

    if is_suggestion:
        # Notify editors/owners that a new suggestion was submitted
        for uid in member_ids:
            if uid != current_user.id:
                sse_service.send_to_user_sync(uid, "space_suggestion_submitted", {"space_id": str(space_id)})
    else:
        # Notify other members that a new idea was added
        for uid in member_ids:
            if uid != current_user.id:
                sse_service.send_to_user_sync(uid, "space_idea_added", {"space_id": str(space_id)})

        # Classify in background against existing themes (skip for suggestions)
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
    since: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List ideas in a space, optionally filtered by theme or unthemed. Supports shared viewing."""
    _get_space_with_sharing(space_id, current_user, db, require_live=True)

    query = db.query(Idea).filter(Idea.space_id == space_id, Idea.status == "active")

    if since is not None:
        query = query.filter(Idea.created_at >= since)

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

    log_space_activity(db, space_id, current_user.id, current_user.full_name, "idea_edited", detail=data.text[:80])
    db.commit()

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
    log_space_activity(db, space_id, current_user.id, current_user.full_name, "idea_removed", detail=idea.text[:80])
    db.commit()


# --- Suggestions ---

@router.get("/{space_id}/suggestions", response_model=list[IdeaResponse])
def list_suggestions(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List pending suggestions for a space. Editors/owners only."""
    _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    suggestions = (
        db.query(Idea, User)
        .join(User, Idea.author_id == User.id)
        .filter(Idea.space_id == space_id, Idea.status == "suggested")
        .order_by(Idea.created_at.desc())
        .all()
    )
    result = []
    for idea, author in suggestions:
        resp = _build_idea_response(idea, db)
        resp["author_name"] = author.full_name
        result.append(resp)
    return result


@router.post("/{space_id}/suggestions/{idea_id}/approve", response_model=IdeaResponse)
def approve_suggestion(
    space_id: UUID,
    idea_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve a suggestion, making it an active idea. Triggers classification."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    idea = db.query(Idea).filter(
        Idea.id == idea_id, Idea.space_id == space_id, Idea.status == "suggested"
    ).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    idea.status = "active"
    idea.reviewed_by = current_user.id
    idea.reviewed_at = datetime.utcnow()
    log_space_activity(db, space_id, current_user.id, current_user.full_name, "suggestion_approved", detail=idea.text[:80])
    db.commit()
    db.refresh(idea)

    # Notify members
    _broadcast_sse_to_space(db, space_id, "space_idea_added", {"space_id": str(space_id)})

    # Classify in background
    background_tasks.add_task(
        run_classify_idea_task,
        idea_id=idea.id,
        space_id=space_id,
        owner_id=space.owner_id,
        db_url=str(settings.DATABASE_URL),
    )

    return _build_idea_response(idea, db)


@router.post("/{space_id}/suggestions/{idea_id}/reject", status_code=status.HTTP_200_OK)
def reject_suggestion(
    space_id: UUID,
    idea_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Reject a suggestion. It will not appear in the main ideas list."""
    _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    idea = db.query(Idea).filter(
        Idea.id == idea_id, Idea.space_id == space_id, Idea.status == "suggested"
    ).first()
    if not idea:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    idea.status = "rejected"
    idea.reviewed_by = current_user.id
    idea.reviewed_at = datetime.utcnow()
    log_space_activity(db, space_id, current_user.id, current_user.full_name, "suggestion_rejected", detail=idea.text[:80])
    db.commit()

    return {"message": "Suggestion dismissed"}


# --- Image-to-Ideas ---

@router.post("/{space_id}/ideas/extract-from-image", response_model=ImageExtractResponse)
def extract_ideas_from_image(
    space_id: UUID,
    data: ImageExtractRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Use Claude vision to extract ideas from an uploaded image."""
    _require_spaces_flag(current_user, db)
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_suggester(space_id, current_user, db)

    from app.services.image_idea_service import ImageIdeaService
    from app.services.platform_settings_service import get_llm_model

    service = ImageIdeaService(model=get_llm_model(db))
    result = service.extract(
        image_url=data.image_url,
        space_title=space.title,
        space_description=space.description,
        user_description=data.description,
    )
    return result


@router.post("/{space_id}/ideas/extract-from-image/clarify", response_model=ImageExtractResponse)
def clarify_image_extraction(
    space_id: UUID,
    data: ImageClarifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Follow-up extraction after answering clarifying questions."""
    _require_spaces_flag(current_user, db)
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_suggester(space_id, current_user, db)

    from app.services.image_idea_service import ImageIdeaService
    from app.services.platform_settings_service import get_llm_model

    service = ImageIdeaService(model=get_llm_model(db))
    result = service.extract_with_clarification(
        image_url=data.image_url,
        space_title=space.title,
        space_description=space.description,
        user_description=data.description,
        questions=data.questions,
        answers=data.answers,
    )
    return result


@router.post("/{space_id}/ideas/batch", response_model=list[IdeaResponse], status_code=status.HTTP_201_CREATED)
def create_ideas_batch(
    space_id: UUID,
    data: IdeaBatchCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create multiple ideas at once (e.g. from image extraction)."""
    from app.services.feature_flag_service import feature_flag_service
    from app.services.subscription_service import subscription_service
    from app.services.space_service import SpaceService
    from app.services.platform_settings_service import get_llm_model

    _require_spaces_flag(current_user, db)
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_suggester(space_id, current_user, db)

    is_suggestion = _is_suggester(space_id, current_user, db)

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
        if current_count + len(data.ideas) > max_ideas:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Adding {len(data.ideas)} ideas would exceed the maximum ({max_ideas}) for your plan",
            )

    llm_model = get_llm_model(db)
    service = SpaceService(model=llm_model)

    created_ideas = []
    for idea_data in data.ideas:
        embedding = service.generate_embedding(idea_data.text)
        idea = Idea(
            space_id=space_id,
            author_id=current_user.id,
            text=idea_data.text,
            image_url=idea_data.image_url,
            embedding=embedding,
            status="suggested" if is_suggestion else "active",
        )
        db.add(idea)
        created_ideas.append(idea)

    db.flush()

    # Log activity for batch
    detail = f"{len(created_ideas)} ideas from image"
    event_type = "suggestion_submitted" if is_suggestion else "idea_added"
    log_space_activity(db, space_id, current_user.id, current_user.full_name, event_type, detail=detail)
    db.commit()

    for idea in created_ideas:
        db.refresh(idea)

    # SSE notifications
    from app.services.sse_service import sse_service
    member_ids = _get_space_member_ids(db, space_id)
    sse_event = "space_suggestion_submitted" if is_suggestion else "space_idea_added"
    for uid in member_ids:
        if uid != current_user.id:
            sse_service.send_to_user_sync(uid, sse_event, {"space_id": str(space_id)})

    # Queue background classification for each active idea
    if not is_suggestion:
        for idea in created_ideas:
            background_tasks.add_task(
                run_classify_idea_task,
                idea_id=idea.id,
                space_id=space_id,
                owner_id=space.owner_id,
                db_url=str(settings.DATABASE_URL),
            )

    return [_build_idea_response(i, db) for i in created_ideas]


# --- Themes ---

@router.get("/{space_id}/themes", response_model=list[ThemeResponse])
def list_themes(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List themes in a space with idea counts. Supports shared viewing."""
    _get_space_with_sharing(space_id, current_user, db, require_live=True)

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
        sse_service.send_to_user_sync(uid, "space_organize_started", {"space_id": str(space_id), "triggered_by": current_user.full_name})

    log_space_activity(db, space_id, current_user.id, current_user.full_name, "organize_started")
    db.commit()

    background_tasks.add_task(
        run_organize_space_task,
        space_id=space.id,
        owner_id=space.owner_id,
        db_url=str(settings.DATABASE_URL),
        context=context,
        user_name=current_user.full_name,
    )

    return {"message": "Organization started", "idea_count": idea_count}


@router.post("/{space_id}/resynthesize", status_code=status.HTTP_202_ACCEPTED)
def resynthesize_space(
    space_id: UUID,
    data: ResynthesizeRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Re-synthesize with a different purpose lens (no re-clustering)."""
    _require_spaces_flag(current_user, db)
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    # Validate purpose is in the space's configured purposes
    configured_purposes = _get_space_purposes(space)
    if data.purpose not in configured_purposes:
        raise HTTPException(
            status_code=400,
            detail=f"Purpose '{data.purpose}' is not configured for this space",
        )

    # Check that themes exist
    theme_count = db.query(func.count(Theme.id)).filter(Theme.space_id == space_id).scalar() or 0
    if theme_count == 0:
        raise HTTPException(status_code=400, detail="Organize the space first before re-synthesizing")

    # Send organize_started to all members
    from app.services.sse_service import sse_service
    for uid in _get_space_member_ids(db, space_id):
        sse_service.send_to_user_sync(uid, "space_organize_started", {"space_id": str(space_id), "triggered_by": current_user.full_name})

    background_tasks.add_task(
        run_resynthesize_task,
        space_id=space.id,
        purpose=data.purpose,
        owner_id=space.owner_id,
        db_url=str(settings.DATABASE_URL),
        user_name=current_user.full_name,
    )

    return {"message": "Re-synthesis started", "purpose": data.purpose}


def run_expand_synthesis_task(space_id: UUID, synthesis_id: UUID, purpose: str, space_summary: str, theme_notes: dict, db_url: str):
    """Background task to generate expanded synthesis."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.services.space_service import SpaceService
    from app.services.platform_settings_service import get_llm_model
    from app.models.space_synthesis import SpaceSynthesis

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        llm_model = get_llm_model(db)
        service = SpaceService(model=llm_model)
        result = service.generate_expanded_synthesis(
            db, space_id, purpose, space_summary, theme_notes,
        )

        if result:
            synthesis_row = db.query(SpaceSynthesis).filter(SpaceSynthesis.id == synthesis_id).first()
            if synthesis_row:
                synthesis_row.expanded_summary = result["expanded_summary"]
                synthesis_row.expanded_theme_notes = result.get("expanded_theme_notes", {})
                db.commit()

        _broadcast_sse_to_space(db, space_id, "space_synthesis_expanded", {
            "space_id": str(space_id),
            "expanded_summary": result.get("expanded_summary", "") if result else "",
            "expanded_theme_notes": result.get("expanded_theme_notes", {}) if result else {},
        })
    except Exception as e:
        logger.error(f"Error in expand-synthesis for space {space_id}: {e}", exc_info=True)
        _broadcast_sse_to_space(db, space_id, "space_synthesis_expanded", {
            "space_id": str(space_id),
            "error": "Failed to generate expanded synthesis",
        })
    finally:
        db.close()
        engine.dispose()


@router.post("/{space_id}/expand-synthesis", status_code=status.HTTP_202_ACCEPTED)
def expand_synthesis(
    space_id: UUID,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an expanded, detailed version of the current synthesis."""
    _require_spaces_flag(current_user, db)
    space = _get_space_or_404(space_id, current_user, db)

    # Get current synthesis
    synthesis_row = _get_current_synthesis(db, space.id)
    if not synthesis_row or not synthesis_row.space_summary:
        raise HTTPException(status_code=400, detail="No synthesis to expand. Organize the space first.")

    # If already expanded, return existing immediately
    if synthesis_row.expanded_summary:
        return {
            "status": "ready",
            "expanded_summary": synthesis_row.expanded_summary,
            "expanded_theme_notes": synthesis_row.expanded_theme_notes or {},
        }

    background_tasks.add_task(
        run_expand_synthesis_task,
        space_id=space.id,
        synthesis_id=synthesis_row.id,
        purpose=synthesis_row.purpose,
        space_summary=synthesis_row.space_summary,
        theme_notes=synthesis_row.theme_notes or {},
        db_url=str(settings.DATABASE_URL),
    )

    return {"status": "started", "message": "Expanding synthesis..."}


# --- Artifact Generation ---


def run_generate_artifact_task(
    space_id: UUID,
    artifact_id: UUID,
    artifact_type: str,
    purpose: str,
    space_title: str,
    space_description: Optional[str],
    user_context: Optional[str],
    db_url: str,
):
    """Background task to generate an artifact."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.services.space_service import SpaceService
    from app.services.platform_settings_service import get_llm_model
    from app.models.space_artifact import SpaceArtifact

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        llm_model = get_llm_model(db)
        service = SpaceService(model=llm_model)
        result = service.generate_artifact(
            db, space_id, artifact_type, purpose,
            space_title, space_description, user_context,
        )

        # Inject poster preferences into content JSON
        if result and artifact_type == "poster" and user_context:
            uc = user_context.lower()
            result["orientation"] = "portrait" if "portrait" in uc else "landscape"
            # Theme
            for theme_val in ("dark", "vibrant", "light"):
                if f"theme: {theme_val}" in uc:
                    result["poster_theme"] = theme_val
                    break
            # Accent color
            import re
            accent_match = re.search(r"accent color:\s*([^.]+)", uc)
            if accent_match:
                result["poster_accent"] = accent_match.group(1).strip()

        artifact_row = db.query(SpaceArtifact).filter(SpaceArtifact.id == artifact_id).first()
        if artifact_row:
            if result:
                artifact_row.content = result
                artifact_row.title = result.get("title", SpaceService.ARTIFACT_TYPES.get(artifact_type, {}).get("label", artifact_type))
                artifact_row.status = "ready"
                db.commit()
            else:
                db.delete(artifact_row)
                db.commit()

        _broadcast_sse_to_space(db, space_id, "space_artifact_generated", {
            "space_id": str(space_id),
            "artifact_id": str(artifact_id),
            "artifact_type": artifact_type,
            "status": "ready" if result else "failed",
            "title": result.get("title", "") if result else "",
        })
    except Exception as e:
        logger.error(f"Error generating artifact for space {space_id}: {e}", exc_info=True)
        artifact_row = db.query(SpaceArtifact).filter(SpaceArtifact.id == artifact_id).first()
        if artifact_row:
            db.delete(artifact_row)
            db.commit()
        _broadcast_sse_to_space(db, space_id, "space_artifact_generated", {
            "space_id": str(space_id),
            "artifact_id": str(artifact_id),
            "artifact_type": artifact_type,
            "status": "failed",
        })
    finally:
        db.close()
        engine.dispose()


@router.post("/{space_id}/artifacts", status_code=status.HTTP_202_ACCEPTED)
def generate_artifact(
    space_id: UUID,
    data: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate an artifact (summary, checklist, plan, etc.) for a space."""
    _require_spaces_flag(current_user, db)
    space = _get_space_or_404(space_id, current_user, db)

    artifact_type = data.get("artifact_type")
    user_context = data.get("user_context")
    requested_synthesis_id = data.get("synthesis_id")  # Optional: tie to a specific checkpoint
    organize_run_id = data.get("organize_run_id")  # Optional: which organize run this belongs to

    from app.services.space_service import SpaceService
    if artifact_type not in SpaceService.ARTIFACT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid artifact type: {artifact_type}")

    # Need themes to generate
    theme_count = db.query(func.count(Theme.id)).filter(Theme.space_id == space_id).scalar() or 0
    if theme_count == 0:
        raise HTTPException(status_code=400, detail="Organize the space first before generating artifacts")

    # Get synthesis to tie the artifact to (specific or current)
    if requested_synthesis_id:
        synthesis_row = db.query(SpaceSynthesis).filter(
            SpaceSynthesis.id == requested_synthesis_id,
            SpaceSynthesis.space_id == space_id,
        ).first()
        if not synthesis_row:
            raise HTTPException(status_code=404, detail="Synthesis not found")
    else:
        synthesis_row = _get_current_synthesis(db, space.id)

    # Create artifact row in generating state
    from app.models.space_artifact import SpaceArtifact
    import uuid
    artifact_row = SpaceArtifact(
        id=uuid.uuid4(),
        space_id=space.id,
        synthesis_id=synthesis_row.id if synthesis_row else None,
        organize_run_id=organize_run_id,
        created_by_id=current_user.id,
        artifact_type=artifact_type,
        user_context=user_context,
        status="generating",
    )
    db.add(artifact_row)
    db.commit()

    purpose = _get_space_purpose(space)
    background_tasks.add_task(
        run_generate_artifact_task,
        space_id=space.id,
        artifact_id=artifact_row.id,
        artifact_type=artifact_type,
        purpose=purpose,
        space_title=space.title,
        space_description=space.description,
        user_context=user_context,
        db_url=str(settings.DATABASE_URL),
    )

    return {
        "id": str(artifact_row.id),
        "artifact_type": artifact_type,
        "status": "generating",
        "message": f"Generating {SpaceService.ARTIFACT_TYPES[artifact_type]['label']}...",
    }


@router.get("/{space_id}/artifacts")
def list_artifacts(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all artifacts for a space (only originals, not versions)."""
    _require_spaces_flag(current_user, db)
    _get_space_or_404(space_id, current_user, db)

    from app.models.space_artifact import SpaceArtifact
    # Only show originals (parent_id is null)
    rows = (
        db.query(SpaceArtifact)
        .filter(SpaceArtifact.space_id == space_id, SpaceArtifact.parent_id == None)
        .order_by(SpaceArtifact.created_at.desc())
        .all()
    )

    result = []
    for r in rows:
        # Find latest version
        latest = (
            db.query(SpaceArtifact)
            .filter(SpaceArtifact.parent_id == r.id, SpaceArtifact.status == "ready")
            .order_by(SpaceArtifact.version.desc())
            .first()
        )
        display = latest or r
        version_count = (
            db.query(func.count(SpaceArtifact.id))
            .filter(SpaceArtifact.parent_id == r.id)
            .scalar() or 0
        ) + 1  # +1 for the original

        result.append({
            "id": str(r.id),
            "artifact_type": r.artifact_type,
            "title": display.title,
            "status": display.status,
            "user_context": r.user_context,
            "synthesis_id": str(r.synthesis_id) if r.synthesis_id else None,
            "organize_run_id": r.organize_run_id,
            "created_at": _utc_iso(r.created_at),
            "version_count": version_count,
            "latest_version_id": str(display.id) if latest else None,
        })

    return result


@router.get("/{space_id}/artifacts/{artifact_id}")
def get_artifact(
    space_id: UUID,
    artifact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single artifact with its content."""
    _require_spaces_flag(current_user, db)
    _get_space_or_404(space_id, current_user, db)

    from app.models.space_artifact import SpaceArtifact
    row = db.query(SpaceArtifact).filter(
        SpaceArtifact.id == artifact_id,
        SpaceArtifact.space_id == space_id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Artifact not found")

    # Determine original_id for version queries
    original_id = row.parent_id or row.id

    # Get all versions (original + children)
    all_versions = (
        db.query(SpaceArtifact)
        .filter(
            ((SpaceArtifact.id == original_id) | (SpaceArtifact.parent_id == original_id)),
            SpaceArtifact.status == "ready",
        )
        .order_by(SpaceArtifact.version.desc())
        .all()
    )

    versions = [
        {
            "id": str(v.id),
            "version": v.version,
            "refinement": v.refinement,
            "refinement_summary": v.refinement_summary,
            "created_at": _utc_iso(v.created_at),
        }
        for v in all_versions
    ]

    return {
        "id": str(row.id),
        "artifact_type": row.artifact_type,
        "title": row.title,
        "status": row.status,
        "content": row.content,
        "user_context": row.user_context,
        "version": row.version,
        "refinement": row.refinement,
        "parent_id": str(row.parent_id) if row.parent_id else None,
        "synthesis_id": str(row.synthesis_id) if row.synthesis_id else None,
        "organize_run_id": row.organize_run_id,
        "created_at": _utc_iso(row.created_at),
        "versions": versions,
    }


@router.delete("/{space_id}/artifacts/{artifact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_artifact(
    space_id: UUID,
    artifact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an artifact."""
    _require_spaces_flag(current_user, db)
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    from app.models.space_artifact import SpaceArtifact
    row = db.query(SpaceArtifact).filter(
        SpaceArtifact.id == artifact_id,
        SpaceArtifact.space_id == space_id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Artifact not found")

    db.delete(row)
    db.commit()


def _generate_refinement_summary(refinement: str) -> str | None:
    """Generate a 3-5 word summary of refinement instructions using Haiku."""
    try:
        from anthropic import Anthropic
        from app.core.config import settings as app_settings
        client = Anthropic(api_key=app_settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=20,
            messages=[{"role": "user", "content": f'Summarize this instruction in 3-5 words. Return ONLY the summary, nothing else.\n\n"{refinement}"'}],
        )
        return response.content[0].text.strip()[:60]
    except Exception:
        logger.warning("Failed to generate refinement summary", exc_info=True)
        return None


def run_refine_artifact_task(
    space_id: UUID,
    new_artifact_id: UUID,
    artifact_type: str,
    previous_content: dict,
    refinement: str,
    purpose: str,
    space_title: str,
    space_description: Optional[str],
    db_url: str,
):
    """Background task to generate a refined artifact version."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.services.space_service import SpaceService
    from app.services.platform_settings_service import get_llm_model
    from app.models.space_artifact import SpaceArtifact

    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        llm_model = get_llm_model(db)
        service = SpaceService(model=llm_model)
        result = service.refine_artifact(
            db, space_id, previous_content, artifact_type,
            refinement, purpose, space_title, space_description,
        )

        # Generate a short summary of the refinement instructions
        summary = _generate_refinement_summary(refinement)

        artifact_row = db.query(SpaceArtifact).filter(SpaceArtifact.id == new_artifact_id).first()
        if artifact_row:
            if result:
                artifact_row.content = result
                artifact_row.title = result.get("title", artifact_row.title)
                artifact_row.refinement_summary = summary
                artifact_row.status = "ready"
                db.commit()
            else:
                db.delete(artifact_row)
                db.commit()

        _broadcast_sse_to_space(db, space_id, "space_artifact_generated", {
            "space_id": str(space_id),
            "artifact_id": str(new_artifact_id),
            "artifact_type": artifact_type,
            "status": "ready" if result else "failed",
            "title": result.get("title", "") if result else "",
        })
    except Exception as e:
        logger.error(f"Error refining artifact for space {space_id}: {e}", exc_info=True)
        artifact_row = db.query(SpaceArtifact).filter(SpaceArtifact.id == new_artifact_id).first()
        if artifact_row:
            db.delete(artifact_row)
            db.commit()
        _broadcast_sse_to_space(db, space_id, "space_artifact_generated", {
            "space_id": str(space_id),
            "artifact_id": str(new_artifact_id),
            "artifact_type": artifact_type,
            "status": "failed",
        })
    finally:
        db.close()
        engine.dispose()


@router.post("/{space_id}/artifacts/{artifact_id}/refine", status_code=status.HTTP_202_ACCEPTED)
def refine_artifact(
    space_id: UUID,
    artifact_id: UUID,
    data: dict,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a refined version of an artifact."""
    _require_spaces_flag(current_user, db)
    space = _get_space_or_404(space_id, current_user, db)

    refinement = data.get("refinement", "").strip()
    if not refinement:
        raise HTTPException(status_code=400, detail="Refinement instructions are required")

    from app.models.space_artifact import SpaceArtifact
    import uuid

    # Find the artifact (could be original or a version)
    source_row = db.query(SpaceArtifact).filter(
        SpaceArtifact.id == artifact_id,
        SpaceArtifact.space_id == space_id,
    ).first()
    if not source_row:
        raise HTTPException(status_code=404, detail="Artifact not found")
    if not source_row.content:
        raise HTTPException(status_code=400, detail="Artifact has no content to refine")

    # Determine the original artifact ID
    original_id = source_row.parent_id or source_row.id

    # Get current max version
    max_version = (
        db.query(func.max(SpaceArtifact.version))
        .filter(
            (SpaceArtifact.id == original_id) | (SpaceArtifact.parent_id == original_id)
        )
        .scalar() or 1
    )

    # Create new version row
    new_row = SpaceArtifact(
        id=uuid.uuid4(),
        space_id=space.id,
        synthesis_id=source_row.synthesis_id,
        created_by_id=current_user.id,
        artifact_type=source_row.artifact_type,
        title=source_row.title,
        user_context=source_row.user_context,
        parent_id=original_id,
        version=max_version + 1,
        refinement=refinement,
        status="generating",
    )
    db.add(new_row)
    db.commit()

    purpose = _get_space_purpose(space)
    background_tasks.add_task(
        run_refine_artifact_task,
        space_id=space.id,
        new_artifact_id=new_row.id,
        artifact_type=source_row.artifact_type,
        previous_content=source_row.content,
        refinement=refinement,
        purpose=purpose,
        space_title=space.title,
        space_description=space.description,
        db_url=str(settings.DATABASE_URL),
    )

    return {
        "id": str(new_row.id),
        "version": new_row.version,
        "status": "generating",
        "message": "Refining artifact...",
    }


@router.get("/{space_id}/artifact-types")
def get_artifact_types(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get available artifact types."""
    _require_spaces_flag(current_user, db)
    _get_space_or_404(space_id, current_user, db)

    from app.services.space_service import SpaceService
    return {
        "types": [
            {"key": k, "label": v["label"], "description": v["description"]}
            for k, v in SpaceService.ARTIFACT_TYPES.items()
        ]
    }



@router.get("/{space_id}/graph", response_model=GraphData)
def get_graph_data(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get network graph data for a space. Supports shared viewing."""
    _get_space_with_sharing(space_id, current_user, db, require_live=True)

    from app.services.space_service import SpaceService
    service = SpaceService()
    return service.get_graph_data(db, space_id)


@router.get("/{space_id}/starter-prompts")
def get_starter_prompts(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate contextual starter prompts for an empty space."""
    space = _get_space_or_404(space_id, current_user, db)

    # Skip LLM call if the space already has ideas
    idea_count = db.query(func.count(Idea.id)).filter(
        Idea.space_id == space_id, Idea.status == "active"
    ).scalar() or 0
    if idea_count > 0:
        return {"prompts": None}

    from app.services.space_service import SpaceService
    purpose = _get_space_purpose(space)
    prompts = SpaceService.generate_starter_prompts(
        title=space.title,
        description=space.description,
        purpose=purpose,
    )
    return {"prompts": prompts}


@router.post("/{space_id}/actions/interpret-outcome-image", response_model=ActionOutcomeImageResponse)
def interpret_action_outcome_image(
    space_id: UUID,
    data: ActionOutcomeImageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Use Claude vision to interpret an action outcome from an uploaded image."""
    _require_spaces_flag(current_user, db)
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    from app.services.image_idea_service import ImageIdeaService
    from app.services.platform_settings_service import get_llm_model

    service = ImageIdeaService(model=get_llm_model(db))
    result = service.interpret_action_outcome(
        image_url=data.image_url,
        action_text=data.action_text,
        space_title=space.title,
        user_description=data.description,
    )
    return result


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

    synthesis_row = _get_current_synthesis(db, space.id)
    if not synthesis_row:
        raise HTTPException(status_code=400, detail="No synthesis data exists")

    theme_notes = synthesis_row.theme_notes or {}
    if data.theme_id not in theme_notes:
        raise HTTPException(status_code=404, detail="Theme not found in synthesis")

    notes_list = theme_notes[data.theme_id]
    if data.note_index >= len(notes_list):
        raise HTTPException(status_code=404, detail="Note index out of range")

    note_key = f"{data.theme_id}:{data.note_index}"
    note_states = dict(synthesis_row.note_states or {})
    dismiss_reasons = dict(synthesis_row.dismiss_reasons or {})
    completion_outcomes = dict(synthesis_row.completion_outcomes or {})
    completion_outcome_images = dict(synthesis_row.completion_outcome_images or {})

    if data.state is None:
        note_states.pop(note_key, None)
        dismiss_reasons.pop(note_key, None)
        completion_outcomes.pop(note_key, None)
        completion_outcome_images.pop(note_key, None)
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
        if data.state == "completed" and data.outcome_image_url:
            completion_outcome_images[note_key] = data.outcome_image_url
        elif data.state != "completed":
            completion_outcome_images.pop(note_key, None)

    synthesis_row.note_states = note_states
    synthesis_row.dismiss_reasons = dismiss_reasons
    synthesis_row.completion_outcomes = completion_outcomes
    synthesis_row.completion_outcome_images = completion_outcome_images
    flag_modified(synthesis_row, "note_states")
    flag_modified(synthesis_row, "dismiss_reasons")
    flag_modified(synthesis_row, "completion_outcomes")
    flag_modified(synthesis_row, "completion_outcome_images")
    db.commit()

    # Log action state changes (not resets)
    if data.state in ("accepted", "completed", "dismissed"):
        note_text = notes_list[data.note_index] if data.note_index < len(notes_list) else ""
        log_space_activity(
            db, space_id, current_user.id, current_user.full_name,
            f"action_{data.state}", detail=str(note_text)[:80],
        )
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

    # Return same dict shape for API compatibility
    return {
        "space_summary": synthesis_row.space_summary,
        "theme_notes": synthesis_row.theme_notes or {},
        "note_states": note_states,
        "dismiss_reasons": dismiss_reasons,
        "completion_outcomes": completion_outcomes,
        "completion_outcome_images": completion_outcome_images,
        "generated_at": synthesis_row.generated_at.isoformat() if synthesis_row.generated_at else None,
    }


@router.get("/{space_id}/synthesis-for-run")
def get_synthesis_for_run(
    space_id: UUID,
    run_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the synthesis_id associated with a given organize run."""
    from app.models.theme_event import ThemeEvent

    _get_space_with_sharing(space_id, current_user, db, require_live=True)

    # Get the run's timestamp from its events
    event = db.query(ThemeEvent).filter(
        ThemeEvent.space_id == space_id,
        ThemeEvent.organize_run_id == run_id,
    ).first()
    if not event:
        raise HTTPException(status_code=404, detail="Run not found")

    run_time = event.created_at

    # Find the synthesis generated closest to (and after) this run
    synthesis = (
        db.query(SpaceSynthesis)
        .filter(
            SpaceSynthesis.space_id == space_id,
            SpaceSynthesis.generated_at >= run_time,
        )
        .order_by(SpaceSynthesis.generated_at.asc())
        .first()
    )

    # If no synthesis after the run, get the most recent one before it
    if not synthesis:
        synthesis = (
            db.query(SpaceSynthesis)
            .filter(SpaceSynthesis.space_id == space_id)
            .order_by(SpaceSynthesis.generated_at.desc())
            .first()
        )

    return {
        "synthesis_id": str(synthesis.id) if synthesis else None,
        "run_id": run_id,
    }


@router.get("/{space_id}/evolution", response_model=list[OrganizeRunResponse])
def get_evolution(
    space_id: UUID,
    since: Optional[datetime] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get theme evolution timeline grouped by organize runs. Supports shared viewing."""
    from app.models.theme_event import ThemeEvent
    from collections import defaultdict

    _get_space_with_sharing(space_id, current_user, db, require_live=True)

    events_query = (
        db.query(ThemeEvent)
        .filter(ThemeEvent.space_id == space_id)
    )
    if since is not None:
        events_query = events_query.filter(ThemeEvent.created_at >= since)
    events = events_query.order_by(ThemeEvent.created_at.desc()).all()

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


# --- Activity Log ---

@router.get("/{space_id}/activity", response_model=SpaceActivityLogPage)
def get_space_activity(
    space_id: UUID,
    since: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get paginated activity log for a space. Any member can read."""
    _get_space_or_404(space_id, current_user, db)

    base_filter = [SpaceActivityLog.space_id == space_id]
    if since is not None:
        base_filter.append(SpaceActivityLog.created_at >= since)

    total = (
        db.query(func.count(SpaceActivityLog.id))
        .filter(*base_filter)
        .scalar() or 0
    )
    rows = (
        db.query(SpaceActivityLog)
        .filter(*base_filter)
        .order_by(SpaceActivityLog.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return {
        "items": [SpaceActivityLogEntry.model_validate(r) for r in rows],
        "total": total,
        "has_more": (skip + limit) < total,
    }


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
    if new_role not in ("editor", "suggester", "viewer"):
        raise HTTPException(status_code=400, detail="role must be 'editor', 'suggester', or 'viewer'")

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

    # Check max_collaborators_per_space limit
    from app.services.feature_flag_service import feature_flag_service
    from app.services.subscription_service import subscription_service

    owner_tier = subscription_service.get_tier(db, user_id=space.owner_id)
    max_collaborators = feature_flag_service.get_config_value(
        db, "spaces", "max_collaborators_per_space",
        tier=owner_tier,
        user_id=space.owner_id,
    )
    if max_collaborators is not None and max_collaborators != -1:
        current_members = db.query(func.count(SpaceMember.id)).filter(
            SpaceMember.space_id == space_id,
            SpaceMember.role != "owner",
        ).scalar() or 0
        pending_invitations = db.query(func.count(SpaceInvitation.id)).filter(
            SpaceInvitation.space_id == space_id,
            SpaceInvitation.is_accepted == False,
        ).scalar() or 0
        current_count = current_members + pending_invitations
        new_emails = [e.strip().lower() for e in data.emails if e.strip()]
        if current_count + len(new_emails) > max_collaborators:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Collaborator limit reached ({max_collaborators}) for your plan. You currently have {current_count} collaborator(s) and pending invite(s).",
            )

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
                    workspace_id=space.workspace_id,
                    organization_id=space.organization_id,
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

    # Re-check collaborator limit (owner may have downgraded since invite was sent)
    from app.services.feature_flag_service import feature_flag_service
    from app.services.subscription_service import subscription_service

    space = db.query(Space).filter(Space.id == invitation.space_id).first()
    if space:
        owner_tier = subscription_service.get_tier(db, user_id=space.owner_id)
        max_collaborators = feature_flag_service.get_config_value(
            db, "spaces", "max_collaborators_per_space",
            tier=owner_tier,
            user_id=space.owner_id,
        )
        if max_collaborators is not None and max_collaborators != -1:
            current_members = db.query(func.count(SpaceMember.id)).filter(
                SpaceMember.space_id == invitation.space_id,
                SpaceMember.role != "owner",
            ).scalar() or 0
            if current_members >= max_collaborators:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="This space has reached its collaborator limit. The space owner may need to upgrade their plan.",
                )

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

    log_space_activity(db, invitation.space_id, current_user.id, current_user.full_name, "member_joined")
    db.commit()

    return {"space_id": str(invitation.space_id)}


# --- Sharing ---

@router.patch("/{space_id}/sharing")
def update_space_sharing(
    space_id: UUID,
    data: SpaceShareUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update sharing settings for a space. Owner only."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)
    space.share_access = data.share_access
    db.commit()
    db.refresh(space)
    return _build_space_response(space, db, current_user)


# --- Snapshots ---

@router.post("/{space_id}/snapshots", response_model=SpaceSnapshotResponse, status_code=status.HTTP_201_CREATED)
def create_space_snapshot(
    space_id: UUID,
    data: SpaceSnapshotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a point-in-time snapshot of the space. Editor+ only."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)

    snapshot_data = _build_snapshot_data(db, space)

    snapshot = SpaceSnapshot(
        space_id=space_id,
        created_by_id=current_user.id,
        title=data.title,
        snapshot_type="manual",
        snapshot_data=snapshot_data,
    )
    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)

    log_space_activity(db, space_id, current_user.id, current_user.full_name, "snapshot_created", data.title)
    db.commit()

    return snapshot


@router.get("/{space_id}/snapshots", response_model=list[SpaceSnapshotResponse])
def list_space_snapshots(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List snapshots for a space. Members + shared viewers."""
    _get_space_with_sharing(space_id, current_user, db)
    snapshots = (
        db.query(SpaceSnapshot)
        .filter(SpaceSnapshot.space_id == space_id)
        .order_by(SpaceSnapshot.created_at.desc())
        .all()
    )
    return snapshots


@router.get("/{space_id}/snapshots/{snapshot_id}", response_model=SpaceSnapshotDetailResponse)
def get_space_snapshot(
    space_id: UUID,
    snapshot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a snapshot with full data. Members + shared viewers."""
    _get_space_with_sharing(space_id, current_user, db)
    snapshot = db.query(SpaceSnapshot).filter(
        SpaceSnapshot.id == snapshot_id,
        SpaceSnapshot.space_id == space_id,
    ).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    return snapshot


@router.patch("/{space_id}/snapshots/{snapshot_id}", response_model=SpaceSnapshotResponse)
def update_space_snapshot(
    space_id: UUID,
    snapshot_id: UUID,
    data: SpaceSnapshotCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Rename a snapshot. Editor+ only."""
    _get_space_or_404(space_id, current_user, db)
    _require_space_editor(space_id, current_user, db)
    snapshot = db.query(SpaceSnapshot).filter(
        SpaceSnapshot.id == snapshot_id,
        SpaceSnapshot.space_id == space_id,
    ).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    snapshot.title = data.title
    db.commit()
    db.refresh(snapshot)
    return snapshot


@router.delete("/{space_id}/snapshots/{snapshot_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_space_snapshot(
    space_id: UUID,
    snapshot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a snapshot. Owner only."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)
    snapshot = db.query(SpaceSnapshot).filter(
        SpaceSnapshot.id == snapshot_id,
        SpaceSnapshot.space_id == space_id,
    ).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    db.delete(snapshot)
    db.commit()


# --- Shared Viewers ---

@router.post("/{space_id}/shared-viewers", response_model=SpaceSharedViewerResponse, status_code=status.HTTP_201_CREATED)
async def add_shared_viewer(
    space_id: UUID,
    data: SpaceSharedViewerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a shared viewer to a space. Owner only. Sends notification email."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)

    # Check if already shared
    existing = db.query(SpaceSharedViewer).filter(
        SpaceSharedViewer.space_id == space_id,
        SpaceSharedViewer.email == data.email,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This email already has access to this space",
        )

    # Check if the email belongs to an existing user
    shared_user = db.query(User).filter(
        func.lower(User.email) == data.email,
    ).first()

    viewer = SpaceSharedViewer(
        space_id=space_id,
        email=data.email,
        shared_by_id=current_user.id,
        shared_user_id=shared_user.id if shared_user else None,
        access_level=data.access_level,
        can_export=data.can_export,
    )
    db.add(viewer)
    db.commit()
    db.refresh(viewer)

    # Send notification email
    try:
        from app.services.email_service import email_service
        space_url = f"{settings.FRONTEND_URL}/spaces/{space_id}"
        await email_service.send_space_shared_email(
            to_email=data.email,
            space_title=space.title,
            access_level=data.access_level,
            inviter_name=current_user.full_name,
            space_url=space_url,
            has_snapshots=db.query(SpaceSnapshot).filter(SpaceSnapshot.space_id == space_id).first() is not None,
        )
    except Exception as e:
        logger.error(f"Failed to send space shared email to {data.email}: {e}")

    return {
        "id": viewer.id,
        "space_id": viewer.space_id,
        "email": viewer.email,
        "access_level": viewer.access_level,
        "can_export": viewer.can_export,
        "shared_user_name": shared_user.full_name if shared_user else None,
        "created_at": viewer.created_at,
    }


@router.get("/{space_id}/shared-viewers", response_model=list[SpaceSharedViewerResponse])
def list_shared_viewers(
    space_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List shared viewers for a space. Owner only."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)

    rows = (
        db.query(SpaceSharedViewer, User)
        .outerjoin(User, SpaceSharedViewer.shared_user_id == User.id)
        .filter(SpaceSharedViewer.space_id == space_id)
        .order_by(SpaceSharedViewer.created_at.desc())
        .all()
    )
    return [
        {
            "id": sv.id,
            "space_id": sv.space_id,
            "email": sv.email,
            "access_level": sv.access_level,
            "can_export": sv.can_export,
            "shared_user_name": u.full_name if u else None,
            "created_at": sv.created_at,
        }
        for sv, u in rows
    ]


@router.patch("/{space_id}/shared-viewers/{viewer_id}", response_model=SpaceSharedViewerResponse)
def update_shared_viewer(
    space_id: UUID,
    viewer_id: UUID,
    data: SpaceSharedViewerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a shared viewer's access level or export permission. Owner only."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)

    viewer = db.query(SpaceSharedViewer).filter(
        SpaceSharedViewer.id == viewer_id,
        SpaceSharedViewer.space_id == space_id,
    ).first()
    if not viewer:
        raise HTTPException(status_code=404, detail="Shared viewer not found")

    if data.access_level is not None:
        viewer.access_level = data.access_level
    if data.can_export is not None:
        viewer.can_export = data.can_export

    db.commit()
    db.refresh(viewer)

    shared_user = None
    if viewer.shared_user_id:
        shared_user = db.query(User).filter(User.id == viewer.shared_user_id).first()

    return {
        "id": viewer.id,
        "space_id": viewer.space_id,
        "email": viewer.email,
        "access_level": viewer.access_level,
        "can_export": viewer.can_export,
        "shared_user_name": shared_user.full_name if shared_user else None,
        "created_at": viewer.created_at,
    }


@router.delete("/{space_id}/shared-viewers/{viewer_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_shared_viewer(
    space_id: UUID,
    viewer_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a shared viewer from a space. Owner only."""
    space = _get_space_or_404(space_id, current_user, db)
    _require_space_owner(space, current_user)

    viewer = db.query(SpaceSharedViewer).filter(
        SpaceSharedViewer.id == viewer_id,
        SpaceSharedViewer.space_id == space_id,
    ).first()
    if not viewer:
        raise HTTPException(status_code=404, detail="Shared viewer not found")

    db.delete(viewer)
    db.commit()
