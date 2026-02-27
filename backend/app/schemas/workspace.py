"""Workspace schemas."""

from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class WorkspaceResponse(BaseModel):
    id: UUID
    type: str  # "personal" or "organization"
    name: str
    description: Optional[str] = None
    organization_id: Optional[UUID] = None
    owner_id: UUID
    is_default: bool
    visibility: str  # 'open' | 'private'

    class Config:
        from_attributes = True


class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    organization_id: Optional[UUID] = None  # None = personal workspace
    visibility: str = "open"  # 'open' | 'private'


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    visibility: Optional[str] = None
