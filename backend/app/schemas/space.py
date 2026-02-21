"""Pydantic schemas for Spaces, Ideas, Themes, Graph data, and Theme Evolution."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


# --- Space schemas ---

class SpaceCreate(BaseModel):
    """Create a new space."""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)


class SpaceUpdate(BaseModel):
    """Update space settings. All fields optional."""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    auto_organize: Optional[bool] = None
    clustering_mode: Optional[str] = None

    @field_validator("clustering_mode")
    @classmethod
    def validate_clustering_mode(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("dbscan", "llm"):
            raise ValueError("clustering_mode must be 'dbscan' or 'llm'")
        return v


class SpaceResponse(BaseModel):
    """Full space detail response."""
    id: UUID
    title: str
    description: Optional[str] = None
    idea_count: int = 0
    theme_count: int = 0
    auto_organize: bool = True
    clustering_mode: str = "dbscan"
    last_organized_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SpaceListItem(BaseModel):
    """Space summary for list views."""
    id: UUID
    title: str
    description: Optional[str] = None
    idea_count: int = 0
    theme_count: int = 0
    auto_organize: bool = True
    clustering_mode: str = "dbscan"
    created_at: datetime

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
