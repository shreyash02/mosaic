"""Journal template model for reusable journal configurations."""

from datetime import datetime
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

from app.core.database import Base


class JournalTemplate(Base):
    """Reusable journal template managed by admins.

    Templates define a set of prompts and default settings that users
    can select when creating a new journal. Stored as database records
    so admins can manage them without code deploys.
    """

    __tablename__ = "journal_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(200), nullable=False)
    emoji = Column(String(10), nullable=False)
    description = Column(Text, nullable=True)

    # Prompt definitions stored as JSONB array:
    # [{ "text": str, "type": "text"|"rating"|"single_choice", "choices": [...] }]
    prompts = Column(JSONB, nullable=False)

    # Default settings when user creates a journal from this template
    entry_frequency = Column(String(50), nullable=True)  # daily, weekly, biweekly, monthly, None=unlimited
    analysis_interval = Column(String(50), nullable=False, default="weekly")
    strict_frequency = Column(Boolean, default=False, nullable=False)

    # Display
    display_order = Column(Integer, nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<JournalTemplate(id={self.id}, title='{self.title}')>"
