"""Pydantic schemas for the admin audit log endpoint."""

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class AuditLogEntry(BaseModel):
    id: str
    admin_id: str
    admin_username: str
    action: str
    entity_type: str
    entity_id: Optional[str]
    details: Optional[Dict[str, Any]]
    created_at: datetime


class AdminAuditLogResponse(BaseModel):
    logs: List[AuditLogEntry]
    total: int
    page: int
    page_size: int
    total_pages: int
