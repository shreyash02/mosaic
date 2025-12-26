# Mosaic - Project Structure

## Directory Layout

```
mosaic/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── core/              # Core functionality
│   │   │   ├── __init__.py
│   │   │   ├── config.py      # Settings & configuration
│   │   │   ├── database.py    # Database connection
│   │   │   └── security.py    # Auth & password hashing
│   │   ├── models/            # SQLAlchemy models (TODO)
│   │   │   └── __init__.py
│   │   ├── schemas/           # Pydantic schemas (TODO)
│   │   │   └── __init__.py
│   │   ├── routes/            # API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── auth.py        # Auth endpoints (placeholders)
│   │   │   ├── conversations.py # Conversation CRUD
│   │   │   ├── responses.py   # Response submission
│   │   │   ├── analysis.py    # LLM analysis
│   │   │   └── organizations.py # Org management (Phase 2)
│   │   ├── services/          # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── embeddings/    # OpenAI embedding generation (TODO)
│   │   │   │   └── __init__.py
│   │   │   └── llm/           # Claude analysis (TODO)
│   │   │       └── __init__.py
│   │   ├── utils/             # Utilities (TODO)
│   │   │   └── __init__.py
│   │   ├── __init__.py
│   │   └── main.py            # FastAPI app entry point
│   ├── alembic/               # Database migrations
│   │   ├── versions/          # Migration files
│   │   │   └── .gitkeep
│   │   ├── env.py             # Alembic environment
│   │   └── script.py.mako     # Migration template
│   ├── tests/                 # Tests (TODO)
│   ├── .env.example           # Environment variables template
│   ├── alembic.ini            # Alembic configuration
│   ├── Dockerfile             # Backend Docker image
│   └── requirements.txt       # Python dependencies
│
├── frontend/                  # React Frontend
│   ├── src/
│   │   ├── components/        # React components (TODO)
│   │   ├── pages/             # Page components (TODO)
│   │   ├── services/          # API client (TODO)
│   │   ├── hooks/             # Custom hooks (TODO)
│   │   ├── types/             # TypeScript types (TODO)
│   │   ├── utils/             # Utilities (TODO)
│   │   ├── App.tsx            # Main App component
│   │   ├── App.css            # App styles
│   │   ├── main.tsx           # React entry point
│   │   └── index.css          # Global styles
│   ├── public/                # Static assets
│   ├── index.html             # HTML template
│   ├── package.json           # Node dependencies
│   ├── tsconfig.json          # TypeScript config
│   ├── tsconfig.node.json     # TypeScript config for Vite
│   ├── vite.config.ts         # Vite configuration
│   └── Dockerfile             # Frontend Docker image
│
├── docs/                      # Documentation
│   ├── README.md              # Documentation index
│   ├── DESIGN_DECISIONS.md    # Requirements & decisions
│   ├── SYSTEM_DESIGN.md       # Architecture & design
│   ├── LLM_ANALYSIS_APPROACH.md # Implementation details
│   └── EMBEDDING_CLUSTERING_FEASIBILITY.md # Feasibility analysis
│
├── .gitignore                 # Git ignore rules
├── docker-compose.yml         # Docker services orchestration
├── Makefile                   # Development commands
├── README.md                  # Main project README
├── QUICKSTART.md              # Quick start guide
└── PROJECT_STRUCTURE.md       # This file
```

## Files Overview

### Configuration Files

| File | Purpose |
|------|---------|
| `backend/.env.example` | Environment variables template |
| `backend/alembic.ini` | Database migration configuration |
| `backend/requirements.txt` | Python dependencies |
| `frontend/package.json` | Node.js dependencies |
| `frontend/vite.config.ts` | Vite bundler configuration |
| `frontend/tsconfig.json` | TypeScript compiler configuration |
| `docker-compose.yml` | Multi-container Docker setup |
| `Makefile` | Development workflow commands |

### Application Entry Points

| File | Purpose |
|------|---------|
| `backend/app/main.py` | FastAPI application |
| `frontend/src/main.tsx` | React application |
| `frontend/index.html` | HTML template |

### Core Backend Modules

| Module | Status | Purpose |
|--------|--------|---------|
| `app/core/config.py` | ✅ Complete | Settings & environment variables |
| `app/core/database.py` | ✅ Complete | SQLAlchemy setup |
| `app/core/security.py` | ✅ Complete | JWT & password hashing |
| `app/routes/*.py` | 🟡 Placeholders | API endpoints (TODO: implement) |
| `app/models/` | ⚪ TODO | Database models |
| `app/schemas/` | ⚪ TODO | Pydantic validation schemas |
| `app/services/embeddings/` | ⚪ TODO | OpenAI embedding generation |
| `app/services/llm/` | ⚪ TODO | Claude analysis |

### Documentation

| File | Purpose |
|------|---------|
| `docs/DESIGN_DECISIONS.md` | User requirements & tech choices |
| `docs/SYSTEM_DESIGN.md` | Architecture, database schema, API design |
| `docs/LLM_ANALYSIS_APPROACH.md` | Embedding clustering implementation |
| `docs/EMBEDDING_CLUSTERING_FEASIBILITY.md` | Technical feasibility analysis |
| `README.md` | Project overview & setup |
| `QUICKSTART.md` | 5-minute getting started guide |

## Implementation Status

### ✅ Complete
- [x] Project structure
- [x] Backend skeleton (FastAPI)
- [x] Frontend skeleton (React + Vite)
- [x] Docker setup
- [x] Configuration files
- [x] Database connection setup
- [x] Auth utilities (JWT, password hashing)
- [x] API route placeholders
- [x] Documentation

### 🟡 In Progress
- [ ] Database models (users, conversations, responses, etc.)
- [ ] Pydantic schemas
- [ ] API endpoint implementations
- [ ] LLM analysis service
- [ ] Embedding service
- [ ] Frontend components

### ⚪ TODO (Phase 1)
- [ ] User authentication flow
- [ ] Conversation management
- [ ] Response submission
- [ ] Analysis pipeline
- [ ] Frontend UI components
- [ ] Tests

## Next Steps

1. **Database Models** - Define SQLAlchemy models based on schema in docs/SYSTEM_DESIGN.md
2. **Pydantic Schemas** - Create request/response validation schemas
3. **Auth Implementation** - Complete auth routes with JWT
4. **Core API** - Implement conversation and response endpoints
5. **LLM Services** - Build embedding and analysis services
6. **Frontend** - Create React components and pages
7. **Testing** - Write unit and integration tests

## Development Workflow

1. Start services: `make dev` or `docker-compose up`
2. Make changes to code (auto-reload enabled)
3. Create migrations: `alembic revision --autogenerate -m "message"`
4. Apply migrations: `alembic upgrade head`
5. Run tests: `pytest` (backend) or `npm test` (frontend)
6. Commit changes

## Key Technologies

**Backend:**
- FastAPI - Web framework
- SQLAlchemy - ORM
- Alembic - Migrations
- PostgreSQL - Database
- OpenAI - Embeddings
- Anthropic (Claude) - LLM analysis
- scikit-learn - Clustering
- JWT - Authentication

**Frontend:**
- React 18 - UI framework
- TypeScript - Type safety
- Vite - Build tool
- React Router - Routing
- Axios - HTTP client

**DevOps:**
- Docker - Containerization
- Docker Compose - Multi-container orchestration
- Make - Task automation
