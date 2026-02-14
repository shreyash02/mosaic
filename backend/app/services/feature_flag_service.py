"""Feature flag service with hierarchical override resolution."""

import copy
from datetime import datetime
from typing import Optional, Dict, Any, List
from uuid import UUID
import threading

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.feature_flag import FeatureFlag, FeatureFlagOverride, generate_slug
from app.schemas.feature_flag import EffectiveFeatureFlag


class FeatureFlagService:
    """Service for feature flag management and resolution."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        """Singleton pattern for shared cache state."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._cache: Dict[str, EffectiveFeatureFlag] = {}
                    cls._instance._cache_ttl = 60  # seconds
                    cls._instance._cache_timestamps: Dict[str, datetime] = {}
        return cls._instance

    def _deep_merge(self, base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """
        Deep merge two dictionaries. Override values take precedence.

        Args:
            base: Base dictionary
            override: Override dictionary (values take precedence)

        Returns:
            Merged dictionary
        """
        result = copy.deepcopy(base)

        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                # Recursively merge nested dicts
                result[key] = self._deep_merge(result[key], value)
            else:
                # Override the value
                result[key] = copy.deepcopy(value)

        return result

    def _get_cache_key(self, flag_slug: str, org_id: Optional[UUID], user_id: Optional[UUID]) -> str:
        """Generate cache key for a flag resolution context."""
        return f"{flag_slug}:{org_id or 'none'}:{user_id or 'none'}"

    def _is_cache_valid(self, cache_key: str) -> bool:
        """Check if cached value is still valid."""
        if cache_key not in self._cache_timestamps:
            return False
        age = (datetime.utcnow() - self._cache_timestamps[cache_key]).total_seconds()
        return age < self._cache_ttl

    def invalidate_cache(self, flag_slug: Optional[str] = None) -> None:
        """
        Invalidate cache entries.

        Args:
            flag_slug: If provided, only invalidate entries for this flag.
                      If None, invalidate all entries.
        """
        if flag_slug:
            keys_to_remove = [k for k in self._cache if k.startswith(f"{flag_slug}:")]
            for key in keys_to_remove:
                self._cache.pop(key, None)
                self._cache_timestamps.pop(key, None)
        else:
            self._cache.clear()
            self._cache_timestamps.clear()

    def get_flag(
        self,
        db: Session,
        flag_slug: str,
        org_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None
    ) -> EffectiveFeatureFlag:
        """
        Get the effective value of a feature flag with hierarchical override resolution.

        Resolution order:
        - Personal context (no org): global -> user_override
        - Organization context: global -> org_override -> user_within_org_override

        Args:
            db: Database session
            flag_slug: Slug of the feature flag
            org_id: Optional organization ID for org-level override
            user_id: Optional user ID for user-level override

        Returns:
            EffectiveFeatureFlag with resolved enabled state and merged config

        Raises:
            HTTPException: If flag not found
        """
        # Check cache
        cache_key = self._get_cache_key(flag_slug, org_id, user_id)
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        # Get global flag definition
        flag = db.query(FeatureFlag).filter(FeatureFlag.slug == flag_slug).first()
        if not flag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Feature flag '{flag_slug}' not found"
            )

        # Start with global defaults
        effective_enabled = flag.enabled
        effective_config = copy.deepcopy(flag.config or {})
        resolution_chain = ["global"]

        if org_id:
            # Organization context: global -> org -> user_in_org

            # Apply organization override
            org_override = db.query(FeatureFlagOverride).filter(
                FeatureFlagOverride.flag_id == flag.id,
                FeatureFlagOverride.organization_id == org_id,
                FeatureFlagOverride.user_id.is_(None)  # Org-only override
            ).first()

            if org_override:
                if org_override.enabled is not None:
                    effective_enabled = org_override.enabled
                if org_override.config_override:
                    effective_config = self._deep_merge(effective_config, org_override.config_override)
                resolution_chain.append(f"org:{org_id}")

            # Apply user-in-org override
            if user_id:
                user_org_override = db.query(FeatureFlagOverride).filter(
                    FeatureFlagOverride.flag_id == flag.id,
                    FeatureFlagOverride.organization_id == org_id,
                    FeatureFlagOverride.user_id == user_id
                ).first()

                if user_org_override:
                    if user_org_override.enabled is not None:
                        effective_enabled = user_org_override.enabled
                    if user_org_override.config_override:
                        effective_config = self._deep_merge(effective_config, user_org_override.config_override)
                    resolution_chain.append(f"user:{user_id}@org:{org_id}")

        elif user_id:
            # Personal context (no org): global -> user
            user_override = db.query(FeatureFlagOverride).filter(
                FeatureFlagOverride.flag_id == flag.id,
                FeatureFlagOverride.user_id == user_id,
                FeatureFlagOverride.organization_id.is_(None)  # User-only override
            ).first()

            if user_override:
                if user_override.enabled is not None:
                    effective_enabled = user_override.enabled
                if user_override.config_override:
                    effective_config = self._deep_merge(effective_config, user_override.config_override)
                resolution_chain.append(f"user:{user_id}")

        result = EffectiveFeatureFlag(
            name=flag.name,
            slug=flag.slug,
            enabled=effective_enabled,
            config=effective_config,
            resolution_chain=resolution_chain
        )

        # Cache result
        self._cache[cache_key] = result
        self._cache_timestamps[cache_key] = datetime.utcnow()

        return result

    def is_enabled(
        self,
        db: Session,
        flag_slug: str,
        org_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None
    ) -> bool:
        """
        Quick check if a feature flag is enabled.

        Args:
            db: Database session
            flag_slug: Slug of the feature flag
            org_id: Optional organization ID
            user_id: Optional user ID

        Returns:
            True if flag is enabled, False otherwise (including if flag doesn't exist)
        """
        try:
            flag = self.get_flag(db, flag_slug, org_id, user_id)
            return flag.enabled
        except HTTPException:
            return False

    def get_config_value(
        self,
        db: Session,
        flag_slug: str,
        config_key: str,
        org_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        default: Any = None
    ) -> Any:
        """
        Get a specific config value from a feature flag.

        Args:
            db: Database session
            flag_slug: Slug of the feature flag
            config_key: Key within the config dict (supports dot notation for nested)
            org_id: Optional organization ID
            user_id: Optional user ID
            default: Default value if key not found

        Returns:
            Config value or default
        """
        try:
            flag = self.get_flag(db, flag_slug, org_id, user_id)

            # Support dot notation for nested keys
            keys = config_key.split('.')
            value = flag.config
            for key in keys:
                if isinstance(value, dict) and key in value:
                    value = value[key]
                else:
                    return default
            return value
        except HTTPException:
            return default

    def list_all_flags(self, db: Session) -> List[FeatureFlag]:
        """
        List all feature flags (admin).

        Args:
            db: Database session

        Returns:
            List of all feature flags
        """
        return db.query(FeatureFlag).order_by(FeatureFlag.name).all()

    def get_flag_by_slug(self, db: Session, slug: str) -> Optional[FeatureFlag]:
        """
        Get a feature flag by slug.

        Args:
            db: Database session
            slug: Flag slug

        Returns:
            FeatureFlag or None
        """
        return db.query(FeatureFlag).filter(FeatureFlag.slug == slug).first()

    def create_flag(
        self,
        db: Session,
        name: str,
        description: Optional[str] = None,
        enabled: bool = False,
        config: Optional[Dict[str, Any]] = None
    ) -> FeatureFlag:
        """
        Create a new feature flag.

        Args:
            db: Database session
            name: Human-readable flag name
            description: Optional description
            enabled: Default enabled state
            config: Default config dict

        Returns:
            Created feature flag
        """
        slug = generate_slug(name)

        # Check for duplicate slug
        existing = db.query(FeatureFlag).filter(FeatureFlag.slug == slug).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Feature flag with slug '{slug}' already exists"
            )

        flag = FeatureFlag(
            name=name.strip(),
            slug=slug,
            description=description,
            enabled=enabled,
            config=config or {}
        )
        db.add(flag)
        db.commit()
        db.refresh(flag)

        return flag

    def update_flag(
        self,
        db: Session,
        flag_slug: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        enabled: Optional[bool] = None,
        config: Optional[Dict[str, Any]] = None
    ) -> FeatureFlag:
        """
        Update a feature flag.

        Args:
            db: Database session
            flag_slug: Slug of flag to update
            name: New name (will regenerate slug)
            description: New description (if provided)
            enabled: New enabled state (if provided)
            config: New config (replaces entirely if provided)

        Returns:
            Updated feature flag
        """
        flag = db.query(FeatureFlag).filter(FeatureFlag.slug == flag_slug).first()
        if not flag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Feature flag '{flag_slug}' not found"
            )

        if name is not None:
            new_slug = generate_slug(name)
            # Check for duplicate slug if changing
            if new_slug != flag.slug:
                existing = db.query(FeatureFlag).filter(FeatureFlag.slug == new_slug).first()
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Feature flag with slug '{new_slug}' already exists"
                    )
                flag.slug = new_slug
            flag.name = name.strip()

        if description is not None:
            flag.description = description
        if enabled is not None:
            flag.enabled = enabled
        if config is not None:
            flag.config = config

        db.commit()
        db.refresh(flag)

        # Invalidate cache for this flag
        self.invalidate_cache(flag.slug)

        return flag

    def delete_flag(self, db: Session, flag_slug: str) -> None:
        """
        Delete a feature flag and all its overrides.

        Args:
            db: Database session
            flag_slug: Slug of flag to delete
        """
        flag = db.query(FeatureFlag).filter(FeatureFlag.slug == flag_slug).first()
        if not flag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Feature flag '{flag_slug}' not found"
            )

        db.delete(flag)
        db.commit()

        # Invalidate cache for this flag
        self.invalidate_cache(flag_slug)

    def list_overrides(self, db: Session, flag_slug: str) -> List[FeatureFlagOverride]:
        """
        List all overrides for a feature flag.

        Args:
            db: Database session
            flag_slug: Slug of the feature flag

        Returns:
            List of overrides
        """
        flag = db.query(FeatureFlag).filter(FeatureFlag.slug == flag_slug).first()
        if not flag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Feature flag '{flag_slug}' not found"
            )

        return db.query(FeatureFlagOverride).filter(
            FeatureFlagOverride.flag_id == flag.id
        ).all()

    def set_override(
        self,
        db: Session,
        flag_slug: str,
        org_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        enabled: Optional[bool] = None,
        config_override: Optional[Dict[str, Any]] = None
    ) -> FeatureFlagOverride:
        """
        Set or update an override for a feature flag.

        Args:
            db: Database session
            flag_slug: Slug of the feature flag
            org_id: Organization ID (for org-level or user-in-org override)
            user_id: User ID (for user-level or user-in-org override)
            enabled: Override enabled state (None = inherit)
            config_override: Partial config to merge with parent

        Returns:
            Created or updated override
        """
        if org_id is None and user_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Must provide at least organization_id or user_id"
            )

        # Get the flag
        flag = db.query(FeatureFlag).filter(FeatureFlag.slug == flag_slug).first()
        if not flag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Feature flag '{flag_slug}' not found"
            )

        # Find existing override with exact scope match
        query = db.query(FeatureFlagOverride).filter(
            FeatureFlagOverride.flag_id == flag.id
        )

        if org_id is not None:
            query = query.filter(FeatureFlagOverride.organization_id == org_id)
        else:
            query = query.filter(FeatureFlagOverride.organization_id.is_(None))

        if user_id is not None:
            query = query.filter(FeatureFlagOverride.user_id == user_id)
        else:
            query = query.filter(FeatureFlagOverride.user_id.is_(None))

        override = query.first()

        if override:
            # Update existing
            override.enabled = enabled
            override.config_override = config_override
        else:
            # Create new
            override = FeatureFlagOverride(
                flag_id=flag.id,
                organization_id=org_id,
                user_id=user_id,
                enabled=enabled,
                config_override=config_override
            )
            db.add(override)

        db.commit()
        db.refresh(override)

        # Invalidate cache
        self.invalidate_cache(flag_slug)

        return override

    def remove_override(
        self,
        db: Session,
        flag_slug: str,
        org_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None
    ) -> bool:
        """
        Remove an override for a feature flag.

        Args:
            db: Database session
            flag_slug: Slug of the feature flag
            org_id: Organization ID
            user_id: User ID

        Returns:
            True if override was removed, False if not found
        """
        flag = db.query(FeatureFlag).filter(FeatureFlag.slug == flag_slug).first()
        if not flag:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Feature flag '{flag_slug}' not found"
            )

        query = db.query(FeatureFlagOverride).filter(
            FeatureFlagOverride.flag_id == flag.id
        )

        if org_id is not None:
            query = query.filter(FeatureFlagOverride.organization_id == org_id)
        else:
            query = query.filter(FeatureFlagOverride.organization_id.is_(None))

        if user_id is not None:
            query = query.filter(FeatureFlagOverride.user_id == user_id)
        else:
            query = query.filter(FeatureFlagOverride.user_id.is_(None))

        override = query.first()
        if override:
            db.delete(override)
            db.commit()
            self.invalidate_cache(flag_slug)
            return True

        return False


# Singleton instance
feature_flag_service = FeatureFlagService()
