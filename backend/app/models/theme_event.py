"""ThemeEvent model for tracking theme evolution across organize runs."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSON, UUID

from app.core.database import Base


class ThemeEvent(Base):
    """Records theme lifecycle events (created, retired, persisted) per organize run."""

    __tablename__ = "theme_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    space_id = Column(
        UUID(as_uuid=True),
        ForeignKey("spaces.id", ondelete="CASCADE"),
        nullable=False,
    )
    organize_run_id = Column(UUID(as_uuid=True), nullable=False)
    event_type = Column(String(20), nullable=False)  # 'created' | 'retired' | 'persisted'
    theme_id = Column(
        UUID(as_uuid=True),
        ForeignKey("themes.id", ondelete="SET NULL"),
        nullable=True,
    )
    theme_name = Column(String(200), nullable=False)
    theme_color = Column(String(7), nullable=True)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_theme_events_space_created", "space_id", "created_at"),
        Index("ix_theme_events_run", "organize_run_id"),
    )
