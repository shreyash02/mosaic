"""Subscription service for tier management."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.subscription import Subscription


class SubscriptionService:
    """Service for subscription and tier management."""

    def get_tier(
        self,
        db: Session,
        user_id: Optional[UUID] = None,
        org_id: Optional[UUID] = None
    ) -> str:
        """
        Get effective tier for a context.

        Args:
            db: Database session
            user_id: User ID (for personal context)
            org_id: Organization ID (takes precedence over user_id if provided)

        Returns:
            Tier string ('free', 'basic', 'pro', 'enterprise')
            Defaults to 'free' if no subscription found
        """
        if org_id:
            # Org context: use org's subscription
            sub = db.query(Subscription).filter(
                Subscription.organization_id == org_id,
                Subscription.status == 'active'
            ).first()
        elif user_id:
            # Personal context: use user's subscription
            sub = db.query(Subscription).filter(
                Subscription.user_id == user_id,
                Subscription.status == 'active'
            ).first()
        else:
            return 'free'

        if not sub:
            return 'free'

        # Check if subscription has expired
        if sub.expires_at and sub.expires_at < datetime.utcnow():
            return 'free'

        return sub.tier

    def get_subscription(
        self,
        db: Session,
        user_id: Optional[UUID] = None,
        org_id: Optional[UUID] = None
    ) -> Optional[Subscription]:
        """
        Get subscription for a user or organization.

        Args:
            db: Database session
            user_id: User ID
            org_id: Organization ID

        Returns:
            Subscription or None
        """
        if org_id:
            return db.query(Subscription).filter(
                Subscription.organization_id == org_id
            ).first()
        elif user_id:
            return db.query(Subscription).filter(
                Subscription.user_id == user_id
            ).first()
        return None

    def set_tier(
        self,
        db: Session,
        tier: str,
        user_id: Optional[UUID] = None,
        org_id: Optional[UUID] = None,
        expires_at: Optional[datetime] = None
    ) -> Subscription:
        """
        Create or update subscription with a tier.

        Args:
            db: Database session
            tier: Tier to set ('free', 'basic', 'pro', 'enterprise')
            user_id: User ID (for personal subscription)
            org_id: Organization ID (for org subscription)
            expires_at: Optional expiration date

        Returns:
            Created or updated Subscription

        Raises:
            HTTPException: If neither user_id nor org_id provided
        """
        if user_id is None and org_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Either user_id or org_id must be provided"
            )

        if user_id is not None and org_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot set both user_id and org_id"
            )

        # Find existing subscription
        existing = self.get_subscription(db, user_id=user_id, org_id=org_id)

        if existing:
            # Update existing subscription
            existing.tier = tier
            existing.status = 'active'
            existing.expires_at = expires_at
            db.commit()
            db.refresh(existing)
            return existing
        else:
            # Create new subscription
            subscription = Subscription(
                user_id=user_id,
                organization_id=org_id,
                tier=tier,
                status='active',
                expires_at=expires_at
            )
            db.add(subscription)
            db.commit()
            db.refresh(subscription)
            return subscription

    def cancel_subscription(
        self,
        db: Session,
        user_id: Optional[UUID] = None,
        org_id: Optional[UUID] = None
    ) -> bool:
        """
        Cancel a subscription.

        Args:
            db: Database session
            user_id: User ID
            org_id: Organization ID

        Returns:
            True if subscription was cancelled, False if not found
        """
        subscription = self.get_subscription(db, user_id=user_id, org_id=org_id)

        if not subscription:
            return False

        subscription.status = 'cancelled'
        db.commit()
        return True


# Singleton instance
subscription_service = SubscriptionService()
