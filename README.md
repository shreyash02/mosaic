# Mosaic

> Anonymous feedback collection with AI-powered insights

Mosaic is a platform for collecting anonymous feedback with configurable privacy levels, using LLMs to synthesize responses into thematic insights. Users can create time-bounded conversations with invite codes, collect responses with varying anonymity levels, and generate AI-powered analysis using embedding-based semantic clustering.

## Features

- **Anonymous Feedback Collection** - Configurable anonymity levels (fully anonymous, platform-tracked, revealable)
- **Smart Analysis** - Embedding-based clustering with Claude AI for theme extraction
- **Time-Bounded Sessions** - Auto-close with timers or manual control
- **Flexible Access** - Invite code-based participation
- **Organizations** - Optional grouping for teams (Phase 2)

## Architecture

### Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: React + TypeScript + Vite
- **Database**: PostgreSQL
- **Embeddings**: OpenAI text-embedding-3-small
- **Clustering**: scikit-learn (DBSCAN)
- **LLM**: Claude Sonnet 3.5
- **Deployment**: fly.io (MVP)

### Project Structure

```
mosaic/
├── backend/               # FastAPI application
│   ├── app/
│   │   ├── core/         # Configuration, database, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   │   ├── embeddings/  # OpenAI embedding generation
│   │   │   └── llm/         # Claude analysis
│   │   └── utils/        # Utilities
│   ├── alembic/          # Database migrations
│   └── tests/            # Tests
├── frontend/             # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/     # API client
│   │   ├── hooks/
│   │   ├── types/
│   │   └── utils/
│   └── public/
└── docs/                 # Documentation
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+
- Docker & Docker Compose (optional, recommended)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mosaic
   ```

2. **Set up environment variables**
   ```bash
   cp backend/.env.example backend/.env
   ```

   Edit `backend/.env` and add your API keys:
   ```
   DATABASE_URL=postgresql://mosaic:mosaic@localhost:5432/mosaic
   SECRET_KEY=<generate-a-secret-key>
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...
   ```

### Running with Docker (Recommended)

```bash
# Start all services
make dev

# Or manually:
docker-compose up
```

The services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Running Locally

#### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Database Migrations

```bash
# Create a new migration
cd backend
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## Development

### Available Commands

```bash
make help          # Show all available commands
make install       # Install dependencies
make dev           # Start development environment
make stop          # Stop all services
make clean         # Clean up containers and volumes
make migrate       # Run database migrations
make db-reset      # Reset database
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Design Documents

- [Design Decisions](docs/DESIGN_DECISIONS.md) - Key architectural decisions
- [System Design](docs/SYSTEM_DESIGN.md) - Detailed system architecture
- [LLM Analysis Approach](docs/LLM_ANALYSIS_APPROACH.md) - Embedding-based clustering implementation
- [Embedding Feasibility](docs/EMBEDDING_CLUSTERING_FEASIBILITY.md) - Feasibility analysis

See [docs/](docs/) for complete documentation.

## Roadmap

### Phase 1: Core MVP ✅ (In Progress)
- [ ] User authentication (register, login, JWT refresh)
- [ ] Conversation CRUD (create, activate, close)
- [ ] Single question support
- [ ] Text-only responses
- [ ] Platform-tracked anonymity level
- [ ] Manual close only
- [ ] LLM analysis with embeddings + Claude
- [ ] Results access: invite code holders

### Phase 2: Enhanced Features
- [ ] Multi-question support
- [ ] Auto-close timer + background jobs
- [ ] All three anonymity levels
- [ ] Public results access
- [ ] Organizations support

### Phase 3: Advanced Features
- [ ] Ratings and polls
- [ ] Real-time response count
- [ ] Analysis regeneration
- [ ] Export results (PDF, CSV)
- [ ] Analytics dashboard

## Contributing

This is currently a private project. Contribution guidelines will be added later.

## License

Proprietary - All rights reserved

## Support

For questions or issues, please contact the development team.
