"""Platform settings model for runtime configuration."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID

from app.core.database import Base


class PlatformSettings(Base):
    """Key-value platform settings for runtime configuration."""

    __tablename__ = "platform_settings"

    key = Column(String(100), primary_key=True)
    value = Column(String(500), nullable=False)
    description = Column(String(500), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    updated_by_id = Column(UUID(as_uuid=True), ForeignKey("admins.id"), nullable=True)
