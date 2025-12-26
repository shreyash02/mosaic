# Mosaic - System Design

## Overview

Mosaic is a platform for collecting anonymous opinions or responses to questions/polls with configurable privacy levels, using LLMs to synthesize responses into thematic insights. Users can create time-bounded conversations with invite codes, collect responses with varying anonymity levels, and generate AI-powered analysis.

---

## Architecture

### High-Level Components

```
┌─────────────┐
│   Frontend  │ (React)
│   Web App   │
└──────┬──────┘
       │
       │ HTTP/REST
       │
┌──────▼──────────────────────────────────┐
│      Backend API (FastAPI)              │
│                                          │
│  Routes:                                 │
│  - /auth (registration, login, tokens)  │
│  - /conversations (CRUD, state mgmt)    │
│  - /responses (submission, retrieval)   │
│  - /analysis (LLM analysis)             │
│  - /organizations (org management)      │
│                                          │
│  Services (internal modules):           │
│  - auth_service.py                      │
│  - conversation_service.py              │
│  - response_service.py                  │
│  - analysis_service.py                  │
│  - org_service.py                       │
│                                          │
└──────┬───────────────────┬───────────────┘
       │                   │
       │                   │
┌──────▼──────┐    ┌───────▼────────┐    ┌─────────────────┐
│  Postgres   │    │  Background    │    │   LLM Provider  │
│  Database   │    │  Worker        │    │  (Claude/GPT)   │
│             │    │  (APScheduler) │    └─────────────────┘
└─────────────┘    │  - Timers      │
                   │  - Analysis    │
                   └────────────────┘
```

### State Machine: Conversation Lifecycle

```
DRAFT → ACTIVE → CLOSED → ANALYZED → (DELETED)
  │       │         │
  │       │         └──> EXTENDED (back to ACTIVE)
  │       │
  │       └──> CLOSED (manual early close)
  │
  └──> DELETED (draft never activated)

States:
- DRAFT: Created but not yet activated (optional)
- ACTIVE: Accepting responses, timer running
- CLOSED: No longer accepting responses, pending analysis
- ANALYZED: LLM analysis complete, results available
- DELETED: Soft-deleted (retain for audit)
```

---

## Database Schema

### Core Tables

#### `users`
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `organizations`
```sql
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### `organization_members`
```sql
CREATE TABLE organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- admin, member
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);
```

#### `conversations`
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ownership
    creator_id UUID REFERENCES users(id) NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    -- Basic info
    title VARCHAR(500) NOT NULL,
    description TEXT,

    -- Invite & access
    invite_code VARCHAR(50) UNIQUE NOT NULL,

    -- Configuration
    anonymity_level VARCHAR(50) NOT NULL,
        -- 'fully_anonymous', 'platform_tracked', 'revealable'
    max_response_length INTEGER DEFAULT 10000,
    results_access VARCHAR(50) NOT NULL,
        -- 'invite_code_holders', 'public_link'
    auto_analyze BOOLEAN DEFAULT FALSE,
        -- if true, trigger analysis automatically when conversation closes
        -- if false, require manual trigger via POST /api/conversations/:id/analyze

    -- Timing
    auto_close_at TIMESTAMP,
    manual_close_enabled BOOLEAN DEFAULT TRUE,
    time_extension_enabled BOOLEAN DEFAULT TRUE,

    -- State
    state VARCHAR(50) DEFAULT 'draft',
        -- 'draft', 'active', 'closed', 'analyzed', 'deleted'
    activated_at TIMESTAMP,
    closed_at TIMESTAMP,
    analyzed_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_invite_code ON conversations(invite_code);
CREATE INDEX idx_conversations_creator ON conversations(creator_id);
CREATE INDEX idx_conversations_state ON conversations(state);
```

#### `questions`
```sql
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'text',
        -- 'text', 'rating', 'single_choice', 'multiple_choice' (future)
    question_order INTEGER NOT NULL,

    -- For future rating/poll support
    options JSONB, -- [{label: "Option 1", value: 1}, ...]

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(conversation_id, question_order)
);
```

#### `responses`
```sql
CREATE TABLE responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE,

    -- Response content
    response_text TEXT,
    response_data JSONB, -- for structured responses (ratings, polls)

    -- Anonymity handling
    anonymity_level VARCHAR(50) NOT NULL,
        -- mirrors the conversation's anonymity_level at submission time

    -- Optional tracking (ONLY if anonymity_level != 'fully_anonymous')
    -- This field is NULL for fully_anonymous responses
    participant_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- For fully_anonymous: unique invite code per participant
    -- Each participant gets a unique code, used once
    invite_code_used VARCHAR(100),

    -- Consent for revealing (only for 'revealable' anonymity_level)
    reveal_consent BOOLEAN DEFAULT FALSE,

    submitted_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_responses_conversation ON responses(conversation_id);
CREATE INDEX idx_responses_participant ON responses(participant_id);
CREATE INDEX idx_responses_invite_code ON responses(invite_code_used);
```

#### `analyses`
```sql
CREATE TABLE analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

    -- Analysis results
    overall_summary TEXT,
    themes JSONB,
        -- [
        --   {
        --     "theme": "Communication",
        --     "frequency": 15,
        --     "clusters": [
        --       {"sentiment": "positive", "summary": "...", "count": 8},
        --       {"sentiment": "negative", "summary": "...", "count": 5},
        --       {"sentiment": "neutral", "summary": "...", "count": 2}
        --     ]
        --   },
        --   ...
        -- ]

    -- Metadata
    embedding_provider VARCHAR(50), -- 'openai'
    embedding_model VARCHAR(100), -- 'text-embedding-3-small'
    clustering_algorithm VARCHAR(50), -- 'dbscan'
    llm_provider VARCHAR(50), -- 'claude'
    llm_model VARCHAR(100), -- 'claude-3-5-sonnet-20241022'
    total_responses_analyzed INTEGER,
    num_clusters_found INTEGER,
    analysis_duration_ms INTEGER,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_analyses_conversation ON analyses(conversation_id);
```

#### `invite_codes`
```sql
-- Track generated invite codes for 'fully_anonymous' mode
-- Each participant gets a unique code
CREATE TABLE invite_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,

    -- Unique code for this participant
    code VARCHAR(100) UNIQUE NOT NULL,

    -- Track usage
    is_used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_invite_codes_conversation ON invite_codes(conversation_id);
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
```

---

## API Design

### Authentication Endpoints

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

### Conversation Endpoints

```
POST   /api/conversations                    # Create conversation (auth required)
GET    /api/conversations                    # List user's conversations (auth required)
GET    /api/conversations/:id                # Get conversation details (auth or invite code)
PATCH  /api/conversations/:id                # Update conversation (auth, owner only)
DELETE /api/conversations/:id                # Soft delete (auth, owner only)

POST   /api/conversations/:id/activate       # Activate conversation, start timer
POST   /api/conversations/:id/close          # Manual close
POST   /api/conversations/:id/extend         # Extend time window

# For fully_anonymous: generate participant invite codes
POST   /api/conversations/:id/invite-codes   # Generate N unique codes (auth, owner only)
GET    /api/conversations/:id/invite-codes   # List generated codes & usage (auth, owner only)
```

### Response Endpoints

```
POST   /api/conversations/:invite_code/responses    # Submit response (may require auth based on anonymity level)
GET    /api/conversations/:id/responses             # Get responses (owner only, after closed)
```

### Analysis Endpoints

```
POST   /api/conversations/:id/analyze        # Trigger LLM analysis (auth, owner only)
GET    /api/conversations/:id/analysis       # Get analysis results (based on results_access config)
```

### Organization Endpoints

```
POST   /api/organizations                      # Create organization (auth required)
GET    /api/organizations                      # List user's organizations
GET    /api/organizations/:id                  # Get organization details
PATCH  /api/organizations/:id                  # Update organization
DELETE /api/organizations/:id                  # Delete organization

POST   /api/organizations/:id/members          # Add member
DELETE /api/organizations/:id/members/:userId  # Remove member
GET    /api/organizations/:id/conversations    # List conversations in org
```

---

## Key Flows

### 1. Conversation Creation Flow

```
1. User (authenticated) creates conversation via POST /api/conversations
   - Provide: title, description, questions, anonymity_level,
              auto_close_at, results_access, auto_analyze,
              organization_id (optional)

2. Backend:
   - Generate base invite_code (e.g., 8-char alphanumeric)
   - Create conversation record (state = 'draft')
   - Create question records
   - Return conversation details + invite_code

3. If anonymity_level = 'fully_anonymous':
   - User generates participant codes via POST /api/conversations/:id/invite-codes
   - Provide: count (number of participants expected)
   - Backend generates N unique codes, stores in invite_codes table
   - Return list of codes to distribute to participants

4. User activates conversation via POST /api/conversations/:id/activate
   - Backend sets state = 'active', activated_at = NOW()
   - If auto_close_at set, schedule background job to close conversation
```

### 2. Response Submission Flow

```
1. Participant visits URL with invite_code: /join/:invite_code

2. Frontend fetches conversation details via GET /api/conversations/:invite_code
   - Check if active, get questions, anonymity_level

3. Participant fills out responses

4. Submit via POST /api/conversations/:invite_code/responses
   {
     "responses": [
       {"question_id": "...", "response_text": "..."},
       {"question_id": "...", "response_text": "..."}
     ],
     "reveal_consent": true/false  // only for 'revealable' mode
   }

5. Backend:
   a. Verify conversation is in 'active' state

   b. Deduplication check:
      - If anonymity_level = 'fully_anonymous':
        * Validate invite_code exists in invite_codes table
        * Check if is_used = false
        * Reject if already used

      - If anonymity_level = 'platform_tracked' or 'revealable':
        * Require authentication
        * Check if participant_id already has response for this conversation
        * Reject if duplicate

   c. Create response records
      - For 'fully_anonymous':
        * participant_id = NULL
        * invite_code_used = invite_code
        * Update invite_codes: set is_used = true, used_at = NOW()
      - For 'platform_tracked':
        * participant_id = user_id
        * invite_code_used = NULL
      - For 'revealable':
        * participant_id = user_id
        * reveal_consent = value
        * invite_code_used = NULL

   d. Return success
```

### 3. Conversation Closure Flow

```
Auto-close:
1. Background job checks conversations where auto_close_at <= NOW()
2. Set state = 'closed', closed_at = NOW()
3. If auto_analyze = true, enqueue analysis job

Manual close:
1. Owner calls POST /api/conversations/:id/close
2. Backend sets state = 'closed', closed_at = NOW()
3. If auto_analyze = true, enqueue analysis job

Note: If auto_analyze = false, the conversation stays in 'closed' state
until owner manually triggers POST /api/conversations/:id/analyze
```

### 4. LLM Analysis Flow

```
Trigger Options:
a) Auto-triggered: If auto_analyze = true, triggered when conversation closes
b) Manual trigger: Owner calls POST /api/conversations/:id/analyze (any time after closure)

1. Analysis starts (via either trigger):

2. Backend Analysis Service:
   a. Fetch all responses for conversation

   b. Group responses by question

   c. For each question, call LLM with prompt:
      """
      Analyze the following responses to the question: "{question_text}"

      Responses:
      1. {response_text}
      2. {response_text}
      ...

      Task:
      - Identify common themes
      - For each theme, cluster responses by sentiment (positive/negative/neutral)
      - Count frequency of each theme
      - Order themes by frequency (most common first)
      - Provide a summary for each sentiment cluster within a theme

      Return JSON:
      {
        "themes": [
          {
            "theme": "Theme name",
            "frequency": 15,
            "clusters": [
              {"sentiment": "positive", "summary": "...", "count": 8},
              {"sentiment": "negative", "summary": "...", "count": 5}
            ]
          }
        ]
      }
      """

   d. Parse LLM response

   e. Generate overall_summary across all questions (second LLM call):
      """
      Based on the following thematic analysis across multiple questions,
      provide a 3-5 paragraph overall summary of key insights.

      {combined themes from all questions}
      """

   f. Store in analyses table

   g. Update conversation state = 'analyzed', analyzed_at = NOW()

3. Return analysis_id
```

### 5. Results Access Flow

```
1. Request GET /api/conversations/:id/analysis

2. Backend checks results_access config:

   - If 'invite_code_holders':
     * Require invite_code in header or query param
     * Verify invite_code matches conversation
     * Return analysis

   - If 'public_link':
     * No auth required
     * Return analysis (anyone with link can view)

3. If anonymity_level = 'revealable' AND reveal_consent = true:
   - Owner can see which users consented to reveal
   - Separate endpoint: GET /api/conversations/:id/responses/revealed
```

---

## Anonymity Implementation Details

### Three Anonymity Levels

#### 1. `fully_anonymous`
- No user authentication required for response submission
- Deduplication via unique invite codes per participant
- Facilitator generates N codes (one per expected participant)
- Each code can only be used once
- `participant_id` = NULL in responses table
- No way to link response to any user, even for platform

**Trade-off**: Requires knowing participant count upfront, but truly anonymous

**How it works**:
1. Facilitator creates conversation with `anonymity_level = 'fully_anonymous'`
2. Facilitator calls POST `/api/conversations/:id/invite-codes` with `count: 20`
3. Backend generates 20 unique codes and stores in `invite_codes` table
4. Facilitator distributes codes (email, Slack, etc.) - one per participant
5. Each participant uses their unique code once to submit response
6. Backend marks code as `is_used = true` after submission

#### 2. `platform_tracked`
- User must be authenticated to submit response
- Platform knows participant_id but does NOT reveal to facilitator
- Deduplication via participant_id (one response per user)
- Facilitator sees only aggregate analysis, never individual attribution

**Trade-off**: Platform has data, but users trust platform privacy

#### 3. `revealable`
- User must be authenticated to submit response
- User provides reveal_consent boolean when submitting
- If consent = true, facilitator can see participant_id after analysis
- If consent = false, treated like platform_tracked

**Trade-off**: Flexible, but requires explicit consent

### Unique Invite Code Generation (for fully_anonymous)

```python
import secrets
import string

def generate_unique_invite_code(length: int = 12) -> str:
    """
    Generate a cryptographically secure unique invite code.

    Format: XXXX-XXXX-XXXX (alphanumeric, case-insensitive)
    """
    alphabet = string.ascii_uppercase + string.digits
    code = ''.join(secrets.choice(alphabet) for _ in range(length))

    # Format with dashes for readability
    return f"{code[0:4]}-{code[4:8]}-{code[8:12]}"

# Example: "A3K9-P2M7-Q8R4"
```

---

## Background Jobs

### Timer Management

Use a background worker (e.g., APScheduler for MVP) to:

1. **Check for expired conversations**:
   - Every minute, query: `SELECT * FROM conversations WHERE state = 'active' AND auto_close_at <= NOW()`
   - For each:
     * Set state = 'closed', closed_at = NOW()
     * If auto_analyze = true, enqueue analysis job
     * If auto_analyze = false, wait for manual trigger

2. **Process analysis jobs**:
   - Background worker processes queued analysis jobs
   - Can be triggered either automatically (on close) or manually (via API)
   - Updates conversation state to 'analyzed' when complete

---

## LLM Analysis Architecture

We use **embedding-based semantic clustering** for accurate theme extraction:

### Analysis Pipeline

```
1. Generate Embeddings (OpenAI text-embedding-3-small)
   ↓
2. Cluster Similar Responses (DBSCAN)
   ↓
3. Analyze Each Cluster (Claude Sonnet)
   ↓
4. Generate Overall Summary (Claude Sonnet)
```

### Component Abstraction

```python
# Embedding Provider
class EmbeddingProvider(ABC):
    @abstractmethod
    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        pass

class OpenAIEmbeddingProvider(EmbeddingProvider):
    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        # Use OpenAI text-embedding-3-small
        pass

# Clustering
class ClusteringAlgorithm(ABC):
    @abstractmethod
    def cluster(self, embeddings: list[list[float]]) -> list[int]:
        pass

class DBSCANClustering(ClusteringAlgorithm):
    def cluster(self, embeddings: list[list[float]]) -> list[int]:
        # DBSCAN with cosine similarity
        pass

# LLM Provider (for summarization)
class LLMProvider(ABC):
    @abstractmethod
    async def analyze_cluster(self, responses: list[str], question: str) -> dict:
        """Analyze a cluster and extract theme, sentiment, summary."""
        pass

    @abstractmethod
    async def generate_summary(self, themes: list[dict]) -> str:
        """Generate overall summary from themes."""
        pass

class ClaudeProvider(LLMProvider):
    async def analyze_cluster(self, responses: list[str], question: str) -> dict:
        # Use Claude to name theme and determine sentiment
        pass

    async def generate_summary(self, themes: list[dict]) -> str:
        # Use Claude to create overall summary
        pass
```

**Why this approach:**
- Precise semantic clustering using embeddings
- Scalable to 10,000+ responses
- 90% cost savings at scale vs pure LLM
- Clean abstractions for future flexibility

See `LLM_ANALYSIS_APPROACH.md` for complete implementation details.

---

## Security Considerations

1. **Rate Limiting**: Apply rate limits on response submission to prevent spam
2. **Invite Code Brute Force**: Monitor failed invite code attempts
3. **SQL Injection**: Use parameterized queries (FastAPI/SQLAlchemy does this)
4. **XSS**: Sanitize user input (responses, container titles)
5. **CSRF**: Use CSRF tokens for state-changing operations
6. **Auth Token Security**: Use HTTP-only cookies for JWT storage
7. **HTTPS**: Enforce HTTPS in production (fly.io supports this)

---

## MVP Scope

### Phase 1: Core MVP (Single Service Architecture)
- [ ] User authentication (register, login, JWT refresh)
- [ ] Conversation CRUD (create, activate, close)
- [ ] Single question support (multi-question can wait)
- [ ] Text-only responses
- [ ] Single anonymity level: `platform_tracked` (simplest to implement)
- [ ] Manual close only (no timer)
- [ ] LLM analysis with Claude
- [ ] Results access: invite_code_holders only
- [ ] No organizations (can add later)
- [ ] Single FastAPI service with internal modules (not microservices)

### Phase 2: Enhanced Features
- [ ] Multi-question support
- [ ] Auto-close timer + background jobs (APScheduler)
- [ ] Time extension capability
- [ ] All three anonymity levels (especially `fully_anonymous` with unique codes)
- [ ] Public results access option
- [ ] Organizations support

### Phase 3: Advanced Features
- [ ] Ratings and polls
- [ ] Real-time response count
- [ ] Regenerate analysis with different prompts
- [ ] Export results (PDF, CSV)
- [ ] Analytics dashboard for creators

---

## Technology Stack Summary

| Component | Technology | Justification |
|-----------|------------|---------------|
| Frontend | React | Modern, component-based, large ecosystem |
| Backend | FastAPI (Python) | Fast, async, great for Python + LLMs |
| Database | PostgreSQL | Robust, JSONB support, good for MVP to scale |
| Embeddings | OpenAI text-embedding-3-small | Best price/performance, 1536 dims |
| Clustering | scikit-learn (DBSCAN) | Mature, automatic cluster detection |
| LLM Summarization | Claude Sonnet 3.5 | Superior reasoning for theme analysis |
| Auth | JWT | Stateless, scalable |
| Deployment | fly.io | Easy deployment, free tier for MVP |
| Background Jobs | APScheduler | Simple, sufficient for MVP |

---

## Next Steps

1. Set up monorepo structure (frontend + backend in single repo)
2. Initialize FastAPI backend with basic auth
3. Set up PostgreSQL database + migrations (Alembic)
4. Implement Phase 1 MVP features
5. Build React frontend
6. Integrate LLM analysis
7. Deploy to fly.io
8. Test with real users
9. Iterate based on feedback
