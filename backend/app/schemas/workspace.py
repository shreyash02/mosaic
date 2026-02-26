"""Workspace schemas."""

from typing import Optional
from uuid import UUID
from pydantic import BaseModel


class WorkspaceResponse(BaseModel):
    id: UUID
    type: str  # "personal" or "organization"
    name: str
    organization_id: Optional[UUID] = None
    is_default: bool

    class Config:
        from_attributes = True
