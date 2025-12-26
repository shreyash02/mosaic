# Mosaic - Quick Start Guide

Get Mosaic up and running in 5 minutes!

## Prerequisites

- Docker & Docker Compose installed
- OpenAI API key
- Anthropic (Claude) API key

## Setup

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd mosaic

# Copy environment file
cp backend/.env.example backend/.env
```

### 2. Add API Keys

Edit `backend/.env` and add your keys:

```bash
# Required: Generate a secret key (or use: openssl rand -hex 32)
SECRET_KEY=your-secret-key-here

# Required: OpenAI for embeddings
OPENAI_API_KEY=sk-...

# Required: Claude for analysis
ANTHROPIC_API_KEY=sk-ant-...

# Database (default is fine for local development)
DATABASE_URL=postgresql://mosaic:mosaic@postgres:5432/mosaic
```

### 3. Start the Application

```bash
# Start all services (PostgreSQL, Backend, Frontend)
docker-compose up
```

Wait for services to start. You'll see:
- Backend: `Uvicorn running on http://0.0.0.0:8000`
- Frontend: `Local: http://localhost:3000`

### 4. Access the Application

Open your browser:
- **Frontend**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## What's Next?

### Create Your First Conversation

1. **Register** at http://localhost:3000/register
2. **Login** with your credentials
3. **Create a Conversation**:
   - Title: "Sprint Retrospective"
   - Question: "What went well this sprint?"
   - Anonymity: Platform-tracked (MVP default)
4. **Activate** the conversation
5. **Share** the invite code with participants
6. **Collect** responses
7. **Close** and **Analyze** to see AI-generated themes!

### Using the API

```bash
# Register a user
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword",
    "full_name": "John Doe"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securepassword"
  }'

# Use the returned access_token for authenticated requests
```

## Development Workflow

### Making Changes

```bash
# Backend changes auto-reload (FastAPI --reload)
# Edit files in backend/app/

# Frontend changes auto-reload (Vite HMR)
# Edit files in frontend/src/
```

### Database Migrations

```bash
# After changing models, create a migration
docker-compose exec backend alembic revision --autogenerate -m "Add new field"

# Apply migration
docker-compose exec backend alembic upgrade head
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

## Common Commands

```bash
# Stop services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Rebuild after dependency changes
docker-compose up --build

# Database shell
docker-compose exec postgres psql -U mosaic -d mosaic

# Backend shell
docker-compose exec backend bash

# Frontend shell
docker-compose exec frontend sh
```

## Troubleshooting

### Port Already in Use

If ports 3000, 5432, or 8000 are in use:

```bash
# Find process using port
lsof -i :8000

# Kill process or change port in docker-compose.yml
```

### Database Connection Issues

```bash
# Reset database
docker-compose down -v
docker-compose up postgres
# Wait for postgres to be ready, then:
docker-compose exec backend alembic upgrade head
docker-compose up backend frontend
```

### Module Not Found Errors

```bash
# Rebuild containers
docker-compose down
docker-compose up --build
```

## Next Steps

- Read [README.md](README.md) for full documentation
- Review [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) for architecture
- Check [docs/LLM_ANALYSIS_APPROACH.md](docs/LLM_ANALYSIS_APPROACH.md) for analysis details

## Need Help?

- Check logs: `docker-compose logs -f`
- Review [docs/](docs/) for detailed documentation
- Ensure API keys are correctly set in `.env`

Happy coding! 🎨
