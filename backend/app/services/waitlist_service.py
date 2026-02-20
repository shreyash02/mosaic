"""Waitlist service for managing access requests."""

from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.waitlist_request import WaitlistRequest
from app.models.invite_code import InviteCode
from app.services import invite_code_service


def submit_request(
    db: Session,
    email: str,
    full_name: Optional[str] = None,
    message: Optional[str] = None,
) -> Tuple[Optional[WaitlistRequest], Optional[str]]:
    """Submit a waitlist request. Rejects duplicate pending requests."""
    existing = db.query(WaitlistRequest).filter(
        WaitlistRequest.email == email.lower().strip(),
        WaitlistRequest.status == "pending",
    ).first()

    if existing:
        return None, "A request with this email is already pending"

    request = WaitlistRequest(
        email=email.lower().strip(),
        full_name=full_name,
        message=message,
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request, None


def approve_request(
    db: Session,
    request_id: UUID,
    admin_id: UUID,
    note: Optional[str] = None,
) -> Tuple[Optional[WaitlistRequest], Optional[InviteCode], Optional[str]]:
    """Approve a waitlist request and generate an invite code."""
    req = db.query(WaitlistRequest).filter(WaitlistRequest.id == request_id).first()
    if not req:
        return None, None, "Request not found"

    if req.status != "pending":
        return None, None, f"Request is already {req.status}"

    req.status = "approved"
    req.processed_by_admin_id = admin_id
    req.processed_at = datetime.utcnow()
    req.admin_note = note

    # Generate invite code for this waitlist request
    code = InviteCode(
        code=invite_code_service.generate_code_string(),
        code_type="waitlist",
        status="available",
        created_by_admin_id=admin_id,
        waitlist_request_id=req.id,
        label=f"Waitlist: {req.email}",
    )
    db.add(code)
    db.commit()
    db.refresh(req)
    db.refresh(code)
    return req, code, None


def reject_request(
    db: Session,
    request_id: UUID,
    admin_id: UUID,
    note: Optional[str] = None,
) -> Tuple[Optional[WaitlistRequest], Optional[str]]:
    """Reject a waitlist request."""
    req = db.query(WaitlistRequest).filter(WaitlistRequest.id == request_id).first()
    if not req:
        return None, "Request not found"

    if req.status != "pending":
        return None, f"Request is already {req.status}"

    req.status = "rejected"
    req.processed_by_admin_id = admin_id
    req.processed_at = datetime.utcnow()
    req.admin_note = note
    db.commit()
    db.refresh(req)
    return req, None


def list_requests(
    db: Session,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
) -> Tuple[List[WaitlistRequest], int]:
    """List waitlist requests with filtering."""
    query = db.query(WaitlistRequest)

    if status:
        query = query.filter(WaitlistRequest.status == status)
    if search:
        search_term = f"%{search.lower().strip()}%"
        query = query.filter(
            (WaitlistRequest.email.ilike(search_term)) |
            (WaitlistRequest.full_name.ilike(search_term))
        )

    total = query.count()
    requests = query.order_by(WaitlistRequest.created_at.desc()).offset(offset).limit(limit).all()
    return requests, total
