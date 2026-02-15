"""Usage tracking service for feature limits."""

from datetime import datetime
from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.feature_flag import FeatureUsage


class UsageService:
    """Service for tracking feature usage and enforcing limits."""

    def get_current_period(self) -> str:
        """
        Get current period string.

        Returns:
            Current month in 'YYYY-MM' format
        """
        return datetime.utcnow().strftime('%Y-%m')

    def get_usage(
        self,
        db: Session,
        feature_slug: str,
        user_id: Optional[UUID] = None,
        org_id: Optional[UUID] = None,
        period: Optional[str] = None
    ) -> int:
        """
        Get current usage count for a feature.

        Args:
            db: Database session
            feature_slug: Feature flag slug
            user_id: User ID (for personal usage)
            org_id: Organization ID (for org-level shared usage)
            period: Period string ('YYYY-MM'), defaults to current month

        Returns:
            Current usage count (0 if no record exists)

        Note:
            If org_id is provided, returns org's shared usage pool.
            If only user_id is provided, returns user's personal usage.
        """
        if period is None:
            period = self.get_current_period()

        if org_id:
            # Org-level shared usage
            usage = db.query(FeatureUsage).filter(
                FeatureUsage.feature_slug == feature_slug,
                FeatureUsage.organization_id == org_id,
                FeatureUsage.period == period
            ).first()
        elif user_id:
            # Personal usage
            usage = db.query(FeatureUsage).filter(
                FeatureUsage.feature_slug == feature_slug,
                FeatureUsage.user_id == user_id,
                FeatureUsage.period == period
            ).first()
        else:
            return 0

        return usage.usage_count if usage else 0

    def increment_usage(
        self,
        db: Session,
        feature_slug: str,
        user_id: Optional[UUID] = None,
        org_id: Optional[UUID] = None,
        amount: int = 1
    ) -> int:
        """
        Increment usage count for a feature.

        Args:
            db: Database session
            feature_slug: Feature flag slug
            user_id: User ID (for personal usage)
            org_id: Organization ID (for org-level shared usage)
            amount: Amount to increment (default 1)

        Returns:
            New usage count after increment

        Note:
            If org_id is provided, increments org's shared usage pool.
            If only user_id is provided, increments user's personal usage.
        """
        period = self.get_current_period()

        if org_id:
            # Org-level shared usage
            usage = db.query(FeatureUsage).filter(
                FeatureUsage.feature_slug == feature_slug,
                FeatureUsage.organization_id == org_id,
                FeatureUsage.period == period
            ).first()

            if usage:
                usage.usage_count += amount
            else:
                usage = FeatureUsage(
                    feature_slug=feature_slug,
                    organization_id=org_id,
                    period=period,
                    usage_count=amount
                )
                db.add(usage)
        elif user_id:
            # Personal usage
            usage = db.query(FeatureUsage).filter(
                FeatureUsage.feature_slug == feature_slug,
                FeatureUsage.user_id == user_id,
                FeatureUsage.period == period
            ).first()

            if usage:
                usage.usage_count += amount
            else:
                usage = FeatureUsage(
                    feature_slug=feature_slug,
                    user_id=user_id,
                    period=period,
                    usage_count=amount
                )
                db.add(usage)
        else:
            return 0

        db.commit()
        db.refresh(usage)
        return usage.usage_count

    def check_limit(
        self,
        db: Session,
        feature_slug: str,
        limit: Optional[int],
        user_id: Optional[UUID] = None,
        org_id: Optional[UUID] = None
    ) -> Tuple[bool, int]:
        """
        Check if usage is under the limit.

        Args:
            db: Database session
            feature_slug: Feature flag slug
            limit: Usage limit (None = unlimited)
            user_id: User ID
            org_id: Organization ID

        Returns:
            Tuple of (is_allowed, current_usage)
            is_allowed is True if usage is under limit or limit is None
        """
        if limit is None:
            # No limit = always allowed
            return True, self.get_usage(db, feature_slug, user_id, org_id)

        current = self.get_usage(db, feature_slug, user_id, org_id)
        return current < limit, current

    def reset_usage(
        self,
        db: Session,
        feature_slug: str,
        user_id: Optional[UUID] = None,
        org_id: Optional[UUID] = None,
        period: Optional[str] = None
    ) -> bool:
        """
        Reset usage count to zero.

        Args:
            db: Database session
            feature_slug: Feature flag slug
            user_id: User ID
            org_id: Organization ID
            period: Period to reset (defaults to current)

        Returns:
            True if usage record was found and reset, False otherwise
        """
        if period is None:
            period = self.get_current_period()

        if org_id:
            usage = db.query(FeatureUsage).filter(
                FeatureUsage.feature_slug == feature_slug,
                FeatureUsage.organization_id == org_id,
                FeatureUsage.period == period
            ).first()
        elif user_id:
            usage = db.query(FeatureUsage).filter(
                FeatureUsage.feature_slug == feature_slug,
                FeatureUsage.user_id == user_id,
                FeatureUsage.period == period
            ).first()
        else:
            return False

        if usage:
            usage.usage_count = 0
            db.commit()
            return True

        return False


# Singleton instance
usage_service = UsageService()
