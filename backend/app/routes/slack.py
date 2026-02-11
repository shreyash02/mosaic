"""Slack integration routes."""

import base64
import json
import secrets
import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.core.encryption import encrypt_token
from app.models.user import User
from app.models.organization import Organization, OrganizationMember
from app.models.slack_workspace_connection import SlackWorkspaceConnection
from app.models.user_slack_connection import UserSlackConnection
from app.services.slack_service import slack_service
from app.schemas.slack import (
    SlackInstallInitiate,
    SlackWorkspaceStatus,
    UserSlackStatus,
    SlackCallbackResponse,
)

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_slack_redirect_uri() -> str:
    """Get the Slack OAuth redirect URI."""
    return f"{settings.BASE_URL.rstrip('/')}/api/slack/callback"


def _get_user_slack_redirect_uri() -> str:
    """Get the user Slack OAuth redirect URI."""
    return f"{settings.BASE_URL.rstrip('/')}/api/slack/user/callback"


def _verify_org_admin(
    organization_id: UUID,
    user: User,
    db: Session,
) -> Organization:
    """Verify user is an admin of the organization.

    Returns the organization if authorized, raises HTTPException otherwise.
    """
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Check if user is admin or creator
    member = db.query(OrganizationMember).filter(
        OrganizationMember.organization_id == organization_id,
        OrganizationMember.user_id == user.id,
    ).first()

    is_admin = member and member.role == "admin"
    is_creator = org.created_by == user.id

    if not is_admin and not is_creator:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization admins can manage Slack integration"
        )

    return org


@router.get("/organizations/{organization_id}/slack/install", response_model=SlackInstallInitiate)
async def initiate_slack_install(
    organization_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Initiate Slack OAuth flow for organization.

    Returns a redirect URL to start the Slack authorization process.
    """
    if not settings.slack_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Slack integration is not configured"
        )

    # Verify user is admin
    _verify_org_admin(organization_id, current_user, db)

    # Check if already connected
    existing = db.query(SlackWorkspaceConnection).filter(
        SlackWorkspaceConnection.organization_id == organization_id,
        SlackWorkspaceConnection.is_active == True,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Slack is already connected. Disconnect first to reconnect."
        )

    # Generate state with org and user info
    state_data = {
        "token": secrets.token_urlsafe(32),
        "org_id": str(organization_id),
        "user_id": str(current_user.id),
        "type": "org",
    }
    state = base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()

    redirect_url = slack_service.get_oauth_url(
        redirect_uri=_get_slack_redirect_uri(),
        state=state,
    )

    return SlackInstallInitiate(redirect_url=redirect_url)


@router.get("/slack/callback")
async def slack_oauth_callback(
    code: str = Query(None),
    state: str = Query(None),
    error: str = Query(None),
    db: Session = Depends(get_db),
):
    """
    Handle Slack OAuth callback for organization installation.

    Exchanges the authorization code for tokens and stores the connection.
    """
    frontend_url = settings.FRONTEND_URL

    if error:
        logger.error(f"Slack OAuth error: {error}")
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error=oauth_error"
        )

    if not code or not state:
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error=missing_params"
        )

    # Decode state
    try:
        state_data = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
    except Exception:
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error=invalid_state"
        )

    state_type = state_data.get("type")

    if state_type == "org":
        return await _handle_org_callback(code, state_data, db, frontend_url)
    elif state_type == "user":
        return await _handle_user_callback(code, state_data, db, frontend_url)
    else:
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error=invalid_state"
        )


async def _handle_org_callback(
    code: str,
    state_data: dict,
    db: Session,
    frontend_url: str,
):
    """Handle OAuth callback for organization Slack connection."""
    org_id = state_data.get("org_id")
    user_id = state_data.get("user_id")

    if not org_id or not user_id:
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error=invalid_state"
        )

    # Exchange code for token
    success, data = await slack_service.exchange_code_for_token(
        code=code,
        redirect_uri=_get_slack_redirect_uri(),
    )

    if not success:
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error={data.get('error', 'token_exchange_failed')}"
        )

    # Extract token info
    access_token = data.get("access_token")
    team_info = data.get("team", {})
    team_id = team_info.get("id")
    team_name = team_info.get("name")
    bot_user_id = data.get("bot_user_id")

    if not access_token or not team_id:
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error=missing_token_data"
        )

    # Check if this workspace is already connected to another org
    existing = db.query(SlackWorkspaceConnection).filter(
        SlackWorkspaceConnection.slack_team_id == team_id,
        SlackWorkspaceConnection.is_active == True,
    ).first()

    if existing and str(existing.organization_id) != org_id:
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error=workspace_already_connected"
        )

    # Encrypt and store token
    encrypted_token = encrypt_token(access_token)

    try:
        org_uuid = UUID(org_id)
        user_uuid = UUID(user_id)

        # Remove any existing inactive connection for this org
        db.query(SlackWorkspaceConnection).filter(
            SlackWorkspaceConnection.organization_id == org_uuid,
        ).delete()

        # Create new connection
        connection = SlackWorkspaceConnection(
            organization_id=org_uuid,
            slack_team_id=team_id,
            slack_team_name=team_name,
            bot_access_token_encrypted=encrypted_token,
            bot_user_id=bot_user_id,
            installed_by_user_id=user_uuid,
            is_active=True,
        )
        db.add(connection)
        db.commit()

        logger.info(f"Slack connected for org {org_id}: workspace {team_name}")

        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?success=true&workspace={team_name}&org_id={org_id}"
        )

    except Exception as e:
        logger.error(f"Error storing Slack connection: {e}", exc_info=True)
        db.rollback()
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error=storage_failed"
        )


async def _handle_user_callback(
    code: str,
    state_data: dict,
    db: Session,
    frontend_url: str,
):
    """Handle OAuth callback for user Slack account linking."""
    user_id = state_data.get("user_id")

    if not user_id:
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error=invalid_state"
        )

    # Exchange code for token (user token in this case)
    success, data = await slack_service.exchange_code_for_token(
        code=code,
        redirect_uri=_get_user_slack_redirect_uri(),
    )

    if not success:
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error={data.get('error', 'token_exchange_failed')}"
        )

    # For user identity, we get authed_user info
    authed_user = data.get("authed_user", {})
    slack_user_id = authed_user.get("id")
    team_info = data.get("team", {})
    team_id = team_info.get("id")

    if not slack_user_id or not team_id:
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error=missing_user_data"
        )

    try:
        user_uuid = UUID(user_id)

        # Check if this user already has a connection for this team
        existing = db.query(UserSlackConnection).filter(
            UserSlackConnection.user_id == user_uuid,
            UserSlackConnection.slack_team_id == team_id,
        ).first()

        if existing:
            # Update existing connection
            existing.slack_user_id = slack_user_id
            existing.is_active = True
        else:
            # Create new connection
            connection = UserSlackConnection(
                user_id=user_uuid,
                slack_user_id=slack_user_id,
                slack_team_id=team_id,
                is_active=True,
            )
            db.add(connection)

        db.commit()
        logger.info(f"User {user_id} linked Slack account {slack_user_id}")

        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?success=true&type=user"
        )

    except Exception as e:
        logger.error(f"Error storing user Slack connection: {e}", exc_info=True)
        db.rollback()
        return RedirectResponse(
            url=f"{frontend_url}/slack/callback?error=storage_failed"
        )


@router.get("/organizations/{organization_id}/slack/status", response_model=SlackWorkspaceStatus)
async def get_slack_status(
    organization_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get Slack connection status for an organization."""
    # Verify user has access to org (any member can view status)
    org = db.query(Organization).filter(Organization.id == organization_id).first()
    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    connection = db.query(SlackWorkspaceConnection).filter(
        SlackWorkspaceConnection.organization_id == organization_id,
        SlackWorkspaceConnection.is_active == True,
    ).first()

    if not connection:
        return SlackWorkspaceStatus(connected=False)

    # Get installer name
    installer_name = None
    if connection.installed_by:
        installer_name = connection.installed_by.full_name

    return SlackWorkspaceStatus(
        connected=True,
        slack_team_id=connection.slack_team_id,
        slack_team_name=connection.slack_team_name,
        installed_at=connection.installed_at,
        installed_by_name=installer_name,
    )


@router.delete("/organizations/{organization_id}/slack")
async def disconnect_slack(
    organization_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Disconnect Slack from an organization."""
    if not settings.slack_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Slack integration is not configured"
        )

    # Verify user is admin
    _verify_org_admin(organization_id, current_user, db)

    connection = db.query(SlackWorkspaceConnection).filter(
        SlackWorkspaceConnection.organization_id == organization_id,
    ).first()

    if not connection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Slack connection found"
        )

    db.delete(connection)
    db.commit()

    logger.info(f"Slack disconnected for org {organization_id} by user {current_user.id}")

    return {"message": "Slack disconnected successfully"}


@router.get("/user/slack/link", response_model=SlackInstallInitiate)
async def initiate_user_slack_link(
    current_user: User = Depends(get_current_user),
):
    """
    Initiate Slack OAuth flow for user account linking.

    Returns a redirect URL to link the user's Slack account.
    """
    if not settings.slack_enabled:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Slack integration is not configured"
        )

    # Generate state with user info
    state_data = {
        "token": secrets.token_urlsafe(32),
        "user_id": str(current_user.id),
        "type": "user",
    }
    state = base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()

    redirect_url = slack_service.get_user_oauth_url(
        redirect_uri=_get_user_slack_redirect_uri(),
        state=state,
    )

    return SlackInstallInitiate(redirect_url=redirect_url)


@router.get("/user/slack/status", response_model=UserSlackStatus)
async def get_user_slack_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get user's Slack account link status."""
    connection = db.query(UserSlackConnection).filter(
        UserSlackConnection.user_id == current_user.id,
        UserSlackConnection.is_active == True,
    ).first()

    if not connection:
        return UserSlackStatus(linked=False)

    return UserSlackStatus(
        linked=True,
        slack_user_id=connection.slack_user_id,
        slack_team_id=connection.slack_team_id,
        slack_display_name=connection.slack_display_name,
        connected_at=connection.connected_at,
    )


@router.delete("/user/slack")
async def unlink_user_slack(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Unlink user's Slack account."""
    connection = db.query(UserSlackConnection).filter(
        UserSlackConnection.user_id == current_user.id,
    ).first()

    if connection:
        db.delete(connection)
        db.commit()
        logger.info(f"User {current_user.id} unlinked Slack account")

    return {"message": "Slack account unlinked"}
