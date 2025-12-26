"""Authentication routes."""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from jose import JWTError
from sqlalchemy.orm import Session
from authlib.integrations.httpx_client import AsyncOAuth2Client
import httpx

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    User as UserSchema,
    Token,
    LoginRequest,
    RefreshTokenRequest,
)

router = APIRouter()


@router.post("/register", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
async def register(
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

    # Create new user (password is required for regular registration)
    if not user_data.password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required for registration"
        )
    
    user = User(
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        full_name=user_data.full_name,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@router.post("/login", response_model=Token)
async def login(
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
async def google_login():
    """
    Initiate Google OAuth login flow.
    
    Returns:
        Redirect to Google OAuth authorization page
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured"
        )
    
    # Get frontend URL from request or use default
    frontend_url = settings.cors_origins_list[0] if settings.cors_origins_list else "http://localhost:5173"
    
    oauth = AsyncOAuth2Client(
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
    )
    
    authorization_url, state = oauth.create_authorization_url(
        "https://accounts.google.com/o/oauth2/v2/auth",
        scope="openid email profile",
    )
    
    # authorization_url already contains the state parameter
    # In production, you'd want to store the state in a session or cache for validation
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
        state: State parameter for CSRF protection
        error: Error from Google if any
        db: Database session
        
    Returns:
        Redirect to frontend with token or error
    """
    if error:
        frontend_url = settings.cors_origins_list[0] if settings.cors_origins_list else "http://localhost:5173"
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
    
    # Exchange code for token
    oauth = AsyncOAuth2Client(
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET,
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
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
        frontend_url = settings.cors_origins_list[0] if settings.cors_origins_list else "http://localhost:5173"
        return RedirectResponse(
            url=f"{frontend_url}/login?error=oauth_failed"
        )
    
    google_id = google_user.get("id")
    email = google_user.get("email")
    full_name = google_user.get("name")
    
    if not google_id or not email:
        frontend_url = settings.cors_origins_list[0] if settings.cors_origins_list else "http://localhost:5173"
        return RedirectResponse(
            url=f"{frontend_url}/login?error=oauth_incomplete"
        )
    
    # Find or create user
    user = db.query(User).filter(User.google_id == google_id).first()
    
    if not user:
        # Check if user exists with this email (for linking accounts)
        user = db.query(User).filter(User.email == email).first()
        
        if user:
            # Link Google account to existing user
            user.google_id = google_id
            if not user.full_name and full_name:
                user.full_name = full_name
        else:
            # Create new user
            user = User(
                email=email,
                google_id=google_id,
                full_name=full_name,
                password_hash=None,  # OAuth users don't have passwords
            )
            db.add(user)
        
        db.commit()
        db.refresh(user)
    
    # Create tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    # Redirect to frontend with tokens
    frontend_url = settings.cors_origins_list[0] if settings.cors_origins_list else "http://localhost:5173"
    return RedirectResponse(
        url=f"{frontend_url}/auth/callback?access_token={access_token}&refresh_token={refresh_token}"
    )
