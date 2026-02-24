"""Pydantic schemas for Spaces, Ideas, Themes, Graph data, and Theme Evolution."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


# --- Space schemas ---

VALID_PURPOSES = ("explore", "organize", "connections", "insights", "actions")


class SpaceCreate(BaseModel):
    """Create a new space."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    purpose: Optional[str] = None

    @field_validator("purpose")
    @classmethod
    def validate_purpose(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_PURPOSES:
            raise ValueError(f"purpose must be one of: {', '.join(VALID_PURPOSES)}")
        return v


class SpaceUpdate(BaseModel):
    """Update space settings. All fields optional."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    auto_organize: Optional[bool] = None
    clustering_mode: Optional[str] = None
    purpose: Optional[str] = None

    @field_validator("clustering_mode")
    @classmethod
    def validate_clustering_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("dbscan", "llm"):
            raise ValueError("clustering_mode must be 'dbscan' or 'llm'")
        return v

    @field_validator("purpose")
    @classmethod
    def validate_purpose(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_PURPOSES:
            raise ValueError(f"purpose must be one of: {', '.join(VALID_PURPOSES)}")
        return v


class SynthesisActivityEntry(BaseModel):
    """A persisted completed/dismissed synthesis note."""
    theme_name: str
    note_text: str
    action: str  # 'completed' | 'dismissed'
    detail: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class SpaceMemberResponse(BaseModel):
    """A space member."""
    id: UUID
    space_id: UUID
    user_id: UUID
    role: str
    joined_at: datetime
    user_name: Optional[str] = None
    user_email: Optional[str] = None


class SpaceInviteRequest(BaseModel):
    """Invite users to a space by email."""
    emails: List[str] = Field(..., min_length=1, max_length=20)
    role: Optional[str] = "editor"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("editor", "viewer"):
            raise ValueError("role must be 'editor' or 'viewer'")
        return v


class SpaceInvitationResponse(BaseModel):
    """A pending or accepted space invitation."""
    id: UUID
    space_id: UUID
    email: str
    invited_by_id: Optional[UUID] = None
    is_accepted: bool = False
    created_at: datetime


class SpaceResponse(BaseModel):
    """Full space detail response."""
    id: UUID
    title: str
    description: Optional[str] = None
    purpose: str = "explore"
    purpose_synthesis: Optional[Dict[str, Any]] = None
    synthesis_activity_log: Optional[List[SynthesisActivityEntry]] = None
    idea_count: int = 0
    theme_count: int = 0
    auto_organize: bool = True
    clustering_mode: str = "llm"
    last_organized_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    owner_id: Optional[UUID] = None
    is_owner: bool = True
    can_edit: bool = True
    member_count: int = 1
    members: Optional[List[SpaceMemberResponse]] = None

    model_config = {"from_attributes": True}


class SpaceListItem(BaseModel):
    """Space summary for list views."""
    id: UUID
    title: str
    description: Optional[str] = None
    purpose: str = "explore"
    purpose_synthesis: Optional[Dict[str, Any]] = None
    synthesis_activity_log: Optional[List[SynthesisActivityEntry]] = None
    idea_count: int = 0
    theme_count: int = 0
    auto_organize: bool = True
    clustering_mode: str = "llm"
    created_at: datetime
    owner_id: Optional[UUID] = None
    is_owner: bool = True
    can_edit: bool = True
    member_count: int = 1

    model_config = {"from_attributes": True}


# --- Idea schemas ---

class IdeaCreate(BaseModel):
    """Drop a new idea — minimal friction."""
    text: str = Field(..., min_length=1, max_length=10000)


class IdeaUpdate(BaseModel):
    """Edit an idea's text."""
    text: str = Field(..., min_length=1, max_length=10000)


class IdeaThemeAssignment(BaseModel):
    """A theme assignment on an idea."""
    theme_id: UUID
    theme_name: str
    confidence: float
    assigned_by: str

    model_config = {"from_attributes": True}


class IdeaResponse(BaseModel):
    """An idea with its theme assignments."""
    id: UUID
    text: str
    status: str
    themes: List[IdeaThemeAssignment] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Theme schemas ---

class ThemeResponse(BaseModel):
    """A theme with its idea count."""
    id: UUID
    name: str
    summary: Optional[str] = None
    color: Optional[str] = None
    is_ai_generated: bool = True
    idea_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ThemeUpdate(BaseModel):
    """Update a theme (rename, recolor)."""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")


class ThemeMerge(BaseModel):
    """Merge one theme into another."""
    source_theme_id: UUID
    target_theme_id: UUID


# --- Graph schemas ---

class GraphNode(BaseModel):
    """A node in the network graph (represents a theme)."""
    id: str
    name: str
    size: int  # idea count
    color: str
    summary: Optional[str] = None


class GraphEdge(BaseModel):
    """An edge in the network graph (theme-to-theme connection)."""
    source: str
    target: str
    strength: float


class GraphData(BaseModel):
    """Complete network graph data."""
    nodes: List[GraphNode] = []
    edges: List[GraphEdge] = []
    unthemed_count: int = 0


# --- Theme Evolution schemas ---

class ThemeEventResponse(BaseModel):
    """A single theme lifecycle event."""
    id: UUID
    organize_run_id: UUID
    event_type: str  # 'created' | 'retired' | 'persisted'
    theme_name: str
    theme_color: Optional[str] = None
    details: Dict[str, Any] = {}
    created_at: datetime

    model_config = {"from_attributes": True}


class OrganizeRunResponse(BaseModel):
    """Events grouped by organize run."""
    run_id: UUID
    events: List[ThemeEventResponse]
    created_at: datetime


class SynthesisNoteStateUpdate(BaseModel):
    """Update the state of a single synthesis note."""
    theme_id: str
    note_index: int = Field(..., ge=0)
    state: Optional[str] = None
    reason: Optional[str] = Field(None, max_length=500)
    outcome: Optional[str] = Field(None, max_length=500)

    @field_validator("state")
    @classmethod
    def validate_state(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("accepted", "completed", "dismissed"):
            raise ValueError("state must be 'accepted', 'completed', 'dismissed', or null")
        return v
