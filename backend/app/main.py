"""Main FastAPI application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from app.core.config import settings
from app.routes import auth, conversations, responses, analysis, organizations

app = FastAPI(
    title="Mosaic API",
    description="Anonymous feedback collection with LLM-powered insights",
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


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}

# Serve static files (frontend build)
static_dir = os.path.join(os.path.dirname(__file__), "..", "static")
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")
    
    # Serve index.html for all non-API routes (SPA routing)
    # This must be last to catch all routes not matched above
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React app for all non-API routes."""
        # Don't interfere with API routes, health, or static files
        if full_path.startswith("api") or full_path.startswith("health") or full_path.startswith("static"):
            return {"detail": "Not found"}
        
        index_path = os.path.join(static_dir, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return {"detail": "Frontend not found"}
