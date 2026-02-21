"""Platform settings service for runtime configuration."""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.platform_settings import PlatformSettings


def get_setting(db: Session, key: str, default: str = "") -> str:
    """Get a platform setting value by key."""
    setting = db.query(PlatformSettings).filter(PlatformSettings.key == key).first()
    if setting:
        return setting.value
    return default


def set_setting(db: Session, key: str, value: str, admin_id: Optional[UUID] = None, description: Optional[str] = None) -> PlatformSettings:
    """Set a platform setting value. Creates if it doesn't exist."""
    setting = db.query(PlatformSettings).filter(PlatformSettings.key == key).first()
    if setting:
        setting.value = value
        setting.updated_at = datetime.utcnow()
        setting.updated_by_id = admin_id
        if description is not None:
            setting.description = description
    else:
        setting = PlatformSettings(
            key=key,
            value=value,
            description=description,
            updated_at=datetime.utcnow(),
            updated_by_id=admin_id,
        )
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting


def get_llm_model(db: Session) -> str:
    """Get the configured LLM model name."""
    return get_setting(db, "llm_model", "claude-sonnet-4-5-20250929")


def is_maintenance_mode(db: Session) -> bool:
    """Check if the platform is in maintenance mode."""
    return get_setting(db, "maintenance_mode", "false").lower() == "true"


def is_invite_code_required(db: Session) -> bool:
    """Check if invite codes are required for registration."""
    return get_setting(db, "invite_code_required", "false").lower() == "true"


def is_spaces_enabled(db: Session) -> bool:
    """Check if the Spaces feature is enabled at the platform level."""
    return get_setting(db, "spaces_enabled", "true").lower() == "true"


def get_all_settings(db: Session) -> List[PlatformSettings]:
    """Get all platform settings."""
    return db.query(PlatformSettings).order_by(PlatformSettings.key).all()
