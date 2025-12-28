"""Main FastAPI application."""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from starlette.exceptions import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import Message
from starlette.responses import Response as StarletteResponse
import os

from app.core.config import settings
from app.routes import auth, conversations, responses, analysis, organizations, admin

app = FastAPI(
    title="Mosaic API",
    description="Collection of anonymous opinions or responses to questions/polls with LLM-powered insights",
    version="0.1.0"
)

# CORS middleware - only needed if you have external API calls
# For same-origin, you can remove this or keep it for API flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(conversations.router, prefix="/api/conversations", tags=["conversations"])
app.include_router(responses.router, prefix="/api", tags=["responses"])
app.include_router(analysis.router, prefix="/api", tags=["analysis"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["organizations"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

# Serve static files (frontend build)
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_dir):
    assets_dir = os.path.join(static_dir, "assets")
    
    # Create a StaticFiles instance for assets
    if os.path.exists(assets_dir):
        assets_static = StaticFiles(directory=assets_dir)
        app.mount("/assets", assets_static, name="assets")
    
    # Serve favicon
    @app.get("/favicon.svg")
    async def favicon():
        favicon_path = os.path.join(static_dir, "favicon.svg")
        if os.path.exists(favicon_path):
            return FileResponse(favicon_path)
        raise HTTPException(status_code=404)
    
    # Serve index.html for root
    @app.get("/")
    async def serve_index():
        """Serve the React app index page."""
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404)
    
    # Catch-all for SPA routes - but we need to handle assets differently
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """Serve the React app for all non-API routes."""
        # Don't handle API routes or health
        if full_path.startswith("api/") or full_path == "health":
            raise HTTPException(status_code=404)
        
        # For /assets/ requests, try to serve the file directly
        if full_path.startswith("assets/"):
            # Extract the asset path (may include subdirectories)
            asset_file = full_path.replace("assets/", "", 1)
            # Use os.path.normpath to handle any path traversal attempts safely
            asset_file = os.path.normpath(asset_file)
            asset_path = os.path.join(assets_dir, asset_file)
            # Ensure the path is within assets_dir (security check)
            if not os.path.commonpath([assets_dir, asset_path]) == assets_dir:
                raise HTTPException(status_code=404)
            if os.path.exists(asset_path) and os.path.isfile(asset_path):
                return FileResponse(asset_path)
            raise HTTPException(status_code=404)
        
        # For all other routes, serve index.html (SPA routing)
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        raise HTTPException(status_code=404)
