"""Organization service for permission checks and helper functions."""

from uuid import UUID
from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.organization import Organization, OrganizationMember
from app.models.user import User


def get_organization_or_404(db: Session, org_id: UUID) -> Organization:
    """
    Get organization by ID or raise 404.

    Args:
        db: Database session
        org_id: Organization ID

    Returns:
        Organization object

    Raises:
        HTTPException: If organization not found
    """
    organization = db.query(Organization).filter(Organization.id == org_id).first()
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )
    return organization


def check_organization_membership(
    db: Session,
    org_id: UUID,
    user_id: UUID
) -> Optional[OrganizationMember]:
    """
    Check if user is member of organization.

    Args:
        db: Database session
        org_id: Organization ID
        user_id: User ID

    Returns:
        OrganizationMember if user is member, None otherwise
    """
    return db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == org_id,
        OrganizationMember.user_id == user_id
    ).first()


def check_organization_admin(db: Session, org_id: UUID, user_id: UUID) -> bool:
    """
    Check if user is admin of organization.

    Args:
        db: Database session
        org_id: Organization ID
        user_id: User ID

    Returns:
        True if user is admin, False otherwise
    """
    membership = check_organization_membership(db, org_id, user_id)
    return membership is not None and membership.role == "admin"


def can_manage_organization(db: Session, org_id: UUID, user: User) -> bool:
    """
    Check if user can manage organization (creator OR admin).

    Args:
        db: Database session
        org_id: Organization ID
        user: User object

    Returns:
        True if user can manage organization, False otherwise
    """
    organization = get_organization_or_404(db, org_id)

    # Creator can always manage
    if organization.created_by == user.id:
        return True

    # Admins can manage
    return check_organization_admin(db, org_id, user.id)


def can_manage_members(db: Session, org_id: UUID, user: User) -> bool:
    """
    Check if user can add/remove members (admins only).

    Args:
        db: Database session
        org_id: Organization ID
        user: User object

    Returns:
        True if user can manage members, False otherwise
    """
    organization = get_organization_or_404(db, org_id)

    # Creator can always manage members
    if organization.created_by == user.id:
        return True

    # Admins can manage members
    return check_organization_admin(db, org_id, user.id)


def can_create_conversations(db: Session, org_id: UUID, user: User) -> bool:
    """
    Check if user can create conversations in org (all members for MVP).

    Args:
        db: Database session
        org_id: Organization ID
        user: User object

    Returns:
        True if user can create conversations, False otherwise
    """
    # All members can create conversations in MVP
    membership = check_organization_membership(db, org_id, user.id)
    return membership is not None


def can_view_org_conversations(db: Session, org_id: UUID, user: User) -> bool:
    """
    Check if user can view organization conversations (all members).

    Args:
        db: Database session
        org_id: Organization ID
        user: User object

    Returns:
        True if user can view conversations, False otherwise
    """
    # All members can view org conversations
    membership = check_organization_membership(db, org_id, user.id)
    return membership is not None


def can_delete_organization(db: Session, org_id: UUID, user: User) -> bool:
    """
    Check if user can delete organization (creator only).

    Args:
        db: Database session
        org_id: Organization ID
        user: User object

    Returns:
        True if user can delete organization, False otherwise
    """
    organization = get_organization_or_404(db, org_id)
    return organization.created_by == user.id


def require_organization_membership(db: Session, org_id: UUID, user: User) -> OrganizationMember:
    """
    Require user to be member of organization or raise 403.

    Args:
        db: Database session
        org_id: Organization ID
        user: User object

    Returns:
        OrganizationMember object

    Raises:
        HTTPException: If user is not a member
    """
    membership = check_organization_membership(db, org_id, user.id)
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization"
        )
    return membership


def require_organization_admin(db: Session, org_id: UUID, user: User) -> None:
    """
    Require user to be admin of organization or raise 403.

    Args:
        db: Database session
        org_id: Organization ID
        user: User object

    Raises:
        HTTPException: If user is not an admin
    """
    if not can_manage_members(db, org_id, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization admins can perform this action"
        )


def require_organization_creator(db: Session, org_id: UUID, user: User) -> None:
    """
    Require user to be creator of organization or raise 403.

    Args:
        db: Database session
        org_id: Organization ID
        user: User object

    Raises:
        HTTPException: If user is not the creator
    """
    if not can_delete_organization(db, org_id, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the organization creator can perform this action"
        )
