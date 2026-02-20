"""Invite code service for code generation, validation, and redemption."""

import secrets
from datetime import datetime, timedelta
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.invite_code import InviteCode
from app.models.user import User
from app.models.admin import Admin


def generate_code_string() -> str:
    """Generate an 8-character uppercase alphanumeric code."""
    return secrets.token_hex(4).upper()


def generate_codes(
    db: Session,
    count: int,
    admin_id: UUID,
    label: Optional[str] = None,
    expires_in_days: Optional[int] = None,
) -> List[InviteCode]:
    """Generate a batch of admin invite codes."""
    expires_at = None
    if expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

    codes = []
    for _ in range(count):
        code = InviteCode(
            code=generate_code_string(),
            code_type="admin",
            status="available",
            created_by_admin_id=admin_id,
            label=label,
            expires_at=expires_at,
        )
        db.add(code)
        codes.append(code)

    db.commit()
    for code in codes:
        db.refresh(code)
    return codes


def generate_referral_code(db: Session, user_id: UUID) -> Tuple[Optional[InviteCode], Optional[str]]:
    """Generate a referral code for a user. Max 5 active per user."""
    active_count = db.query(func.count(InviteCode.id)).filter(
        InviteCode.created_by_user_id == user_id,
        InviteCode.code_type == "referral",
        InviteCode.status == "available",
    ).scalar()

    if active_count >= 5:
        return None, "Maximum of 5 active referral codes reached"

    code = InviteCode(
        code=generate_code_string(),
        code_type="referral",
        status="available",
        created_by_user_id=user_id,
    )
    db.add(code)
    db.commit()
    db.refresh(code)
    return code, None


def validate_code(
    db: Session, code_str: str, email: Optional[str] = None
) -> Tuple[bool, str, Optional[InviteCode]]:
    """Validate an invite code. Returns (valid, message, code_obj).

    If email is provided and the code is a waitlist code, validates that
    the email matches the waitlist request the code was generated for.
    """
    code = db.query(InviteCode).filter(InviteCode.code == code_str.upper().strip()).first()

    if not code:
        return False, "Invalid invite code", None

    if code.status == "used":
        return False, "This invite code has already been used", None

    if code.status == "revoked":
        return False, "This invite code has been revoked", None

    if code.expires_at and code.expires_at < datetime.utcnow():
        return False, "This invite code has expired", None

    # For waitlist codes, ensure the registering email matches the approved email
    if email and code.code_type == "waitlist" and code.waitlist_request_id:
        from app.models.waitlist_request import WaitlistRequest
        waitlist_req = db.query(WaitlistRequest).filter(
            WaitlistRequest.id == code.waitlist_request_id
        ).first()
        if waitlist_req and waitlist_req.email.lower().strip() != email.lower().strip():
            return False, "This invite code was issued for a different email address", None

    return True, "Valid invite code", code


def redeem_code(db: Session, code_str: str, user_id: UUID) -> Optional[InviteCode]:
    """Redeem an invite code for a user."""
    code = db.query(InviteCode).filter(InviteCode.code == code_str.upper().strip()).first()
    if not code or code.status != "available":
        return None

    code.status = "used"
    code.used_by_user_id = user_id
    code.used_at = datetime.utcnow()
    db.commit()
    db.refresh(code)
    return code


def revoke_code(db: Session, code_id: UUID) -> Optional[InviteCode]:
    """Revoke an invite code."""
    code = db.query(InviteCode).filter(InviteCode.id == code_id).first()
    if not code or code.status != "available":
        return None

    code.status = "revoked"
    db.commit()
    db.refresh(code)
    return code


def get_stats(db: Session) -> dict:
    """Get aggregate stats for invite codes and waitlist."""
    from app.models.waitlist_request import WaitlistRequest

    total = db.query(func.count(InviteCode.id)).scalar() or 0
    available = db.query(func.count(InviteCode.id)).filter(InviteCode.status == "available").scalar() or 0
    used = db.query(func.count(InviteCode.id)).filter(InviteCode.status == "used").scalar() or 0
    revoked = db.query(func.count(InviteCode.id)).filter(InviteCode.status == "revoked").scalar() or 0

    waitlist_pending = db.query(func.count(WaitlistRequest.id)).filter(WaitlistRequest.status == "pending").scalar() or 0
    waitlist_approved = db.query(func.count(WaitlistRequest.id)).filter(WaitlistRequest.status == "approved").scalar() or 0
    waitlist_rejected = db.query(func.count(WaitlistRequest.id)).filter(WaitlistRequest.status == "rejected").scalar() or 0

    return {
        "total_codes": total,
        "available_codes": available,
        "used_codes": used,
        "revoked_codes": revoked,
        "waitlist_pending": waitlist_pending,
        "waitlist_approved": waitlist_approved,
        "waitlist_rejected": waitlist_rejected,
    }


def list_codes(
    db: Session,
    status: Optional[str] = None,
    code_type: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[InviteCode], int]:
    """List invite codes with filtering. Returns (codes, total_count)."""
    query = db.query(InviteCode)

    if status:
        query = query.filter(InviteCode.status == status)
    if code_type:
        query = query.filter(InviteCode.code_type == code_type)
    if search:
        search_term = f"%{search.upper().strip()}%"
        query = query.filter(
            (InviteCode.code.ilike(search_term)) |
            (InviteCode.label.ilike(f"%{search.strip()}%"))
        )

    total = query.count()
    codes = query.order_by(InviteCode.created_at.desc()).offset(offset).limit(limit).all()
    return codes, total


def get_user_referral_codes(db: Session, user_id: UUID) -> List[InviteCode]:
    """Get all referral codes created by a user."""
    return db.query(InviteCode).filter(
        InviteCode.created_by_user_id == user_id,
        InviteCode.code_type == "referral",
    ).order_by(InviteCode.created_at.desc()).all()
