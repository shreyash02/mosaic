"""File upload routes."""

import logging
import os
import secrets
import string
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

# Use volume mount path in production, local path in development
# Fly.io volumes are mounted at /data
# Can be overridden with UPLOAD_DIR environment variable for local development
def get_upload_dir() -> Path:
    """Get the upload directory path, with fallback for local development."""
    upload_dir_env = os.getenv("UPLOAD_DIR")

    if upload_dir_env:
        # If explicitly set, resolve it (handles both absolute and relative paths)
        upload_dir = Path(upload_dir_env)
        if not upload_dir.is_absolute():
            # If relative, resolve relative to backend directory
            backend_dir = Path(__file__).parent.parent.parent
            upload_dir = (backend_dir / upload_dir).resolve()
    else:
        # Default: try /data/uploads first (for Fly.io production)
        # If that fails, fall back to relative path for local development
        upload_dir = Path("/data/uploads")
        try:
            upload_dir.mkdir(parents=True, exist_ok=True)
            return upload_dir
        except (FileNotFoundError, PermissionError, OSError):
            # Fall back to relative path for local development
            backend_dir = Path(__file__).parent.parent.parent
            upload_dir = backend_dir / "uploads"

    # Create the directory (will create parent directories if needed)
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir

UPLOAD_DIR = get_upload_dir()

# Allowed image extensions
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


def delete_image_file(image_url: str) -> None:
    """Delete an uploaded image file given its URL path.

    Safely extracts the filename from a URL like "/api/uploads/abc123.png",
    validates the resolved path stays within UPLOAD_DIR, and deletes the file.
    Logs a warning and does NOT raise if the file is missing or deletion fails.
    """
    if not image_url:
        return
    # Extract filename from URL like "/api/uploads/abc123.png"
    filename = image_url.rsplit("/", 1)[-1]
    file_path = UPLOAD_DIR / filename
    if not file_path.resolve().is_relative_to(UPLOAD_DIR.resolve()):
        logger.warning("Skipping deletion, path outside upload dir: %s", image_url)
        return
    try:
        file_path.unlink(missing_ok=True)
    except OSError:
        logger.warning("Failed to delete image file: %s", file_path)


def generate_filename(original_filename: str) -> str:
    """Generate a unique filename."""
    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Generate random string
    alphabet = string.ascii_letters + string.digits
    random_str = ''.join(secrets.choice(alphabet) for _ in range(16))
    return f"{random_str}{ext}"


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Upload an image file.

    Returns the URL path to access the uploaded image.
    """
    # Check file size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024}MB"
        )

    # Generate filename
    filename = generate_filename(file.filename or "image.jpg")
    file_path = UPLOAD_DIR / filename

    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)

    # Return URL path (relative to API base)
    return {"url": f"/api/uploads/{filename}"}


@router.get("/uploads/{filename}")
async def get_uploaded_file(filename: str):
    """Serve uploaded files."""
    file_path = UPLOAD_DIR / filename

    # Security: prevent directory traversal
    if not file_path.resolve().is_relative_to(UPLOAD_DIR.resolve()):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if not file_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    # Determine content type
    ext = file_path.suffix.lower()
    content_type_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    content_type = content_type_map.get(ext, "application/octet-stream")

    return FileResponse(file_path, media_type=content_type)

