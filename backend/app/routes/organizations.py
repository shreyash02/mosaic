"""Organization routes."""

import secrets
from datetime import datetime
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.organization import Organization, OrganizationMember
from app.models.organization_invitation import OrganizationInvitation
from app.models.conversation import Conversation
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationUpdate,
    Organization as OrganizationSchema,
    OrganizationWithMembers,
    OrganizationMemberCreate,
    OrganizationMemberUpdate,
    OrganizationMember as OrganizationMemberSchema,
    InviteToOrganizationRequest,
    InviteToOrganizationResponse,
    OrganizationInvitation as OrganizationInvitationSchema,
    OrganizationInvitationListResponse,
)
from app.schemas.conversation import ConversationListItem, ConversationState
from app.schemas.common import SuccessResponse
from app.services.organization_service import (
    get_organization_or_404,
    require_organization_membership,
    require_organization_admin,
    require_organization_creator,
    check_organization_membership,
)
from app.services.email_service import email_service
from app.utils.email_preferences import should_send_email

router = APIRouter()


@router.post("", response_model=OrganizationWithMembers, status_code=status.HTTP_201_CREATED)
async def create_organization(
    org_data: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new organization.

    - Creator automatically becomes first admin member
    - Returns organization with member list
    """
    # Create organization
    organization = Organization(
        name=org_data.name,
        description=org_data.description,
        created_by=current_user.id
    )
    db.add(organization)
    db.flush()  # Flush to get organization.id

    # Create OrganizationMember entry for creator with admin role
    member = OrganizationMember(
        organization_id=organization.id,
        user_id=current_user.id,
        role="admin"
    )
    db.add(member)
    db.commit()

    # Eagerly load members with user data
    organization = db.query(Organization).options(
        joinedload(Organization.members).joinedload(OrganizationMember.user)
    ).filter(Organization.id == organization.id).first()

    return organization


@router.get("", response_model=List[OrganizationSchema])
async def list_organizations(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all organizations where user is a member.

    Returns organizations from organization_memberships relationship.
    """
    # Get organization IDs where user is a member
    member_orgs = db.query(OrganizationMember.organization_id).filter(
        OrganizationMember.user_id == current_user.id
    ).subquery()

    # Query organizations
    organizations = db.query(Organization).filter(
        Organization.id.in_(member_orgs)
    ).offset(skip).limit(limit).all()

    return organizations


@router.get("/{organization_id}", response_model=OrganizationWithMembers)
async def get_organization(
    organization_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get organization details with member list.

    - Check user is member of organization
    - Return full organization details including all members with user data
    """
    # Check if organization exists
    organization = get_organization_or_404(db, organization_id)

    # Check user is member
    require_organization_membership(db, organization_id, current_user)

    # Eagerly load members with user data
    organization = db.query(Organization).options(
        joinedload(Organization.members).joinedload(OrganizationMember.user)
    ).filter(Organization.id == organization_id).first()

    return organization


@router.patch("/{organization_id}", response_model=OrganizationSchema)
async def update_organization(
    organization_id: UUID,
    org_update: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update organization details (name, description).

    - Check user is admin or creator (can_manage_organization)
    - Update and return organization
    """
    # Get organization and check permissions
    organization = get_organization_or_404(db, organization_id)
    require_organization_admin(db, organization_id, current_user)

    # Update fields
    if org_update.name is not None:
        organization.name = org_update.name
    if org_update.description is not None:
        organization.description = org_update.description
    if org_update.brand_logo_url is not None:
        organization.brand_logo_url = org_update.brand_logo_url if org_update.brand_logo_url else None
    if org_update.brand_name is not None:
        organization.brand_name = org_update.brand_name if org_update.brand_name else None

    db.commit()
    db.refresh(organization)

    return organization


@router.delete("/{organization_id}", response_model=SuccessResponse)
async def delete_organization(
    organization_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete organization (creator only).

    - Check user is creator (can_delete_organization)
    - Cascade delete will remove members and set conversations.organization_id to NULL
    - Return success response
    """
    # Get organization and check permissions
    organization = get_organization_or_404(db, organization_id)
    require_organization_creator(db, organization_id, current_user)

    # Delete organization
    db.delete(organization)
    db.commit()

    return SuccessResponse(
        success=True,
        message=f"Organization '{organization.name}' deleted successfully"
    )


@router.post("/{organization_id}/members", response_model=OrganizationMemberSchema, status_code=status.HTTP_201_CREATED)
async def add_member(
    organization_id: UUID,
    member_data: OrganizationMemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a member to organization directly by user_id.

    - Check user is admin (can_manage_members)
    - Verify target user exists
    - Check if already a member (prevent duplicates)
    - Create OrganizationMember entry
    - Return created membership

    Note: This is for direct addition. Use /invitations for email invites.
    """
    # Get organization and check permissions
    organization = get_organization_or_404(db, organization_id)
    require_organization_admin(db, organization_id, current_user)

    # Verify target user exists
    target_user = db.query(User).filter(User.id == member_data.user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if already a member
    existing_member = check_organization_membership(db, organization_id, member_data.user_id)
    if existing_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this organization"
        )

    # Create membership
    member = OrganizationMember(
        organization_id=organization_id,
        user_id=member_data.user_id,
        role=member_data.role
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    return member


@router.delete("/{organization_id}/members/{user_id}", response_model=SuccessResponse)
async def remove_member(
    organization_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a member from organization.

    - Check user is admin (can_manage_members)
    - Cannot remove creator (last admin check)
    - Delete OrganizationMember entry
    - Return success response
    """
    # Get organization and check permissions
    organization = get_organization_or_404(db, organization_id)
    require_organization_admin(db, organization_id, current_user)

    # Check if target is the creator
    if organization.created_by == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the organization creator"
        )

    # Get member to remove
    member = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == organization_id,
        OrganizationMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found in this organization"
        )

    # Check if this would remove the last admin (besides creator)
    if member.role == "admin":
        admin_count = db.query(func.count(OrganizationMember.id)).filter(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.role == "admin"
        ).scalar()

        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot remove the last admin from the organization"
            )

    # Delete member
    db.delete(member)
    db.commit()

    return SuccessResponse(
        success=True,
        message="Member removed from organization successfully"
    )


@router.get("/{organization_id}/conversations", response_model=List[ConversationListItem])
async def list_org_conversations(
    organization_id: UUID,
    skip: int = 0,
    limit: int = 100,
    state: Optional[ConversationState] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all conversations in organization.

    - Check user is member (can_view_org_conversations)
    - Filter conversations where organization_id matches
    - Apply state filter if provided
    - Return list with response counts
    """
    # Get organization and check permissions
    organization = get_organization_or_404(db, organization_id)
    require_organization_membership(db, organization_id, current_user)

    # Build query
    query = db.query(Conversation).filter(
        Conversation.organization_id == organization_id,
        Conversation.state != ConversationState.DELETED.value
    )

    # Apply state filter if provided
    if state:
        query = query.filter(Conversation.state == state.value)

    # Get conversations with pagination
    conversations = query.order_by(
        Conversation.created_at.desc()
    ).offset(skip).limit(limit).all()

    # Convert to ConversationListItem format
    result = []
    for conv in conversations:
        # Count responses
        from app.models.response import Response
        from app.schemas.conversation import AnonymityLevel
        response_count = db.query(func.count(Response.id)).filter(
            Response.conversation_id == conv.id
        ).scalar()

        # Calculate unique participants based on anonymity level
        if conv.anonymity_level == AnonymityLevel.FULLY_ANONYMOUS.value:
            unique_participants = db.query(
                func.count(func.distinct(Response.participant_code_used))
            ).filter(
                Response.conversation_id == conv.id,
                Response.participant_code_used.isnot(None)
            ).scalar() or 0
        else:
            unique_participants = db.query(
                func.count(func.distinct(Response.participant_id))
            ).filter(
                Response.conversation_id == conv.id,
                Response.participant_id.isnot(None)
            ).scalar() or 0

        result.append(ConversationListItem(
            id=conv.id,
            title=conv.title,
            state=ConversationState(conv.state),
            anonymity_level=conv.anonymity_level,
            access_code=conv.access_code,
            created_at=conv.created_at,
            activated_at=conv.activated_at,
            closed_at=conv.closed_at,
            response_count=response_count,
            unique_participants=unique_participants,
            timezone=conv.timezone,
            is_follow_up=conv.parent_conversation_id is not None,
            parent_conversation_id=str(conv.parent_conversation_id) if conv.parent_conversation_id else None,
            series_id=str(conv.series_id) if conv.series_id else None,
            is_recurring_instance=conv.is_recurring_instance,
            recurrence_pattern=conv.recurrence_pattern
        ))

    return result


@router.post("/{organization_id}/invitations", response_model=InviteToOrganizationResponse, status_code=status.HTTP_201_CREATED)
async def invite_to_organization(
    organization_id: UUID,
    invite_request: InviteToOrganizationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Invite users to organization via email.

    - Check user is admin
    - Create OrganizationInvitation with token
    - Send invitation emails asynchronously
    - Skip if already a member or already invited
    """
    # Permission check
    require_organization_admin(db, organization_id, current_user)
    organization = get_organization_or_404(db, organization_id)

    created_invitations = []

    for email in invite_request.emails:
        # Check if already a member
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            existing_member = check_organization_membership(db, organization_id, existing_user.id)
            if existing_member:
                continue  # Skip, already a member

        # Check if pending invitation exists
        existing_invitation = db.query(OrganizationInvitation).filter(
            OrganizationInvitation.organization_id == organization_id,
            OrganizationInvitation.email == email,
            OrganizationInvitation.is_accepted == False
        ).first()

        if existing_invitation:
            continue  # Skip, already invited

        # Generate secure token
        invitation_token = secrets.token_urlsafe(32)

        # Create invitation
        invitation = OrganizationInvitation(
            organization_id=organization_id,
            email=email,
            invited_by_id=current_user.id,
            invited_user_id=existing_user.id if existing_user else None,
            role=invite_request.role,
            invitation_token=invitation_token
        )
        db.add(invitation)
        created_invitations.append(invitation)

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to create organization invitations: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create invitations: {str(e)}"
        )

    # Refresh all invitations to get IDs and relationships
    for invitation in created_invitations:
        db.refresh(invitation)

    # Send emails asynchronously
    # Don't block the response if email sending fails
    import logging
    logger = logging.getLogger(__name__)
    for invitation in created_invitations:
        if should_send_email(db, invitation.email, "organization_invitations"):
            try:
                await email_service.send_organization_invitation_email(
                    to_email=invitation.email,
                    organization_name=organization.name,
                    organization_description=organization.description,
                    invitation_token=invitation.invitation_token,
                    inviter_name=current_user.full_name,
                    role=invitation.role
                )
            except Exception as e:
                # Log error but don't fail the request
                # Email sending failures shouldn't prevent invitation creation
                logger.error(f"Failed to send organization invitation email to {invitation.email}: {str(e)}", exc_info=True)
        else:
            logger.info(f"Skipping organization invitation email to {invitation.email} - user opted out")

    return InviteToOrganizationResponse(
        organization_id=organization_id,
        invitations_created=len(created_invitations),
        invitations=created_invitations
    )


@router.get("/{organization_id}/invitations", response_model=OrganizationInvitationListResponse)
async def list_org_invitations(
    organization_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all invitations for organization.

    Shows both pending and accepted invitations.
    Admin only.
    """
    # Permission check
    require_organization_admin(db, organization_id, current_user)

    # Get all invitations
    invitations = db.query(OrganizationInvitation).filter(
        OrganizationInvitation.organization_id == organization_id
    ).order_by(OrganizationInvitation.created_at.desc()).all()

    # Calculate stats
    total = len(invitations)
    accepted = sum(1 for inv in invitations if inv.is_accepted)
    pending = total - accepted

    return OrganizationInvitationListResponse(
        organization_id=organization_id,
        total_invitations=total,
        accepted_invitations=accepted,
        pending_invitations=pending,
        invitations=invitations
    )


@router.post("/accept-invite/{invitation_token}", response_model=OrganizationMemberSchema)
async def accept_organization_invitation(
    invitation_token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Accept organization invitation.

    - Find invitation by token
    - Verify not expired
    - Verify not already accepted
    - Verify current user's email matches invitation email
    - Create OrganizationMember record
    - Mark invitation as accepted
    """
    # Find invitation
    invitation = db.query(OrganizationInvitation).filter(
        OrganizationInvitation.invitation_token == invitation_token
    ).first()

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invitation not found or has expired"
        )

    # Check if already accepted
    if invitation.is_accepted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has already been accepted"
        )

    # Check expiration (if set)
    if invitation.expires_at and invitation.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation has expired"
        )

    # Verify email matches current user
    if invitation.email.lower() != current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This invitation was sent to a different email address"
        )

    # Check if already a member (edge case: invited, then added directly)
    existing_member = check_organization_membership(db, invitation.organization_id, current_user.id)
    if existing_member:
        # Mark invitation as accepted but don't create duplicate membership
        invitation.is_accepted = True
        invitation.accepted_at = datetime.utcnow()
        db.commit()
        return existing_member

    # Create membership
    member = OrganizationMember(
        organization_id=invitation.organization_id,
        user_id=current_user.id,
        role=invitation.role
    )
    db.add(member)

    # Mark invitation as accepted
    invitation.is_accepted = True
    invitation.accepted_at = datetime.utcnow()

    db.commit()
    db.refresh(member)

    return member


@router.patch("/{organization_id}/members/{user_id}", response_model=OrganizationMemberSchema)
async def update_member_role(
    organization_id: UUID,
    user_id: UUID,
    role_update: OrganizationMemberUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update member's role (promote to admin or demote to member).

    - Check user is admin
    - Cannot change creator's role
    - Update role
    """
    # Permission check
    require_organization_admin(db, organization_id, current_user)
    organization = get_organization_or_404(db, organization_id)

    # Cannot change creator's role
    if organization.created_by == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change the organization creator's role"
        )

    # Get member
    member = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == organization_id,
        OrganizationMember.user_id == user_id
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )

    # Update role
    member.role = role_update.role
    db.commit()
    db.refresh(member)

    return member
