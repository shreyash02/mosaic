"""Common/shared schemas."""

from typing import Generic, TypeVar, Optional, List, Any
from pydantic import BaseModel, Field


# Generic type for pagination
T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""

    items: List[T]
    total: int
    page: int = Field(..., ge=1)
    page_size: int = Field(..., ge=1, le=100)
    total_pages: int


class PaginationParams(BaseModel):
    """Pagination query parameters."""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)


# Error responses
class ErrorResponse(BaseModel):
    """Standard error response."""

    error: str
    message: str
    details: Optional[dict] = None


class ValidationError(BaseModel):
    """Validation error details."""

    field: str
    message: str


class ValidationErrorResponse(BaseModel):
    """Validation error response."""

    error: str = "validation_error"
    message: str = "Request validation failed"
    errors: List[ValidationError]


# Success responses
class SuccessResponse(BaseModel):
    """Generic success response."""

    success: bool = True
    message: str
    data: Optional[Any] = None


class DeleteResponse(BaseModel):
    """Response for delete operations."""

    success: bool = True
    message: str = "Resource deleted successfully"
    deleted_id: str


# Health check
class HealthCheck(BaseModel):
    """Health check response."""

    status: str
    service: str
    version: str
    database: Optional[str] = None


# Message response
class MessageResponse(BaseModel):
    """Simple message response."""

    message: str
