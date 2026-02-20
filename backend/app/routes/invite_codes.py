"""Invite code and waitlist routes."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.admin import Admin
from app.models.user import User
from app.routes.admin import get_admin
from app.schemas.invite_code import (
    InviteCodeGenerateRequest,
    InviteCodeRequiredResponse,
    InviteCodeResponse,
    InviteCodeStatsResponse,
    InviteCodeValidateRequest,
    InviteCodeValidateResponse,
    PlatformSettingResponse,
    PlatformSettingUpdate,
    ReferralCodeResponse,
    WaitlistApproveRequest,
    WaitlistRejectRequest,
    WaitlistRequestCreate,
    WaitlistRequestResponse,
)
from app.services import invite_code_service, platform_settings_service, waitlist_service
from app.services.audit_log_service import log_audit
from app.services.email_service import email_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


# --- Public endpoints ---

@router.get("/invite-codes/check-required", response_model=InviteCodeRequiredResponse)
async def check_invite_required(db: Session = Depends(get_db)):
    """Check if invite codes are required for registration."""
    required = platform_settings_service.is_invite_code_required(db)
    return InviteCodeRequiredResponse(required=required)


@router.post("/invite-codes/validate", response_model=InviteCodeValidateResponse)
@limiter.limit("10/minute")
async def validate_invite_code(
    request: Request,
    data: InviteCodeValidateRequest,
    db: Session = Depends(get_db),
):
    """Validate an invite code without redeeming it."""
    valid, message, _ = invite_code_service.validate_code(db, data.code)
    return InviteCodeValidateResponse(valid=valid, message=message)


@router.post("/waitlist/request", response_model=WaitlistRequestResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")
async def submit_waitlist_request(
    request: Request,
    data: WaitlistRequestCreate,
    db: Session = Depends(get_db),
):
    """Submit a waitlist access request."""
    req, error = waitlist_service.submit_request(db, data.email, data.full_name, data.message)
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)

    # Send confirmation email
    try:
        await email_service.send_waitlist_confirmation_email(data.email, data.full_name)
    except Exception:
        pass  # Don't fail the request if email fails

    return req


# --- Authenticated user endpoints ---

@router.post("/invite-codes/referral", response_model=ReferralCodeResponse)
async def generate_referral_code(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generate a referral code for the current user (max 5 active)."""
    code, error = invite_code_service.generate_referral_code(db, current_user.id)
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    return ReferralCodeResponse(
        id=code.id,
        code=code.code,
        status=code.status,
        created_at=code.created_at,
    )


@router.get("/invite-codes/my-referrals", response_model=list[ReferralCodeResponse])
async def get_my_referrals(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get current user's referral codes."""
    codes = invite_code_service.get_user_referral_codes(db, current_user.id)
    results = []
    for code in codes:
        used_by_email = None
        if code.used_by_user_id:
            used_by = db.query(User).filter(User.id == code.used_by_user_id).first()
            if used_by:
                used_by_email = used_by.email
        results.append(ReferralCodeResponse(
            id=code.id,
            code=code.code,
            status=code.status,
            used_by_email=used_by_email,
            used_at=code.used_at,
            created_at=code.created_at,
        ))
    return results


# --- Admin endpoints ---

@router.get("/admin/invite-codes", response_model=list[InviteCodeResponse])
async def admin_list_codes(
    status_filter: Optional[str] = Query(None, alias="status"),
    code_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """List invite codes with filtering (admin only)."""
    codes, total = invite_code_service.list_codes(db, status_filter, code_type, search, limit, offset)
    results = []
    for code in codes:
        used_by_email = None
        created_by_name = None
        if code.used_by_user_id:
            used_by = db.query(User).filter(User.id == code.used_by_user_id).first()
            if used_by:
                used_by_email = used_by.email
        if code.created_by_admin_id:
            created_admin = db.query(Admin).filter(Admin.id == code.created_by_admin_id).first()
            if created_admin:
                created_by_name = created_admin.username
        elif code.created_by_user_id:
            created_user = db.query(User).filter(User.id == code.created_by_user_id).first()
            if created_user:
                created_by_name = created_user.full_name or created_user.email

        results.append(InviteCodeResponse(
            id=code.id,
            code=code.code,
            code_type=code.code_type,
            status=code.status,
            created_by_admin_id=code.created_by_admin_id,
            created_by_user_id=code.created_by_user_id,
            used_by_user_id=code.used_by_user_id,
            used_at=code.used_at,
            label=code.label,
            waitlist_request_id=code.waitlist_request_id,
            created_at=code.created_at,
            expires_at=code.expires_at,
            used_by_email=used_by_email,
            created_by_name=created_by_name,
        ))
    return results


@router.post("/admin/invite-codes/generate", response_model=list[InviteCodeResponse])
async def admin_generate_codes(
    data: InviteCodeGenerateRequest,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Generate a batch of invite codes (admin only)."""
    codes = invite_code_service.generate_codes(
        db, data.count, admin.id, data.label, data.expires_in_days
    )
    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="generate_invite_codes",
        entity_type="invite_code",
        details={"count": data.count, "label": data.label},
    )
    return [InviteCodeResponse(
        id=c.id,
        code=c.code,
        code_type=c.code_type,
        status=c.status,
        created_by_admin_id=c.created_by_admin_id,
        label=c.label,
        created_at=c.created_at,
        expires_at=c.expires_at,
        created_by_name=admin.username,
    ) for c in codes]


@router.get("/admin/invite-codes/stats", response_model=InviteCodeStatsResponse)
async def admin_get_stats(
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Get invite code and waitlist stats (admin only)."""
    stats = invite_code_service.get_stats(db)
    return InviteCodeStatsResponse(**stats)


@router.delete("/admin/invite-codes/{code_id}")
async def admin_revoke_code(
    code_id: UUID,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Revoke an invite code (admin only)."""
    code = invite_code_service.revoke_code(db, code_id)
    if not code:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Code not found or not available")
    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="revoke_invite_code",
        entity_type="invite_code",
        entity_id=str(code_id),
    )
    return {"message": "Code revoked"}


@router.get("/admin/waitlist", response_model=list[WaitlistRequestResponse])
async def admin_list_waitlist(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """List waitlist requests (admin only)."""
    requests, total = waitlist_service.list_requests(db, status_filter, search, limit, offset)
    return requests


@router.post("/admin/waitlist/{request_id}/approve", response_model=WaitlistRequestResponse)
async def admin_approve_waitlist(
    request_id: UUID,
    data: WaitlistApproveRequest = WaitlistApproveRequest(),
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Approve a waitlist request and generate invite code (admin only)."""
    req, code, error = waitlist_service.approve_request(db, request_id, admin.id, data.note)
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)

    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="approve_waitlist",
        entity_type="waitlist_request",
        entity_id=str(request_id),
        details={"email": req.email},
    )

    # Send invite code email
    try:
        await email_service.send_invite_code_email(req.email, code.code)
    except Exception:
        pass  # Don't fail the request if email fails

    return req


@router.post("/admin/waitlist/{request_id}/reject", response_model=WaitlistRequestResponse)
async def admin_reject_waitlist(
    request_id: UUID,
    data: WaitlistRejectRequest = WaitlistRejectRequest(),
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Reject a waitlist request (admin only)."""
    req, error = waitlist_service.reject_request(db, request_id, admin.id, data.note)
    if error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=error)
    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="reject_waitlist",
        entity_type="waitlist_request",
        entity_id=str(request_id),
    )
    return req


@router.get("/admin/platform-settings", response_model=list[PlatformSettingResponse])
async def admin_list_settings(
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """List all platform settings (admin only)."""
    settings = platform_settings_service.get_all_settings(db)
    return settings


@router.put("/admin/platform-settings/{key}", response_model=PlatformSettingResponse)
async def admin_update_setting(
    key: str,
    data: PlatformSettingUpdate,
    admin: Admin = Depends(get_admin),
    db: Session = Depends(get_db),
):
    """Update a platform setting (admin only)."""
    setting = platform_settings_service.set_setting(
        db, key, data.value, admin.id, data.description
    )
    log_audit(
        admin_id=admin.id,
        admin_username=admin.username,
        action="update_platform_setting",
        entity_type="platform_setting",
        entity_id=key,
        details={"value": data.value},
    )
    return setting
