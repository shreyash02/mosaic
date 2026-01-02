"""Series schemas."""

from datetime import datetime
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, Field

from app.schemas.conversation import ConversationListItem


class SeriesBase(BaseModel):
    """Base series schema."""

    name: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None


class SeriesCreate(SeriesBase):
    """Schema for creating a series."""

    organization_id: Optional[UUID] = None


class SeriesUpdate(BaseModel):
    """Schema for updating a series."""

    name: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None


class Series(SeriesBase):
    """Series schema returned in responses."""

    id: UUID
    creator_id: UUID
    organization_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SeriesWithConversations(Series):
    """Series schema with conversation list."""

    conversations: List[ConversationListItem] = []

    model_config = {"from_attributes": True}

