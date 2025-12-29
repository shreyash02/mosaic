# Configuration Guide

This project uses environment-specific configuration files for local development and production.

## Backend Configuration

### Local Development

1. Copy the example file:
   ```bash
   cd backend
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and fill in your values:
   - `DATABASE_URL`: Your local database connection string
   - `SECRET_KEY`: Generate with: `python -c "import secrets; print(secrets.token_urlsafe(32))"`
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - Other values as needed

3. Set the environment variable (optional, defaults to "local"):
   ```bash
   export ENVIRONMENT=local
   ```

### Production

1. Copy the example file:
   ```bash
   cd backend
   cp .env.production.example .env.production
   ```

2. Edit `.env.production` with your production values:
   - Update `BASE_URL` to your production domain
   - Update `CORS_ORIGINS` to your production frontend URL
   - Use strong, randomly generated `SECRET_KEY`
   - Update database and API keys

3. Set the environment variable:
   ```bash
   export ENVIRONMENT=production
   ```

**Note**: In production deployments (e.g., Fly.io), you typically set environment variables directly in the platform rather than using `.env.production` files. The config will still work with environment variables set directly.

## Frontend Configuration

### Local Development

1. Copy the example file:
   ```bash
   cd frontend
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` if needed (defaults are usually fine):
   - `VITE_API_URL`: Points to `http://localhost:8000/api` by default

Vite automatically loads `.env.local` in development mode.

### Production

1. Copy the example file:
   ```bash
   cd frontend
   cp .env.production.example .env.production
   ```

2. Edit `.env.production`:
   - `VITE_API_URL`: Use `/api` if frontend is served from same origin as backend
   - Or use full URL like `https://your-backend-domain.com/api` if different origin

Vite automatically loads `.env.production` when building for production (`npm run build`).

## Environment Variable Priority

The backend configuration loads environment variables in this order (highest priority first):
1. System environment variables
2. `.env.local` or `.env.production` (based on `ENVIRONMENT` variable)
3. `.env` (fallback)

The frontend uses Vite's environment variable loading:
- Development: `.env.local` → `.env`
- Production: `.env.production` → `.env`

## Security Notes

- Never commit `.env`, `.env.local`, or `.env.production` files to version control
- The `.env*.example` files are safe to commit as they contain no secrets
- Always use strong, randomly generated secret keys in production
- Rotate API keys regularly
