"""Main FastAPI application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from starlette.exceptions import HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import Message
from starlette.responses import Response as StarletteResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from datetime import datetime
import os

from app.core.config import settings
from app.routes import auth, conversations, responses, analysis, organizations, admin, upload, series, periodic_analysis, slack, reminders, announcements, search, feature_flags, notifications, suggested_actions, insight_annotations
from app.services.scheduler_service import start_scheduler, shutdown_scheduler

# Rate limiter setup (in-memory, use Redis for multi-instance deployments)
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()

app = FastAPI(
    title="Mosaic API",
    description="Collection of anonymous opinions or responses to questions/polls with LLM-powered insights",
    version="0.1.0",
    lifespan=lifespan
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
app.include_router(series.router, prefix="/api/series", tags=["series"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(upload.router, prefix="/api", tags=["upload"])
app.include_router(periodic_analysis.router, prefix="/api", tags=["periodic-analysis"])
app.include_router(slack.router, prefix="/api", tags=["slack"])
app.include_router(reminders.router, prefix="/api", tags=["reminders"])
app.include_router(announcements.router, prefix="/api", tags=["announcements"])
app.include_router(search.router, prefix="/api/search", tags=["search"])
app.include_router(feature_flags.router, prefix="/api/admin/feature-flags", tags=["admin-feature-flags"])
app.include_router(notifications.router, prefix="/api", tags=["notifications"])
app.include_router(suggested_actions.router, prefix="/api", tags=["suggested-actions"])
app.include_router(insight_annotations.router, prefix="/api", tags=["insight-annotations"])


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


@app.get("/sitemap.xml")
async def sitemap():
    """Generate and serve sitemap.xml for web crawlers."""
    base_url = settings.BASE_URL.rstrip('/')

    # Public routes that should be indexed by search engines
    # Excluding protected routes and dynamic routes with IDs
    public_routes = [
        "/",
        "/login",
        "/register",
        "/terms",
        "/privacy",
        "/help",
        "/help/creating-conversations",
        "/help/inviting-participants",
        "/help/responding",
        "/help/closing-conversations",
        "/help/analysis",
        "/help/follow-ups",
        "/help/recurring-conversations",
        "/help/organizations",
    ]

    # Generate sitemap XML
    sitemap_xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    sitemap_xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    # Use current date for lastmod
    lastmod = datetime.now().strftime('%Y-%m-%d')

    for route in public_routes:
        sitemap_xml += '  <url>\n'
        sitemap_xml += f'    <loc>{base_url}{route}</loc>\n'
        sitemap_xml += f'    <lastmod>{lastmod}</lastmod>\n'
        sitemap_xml += '    <changefreq>weekly</changefreq>\n'
        sitemap_xml += '    <priority>0.8</priority>\n'
        sitemap_xml += '  </url>\n'

    sitemap_xml += '</urlset>'

    return Response(content=sitemap_xml, media_type="application/xml")


@app.get("/robots.txt")
async def robots():
    """Generate and serve robots.txt for web crawlers."""
    base_url = settings.BASE_URL.rstrip('/')

    robots_txt = "User-agent: *\n"
    robots_txt += "Allow: /\n"
    robots_txt += "Disallow: /api/\n"
    robots_txt += "Disallow: /dashboard\n"
    robots_txt += "Disallow: /conversations/\n"
    robots_txt += "Disallow: /organizations/\n"
    robots_txt += "Disallow: /adminportal\n"
    robots_txt += "Disallow: /auth/\n"
    robots_txt += "\n"
    robots_txt += f"Sitemap: {base_url}/sitemap.xml\n"

    return Response(content=robots_txt, media_type="text/plain")

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

    # Serve Google verification file
    @app.get("/google40bd8cd1e724b4c9.html")
    async def google_verification():
        """Serve Google site verification file."""
        verification_path = os.path.join(static_dir, "google40bd8cd1e724b4c9.html")
        if os.path.exists(verification_path):
            return FileResponse(verification_path, media_type="text/html")
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
        # Don't handle API routes, health, sitemap, robots.txt, or Google verification
        if full_path.startswith("api/") or full_path in ["health", "sitemap.xml", "robots.txt", "google40bd8cd1e724b4c9.html"]:
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
