"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.responses import RedirectResponse
from jose import JWTError
from sqlalchemy.orm import Session
from authlib.integrations.httpx_client import AsyncOAuth2Client
from slowapi import Limiter
from slowapi.util import get_remote_address
import httpx

from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    create_password_reset_token,
)
from app.services.email_service import email_service
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    User as UserSchema,
    Token,
    LoginRequest,
    RefreshTokenRequest,
    UserWithAuthInfo,
    ProfileUpdate,
    PasswordChangeRequest,
    PasswordSetRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
    EmailPreferences,
    get_email_preferences,
    OnboardingProgress,
    get_onboarding_progress,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    Register a new user.

    Args:
        user_data: User registration data
        db: Database session

    Returns:
        Created user

    Raises:
        HTTPException: If email already exists
    """
    # Check if user with email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if invite code is required
    from app.services import platform_settings_service, invite_code_service
    if platform_settings_service.is_invite_code_required(db):
        if not user_data.invite_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An invite code is required to register"
            )
        valid, msg, _ = invite_code_service.validate_code(db, user_data.invite_code, email=user_data.email)
        if not valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=msg
            )

    # Create new user (password is required for regular registration)
    if not user_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for registration"
        )

    # Check if this invite code already proves email ownership (waitlist codes
    # are emailed to a specific address, so if the email matches, it's verified)
    email_already_verified = False
    if user_data.invite_code:
        from app.services import invite_code_service as ic_svc
        _, _, code_obj = ic_svc.validate_code(db, user_data.invite_code)
        if code_obj and code_obj.code_type == "waitlist" and code_obj.waitlist_request_id:
            from app.models.waitlist_request import WaitlistRequest
            wr = db.query(WaitlistRequest).filter(
                WaitlistRequest.id == code_obj.waitlist_request_id
            ).first()
            if wr and wr.email.lower().strip() == user_data.email.lower().strip():
                email_already_verified = True

    # Generate email verification token (only needed if not already verified)
    import secrets
    verification_token = secrets.token_urlsafe(32) if not email_already_verified else None

    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        email_verified=email_already_verified,
        email_verification_token=verification_token,
        email_verification_expires=(
            datetime.now(timezone.utc) + timedelta(hours=24)
        ) if not email_already_verified else None,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Redeem invite code if one was used
    if user_data.invite_code:
        from app.services import invite_code_service
        invite_code_service.redeem_code(db, user_data.invite_code, user.id)

    # Send verification email only if not already verified
    if not email_already_verified:
        try:
            verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
            await email_service.send_email_verification_email(
                to_email=user.email,
                verification_url=verification_url,
            )
        except Exception as e:
            # Log error but don't fail registration
            import logging
            logging.error(f"Failed to send verification email: {e}")

    return user


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Login and get access token.

    Args:
        login_data: Login credentials
        db: Database session

    Returns:
        Access and refresh tokens

    Raises:
        HTTPException: If credentials are invalid
    """
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()

    # Check if user exists and has a password (not OAuth-only user)
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/refresh", response_model=Token)
async def refresh(
    refresh_data: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """
    Refresh access token using refresh token.

    Args:
        refresh_data: Refresh token
        db: Database session

    Returns:
        New access and refresh tokens

    Raises:
        HTTPException: If refresh token is invalid
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(refresh_data.refresh_token)

        # Verify it's a refresh token
        if payload.get("type") != "refresh":
            raise credentials_exception

        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception

    except JWTError:
        raise credentials_exception

    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    # Create new tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.get("/me", response_model=UserSchema)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """
    Get current authenticated user.

    Args:
        current_user: Current authenticated user from token

    Returns:
        Current user information
    """
    return current_user


@router.get("/me/features")
async def get_user_features(
    current_user: User = Depends(get_current_user),
    org_id: str = Query(None, description="Optional organization ID for org context"),
    db: Session = Depends(get_db),
):
    """
    Get feature flags for the current user.

    Returns all feature flags with their effective enabled state, config,
    and usage for the current user's context.

    If org_id is provided, returns features in the context of that organization
    (using org's subscription tier and shared usage pool).
    """
    from uuid import UUID as PyUUID
    from app.models.organization import OrganizationMember
    from app.services.feature_flag_service import feature_flag_service
    from app.services.subscription_service import subscription_service
    from app.services.usage_service import usage_service

    # Parse org_id if provided
    parsed_org_id = None
    if org_id:
        try:
            parsed_org_id = PyUUID(org_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid organization ID format"
            )

        # SECURITY: Validate user is a member of the org
        membership = db.query(OrganizationMember).filter(
            OrganizationMember.organization_id == parsed_org_id,
            OrganizationMember.user_id == current_user.id
        ).first()
        if not membership:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not a member of this organization"
            )

    # Get tier based on context
    tier = subscription_service.get_tier(
        db,
        user_id=current_user.id,
        org_id=parsed_org_id
    )

    all_flags = feature_flag_service.list_all_flags(db)
    features = {}

    for flag in all_flags:
        effective = feature_flag_service.get_flag(
            db, flag.slug,
            tier=tier,
            org_id=parsed_org_id,
            user_id=current_user.id
        )

        # Get usage for config keys that look like limits
        usage = {}
        for key in effective.config:
            if key.endswith('_per_month') or key.endswith('_limit'):
                # Track usage at org level if org context, else personal
                usage[key] = usage_service.get_usage(
                    db, flag.slug,
                    user_id=current_user.id if not parsed_org_id else None,
                    org_id=parsed_org_id
                )

        features[flag.slug] = {
            "enabled": effective.enabled,
            "config": effective.config,
            "usage": usage,
        }

    return {"features": features, "tier": tier}


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout():
    """
    Logout user.

    Note: Since we're using stateless JWT tokens, logout is handled client-side
    by removing the tokens. This endpoint exists for API completeness and could
    be extended with token blacklisting in the future.
    """
    # For stateless JWT, logout is client-side
    # Future: Implement token blacklisting if needed
    return None


@router.get("/google/login")
async def google_login(request: Request, redirect: str = Query(None), invite_code: str = Query(None)):
    """
    Initiate Google OAuth login flow.

    Args:
        request: FastAPI request object
        redirect: Optional redirect URL to return to after login
        invite_code: Optional invite code for gated registration

    Returns:
        Redirect to Google OAuth authorization page
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured"
        )

    oauth = AsyncOAuth2Client(
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        redirect_uri=settings.google_redirect_uri,
    )

    # Generate state and encode redirect/invite_code if provided
    import secrets
    import base64
    import json

    state_token = secrets.token_urlsafe(32)
    if redirect or invite_code:
        state_data = {
            "token": state_token,
        }
        if redirect:
            state_data["redirect"] = redirect
        if invite_code:
            state_data["invite_code"] = invite_code
        state = base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()
    else:
        state = state_token

    authorization_url = oauth.create_authorization_url(
        "https://accounts.google.com/o/oauth2/v2/auth",
        scope="openid email profile",
        state=state,
    )[0]

    return RedirectResponse(url=authorization_url)


@router.get("/google/callback")
async def google_callback(
    request: Request,
    code: str = None,
    state: str = None,
    error: str = None,
    db: Session = Depends(get_db)
):
    """
    Handle Google OAuth callback.

    Args:
        request: FastAPI request object
        code: Authorization code from Google
        state: State parameter for CSRF protection (may contain encoded redirect)
        error: Error from Google if any
        db: Database session

    Returns:
        Redirect to frontend with token or error
    """
    frontend_url = settings.cors_origins_list[0] if settings.cors_origins_list else "http://localhost:5173"

    if error:
        return RedirectResponse(
            url=f"{frontend_url}/login?error=oauth_error"
        )

    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Authorization code not provided"
        )

    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured"
        )

    # Extract redirect and invite_code from state if present
    redirect_url = None
    invite_code_from_state = None
    if state:
        try:
            import base64
            import json
            state_data = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
            redirect_url = state_data.get("redirect")
            invite_code_from_state = state_data.get("invite_code")
        except:
            # If state is not in expected format, treat it as a simple token
            pass

    # Exchange code for token
    oauth = AsyncOAuth2Client(
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        redirect_uri=settings.google_redirect_uri,
    )

    try:
        token = await oauth.fetch_token(
            "https://oauth2.googleapis.com/token",
            code=code,
        )

        # Get user info from Google
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {token['access_token']}"}
            )
            response.raise_for_status()
            google_user = response.json()
    except Exception as e:
        return RedirectResponse(
            url=f"{frontend_url}/login?error=oauth_failed"
        )

    google_id = google_user.get("id")
    email = google_user.get("email")
    full_name = google_user.get("name")

    if not google_id or not email:
        return RedirectResponse(
            url=f"{frontend_url}/login?error=oauth_incomplete"
        )

    # Find or create user
    user = db.query(User).filter(User.google_id == google_id).first()
    is_new_user = False

    if not user:
        # Check if user exists with this email (for linking accounts)
        user = db.query(User).filter(User.email == email).first()

        if user:
            # Link Google account to existing user
            user.google_id = google_id
            if not user.full_name and full_name:
                user.full_name = full_name
            # Google verified the email, so mark it verified
            # Keep the verification token so any pending email links still work
            user.email_verified = True
        else:
            is_new_user = True
            # New user — check invite code requirement
            from app.services import platform_settings_service, invite_code_service
            if platform_settings_service.is_invite_code_required(db):
                if not invite_code_from_state:
                    return RedirectResponse(
                        url=f"{frontend_url}/register?error=invite_code_required"
                    )
                valid, msg, _ = invite_code_service.validate_code(db, invite_code_from_state)
                if not valid:
                    return RedirectResponse(
                        url=f"{frontend_url}/register?error=invalid_invite_code"
                    )

            # Create new user
            user = User(
                email=email,
                google_id=google_id,
                full_name=full_name,
                password_hash=None,  # OAuth users don't have passwords
                email_verified=True,  # Google verified the email
            )
            db.add(user)

        db.commit()
        db.refresh(user)

        # Redeem invite code if one was used for a new user
        if is_new_user and invite_code_from_state:
            try:
                from app.services import invite_code_service
                invite_code_service.redeem_code(db, invite_code_from_state, user.id)
            except Exception:
                pass
    else:
        # Existing Google user logging in — ensure verified
        if not user.email_verified:
            user.email_verified = True
            db.commit()
            db.refresh(user)

    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})

    # Redirect to frontend with tokens and redirect parameter if present
    from urllib.parse import urlencode
    callback_params = {
        "access_token": access_token,
        "refresh_token": refresh_token
    }
    if redirect_url:
        callback_params["redirect"] = redirect_url

    callback_url = f"{frontend_url}/auth/callback?{urlencode(callback_params)}"
    return RedirectResponse(url=callback_url)


@router.get("/me/profile", response_model=UserWithAuthInfo)
async def get_user_profile(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user profile with auth info.

    Returns user data plus has_password and has_google flags.
    """
    return UserWithAuthInfo(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        profile_image_url=current_user.profile_image_url,
        email_verified=current_user.email_verified,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at,
        has_password=current_user.password_hash is not None,
        has_google=current_user.google_id is not None,
    )


@router.patch("/me/profile", response_model=UserSchema)
async def update_profile(
    profile_data: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile.

    Supports updating full_name and profile_image_url.
    """
    if profile_data.full_name is not None:
        current_user.full_name = profile_data.full_name

    if profile_data.profile_image_url is not None:
        # Allow setting to empty string to remove profile picture
        current_user.profile_image_url = profile_data.profile_image_url or None

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/password/change", status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Change password for users who have one.

    Requires current password verification.
    """
    if not current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change password for OAuth-only account. Use set password instead."
        )

    if not verify_password(password_data.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect"
        )

    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()


@router.post("/password/set", status_code=status.HTTP_204_NO_CONTENT)
async def set_password(
    password_data: PasswordSetRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Set a password for OAuth-only users.

    Allows OAuth users to also log in with email/password.
    """
    if current_user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has a password. Use change password instead."
        )

    current_user.password_hash = get_password_hash(password_data.new_password)
    db.commit()


@router.get("/email-preferences", response_model=EmailPreferences)
async def get_user_email_preferences(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's email notification preferences.

    Returns preferences with defaults for any unset values.
    """
    return get_email_preferences(current_user.email_preferences)


@router.put("/email-preferences", response_model=EmailPreferences)
async def update_email_preferences(
    preferences: EmailPreferences,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user's email notification preferences.

    All fields are optional; unset fields keep their current values.
    """
    current_user.email_preferences = preferences.model_dump()
    db.commit()
    db.refresh(current_user)
    return get_email_preferences(current_user.email_preferences)


@router.get("/onboarding", response_model=OnboardingProgress)
async def get_user_onboarding_progress(
    current_user: User = Depends(get_current_user)
):
    """
    Get current user's onboarding progress.

    Returns progress with defaults for any unset values.
    """
    return get_onboarding_progress(current_user.onboarding_progress)


@router.put("/onboarding", response_model=OnboardingProgress)
async def update_onboarding_progress(
    progress: OnboardingProgress,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user's onboarding progress.

    Replaces the entire progress object.
    """
    current_user.onboarding_progress = progress.model_dump()
    db.commit()
    db.refresh(current_user)
    return get_onboarding_progress(current_user.onboarding_progress)


@router.post("/password/forgot", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("5/minute")
async def forgot_password(
    request: Request,
    forgot_data: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Request a password reset link.

    Sends an email with a reset link if the email exists.
    Always returns success to prevent email enumeration.
    """
    user = db.query(User).filter(User.email == forgot_data.email).first()

    if user:
        # Generate reset token
        token = create_password_reset_token()
        user.password_reset_token = token
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()

        # Send email
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        await email_service.send_password_reset_email(
            to_email=user.email,
            reset_url=reset_url,
        )

    # Always return success to prevent email enumeration


@router.post("/password/reset", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("10/minute")
async def reset_password(
    request: Request,
    reset_data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Reset password using a reset token.

    Validates the token and updates the password.
    """
    user = db.query(User).filter(
        User.password_reset_token == reset_data.token
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    if not user.password_reset_expires or user.password_reset_expires < datetime.now(timezone.utc):
        # Clear expired token
        user.password_reset_token = None
        user.password_reset_expires = None
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

    # Update password and clear reset token
    user_email = user.email  # Store email before clearing token
    user.password_hash = get_password_hash(reset_data.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    db.commit()

    # Send confirmation email
    await email_service.send_password_reset_confirmation_email(to_email=user_email)


@router.post("/verify-email")
async def verify_email(
    verify_data: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    """
    Verify email using a verification token.

    Validates the token and marks the user's email as verified.
    """
    user = db.query(User).filter(
        User.email_verification_token == verify_data.token
    ).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification link. Please request a new one."
        )

    # If already verified (e.g. via Google OAuth), just clean up and return success
    if user.email_verified:
        user.email_verification_token = None
        user.email_verification_expires = None
        db.commit()
        return {"message": "Email verified successfully"}

    if not user.email_verification_expires or user.email_verification_expires < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link has expired. Please request a new one."
        )

    # Mark email as verified and clear token
    user.email_verified = True
    user.email_verification_token = None
    user.email_verification_expires = None
    db.commit()

    return {"message": "Email verified successfully"}


@router.post("/resend-verification", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/minute")
async def resend_verification(
    request: Request,
    resend_data: ResendVerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Resend email verification link.

    Generates a new verification token and sends a new email.
    Rate limited to prevent abuse.
    """
    user = db.query(User).filter(User.email == resend_data.email).first()

    if not user:
        # Don't reveal whether email exists
        return

    if user.email_verified:
        # Already verified, nothing to do
        return

    # Generate new verification token
    import secrets
    verification_token = secrets.token_urlsafe(32)
    user.email_verification_token = verification_token
    user.email_verification_expires = datetime.now(timezone.utc) + timedelta(hours=24)
    db.commit()

    # Send verification email
    verification_url = f"{settings.FRONTEND_URL}/verify-email?token={verification_token}"
    await email_service.send_email_verification_email(
        to_email=user.email,
        verification_url=verification_url,
    )
