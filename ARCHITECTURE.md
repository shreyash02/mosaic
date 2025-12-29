# Mosaic - System Architecture

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Database Schema](#database-schema)
4. [API Architecture](#api-architecture)
5. [Authentication & Authorization](#authentication--authorization)
6. [Frontend Architecture](#frontend-architecture)
7. [AI Analysis Pipeline](#ai-analysis-pipeline)
8. [Access Control System](#access-control-system)
9. [Conversation Lifecycle](#conversation-lifecycle)
10. [Data Flow](#data-flow)

---

## System Overview

Mosaic is a three-tier web application for anonymous feedback collection and AI-powered analysis:

```
┌─────────────────┐
│  React Frontend │ (TypeScript + Vite)
│   Port 5173     │
└────────┬────────┘
         │ REST API (Axios)
         │
┌────────▼────────┐
│  FastAPI Backend│ (Python 3.13)
│   Port 8000     │
└────────┬────────┘
         │ SQLAlchemy ORM
         │
┌────────▼────────┐      ┌──────────────┐      ┌──────────────┐
│   PostgreSQL    │      │  OpenAI API  │      │ Anthropic API│
│  Database       │      │  (Embeddings)│      │   (Claude)   │
└─────────────────┘      └──────────────┘      └──────────────┘
```

**Key Technologies:**
- **Frontend**: React 18, TypeScript, React Router v6, Axios, Context API
- **Backend**: FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic
- **Database**: PostgreSQL 16+
- **Authentication**: JWT (access + refresh tokens), OAuth 2.0 (Google)
- **AI/ML**: OpenAI text-embedding-3-small, DBSCAN clustering, Anthropic Claude Sonnet 4.5
- **Email**: SMTP (configurable)

---

## Architecture Diagram

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Creator UI  │  │Participant UI│  │  Admin UI    │       │
│  │  (Auth Req.) │  │ (Anonymous)  │  │ (Admin Auth) │       │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────────┐
│                      API GATEWAY LAYER                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         FastAPI Routes + Middleware                    │  │
│  │  - CORS Middleware                                     │  │
│  │  - JWT Authentication Middleware                       │  │
│  │  - Request Validation (Pydantic)                       │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────┐
│                     BUSINESS LOGIC LAYER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Auth Service │  │ Conversation │  │   Analysis   │       │
│  │              │  │   Service    │  │   Service    │       │
│  │ - JWT Token  │  │ - CRUD Ops   │  │ - Embeddings │       │
│  │ - OAuth      │  │ - State Mgmt │  │ - Clustering │       │
│  │ - Refresh    │  │ - Access Ctrl│  │ - LLM Summ.  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Response    │  │  Invitation  │  │    Admin     │       │
│  │  Service     │  │   Service    │  │   Service    │       │
│  │              │  │              │  │              │       │
│  │ - Submit     │  │ - Email Send │  │ - User Mgmt  │       │
│  │ - Validate   │  │ - Code Gen   │  │ - Conv Mgmt  │       │
│  │ - Stats      │  │ - Track      │  │ - Resp Mgmt  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└───────────────────────────────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────┐
│                      DATA ACCESS LAYER                        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              SQLAlchemy ORM Models                     │  │
│  │  - User, Conversation, Question, Response              │  │
│  │  - ParticipantCode, ConversationInvitation             │  │
│  │  - Analysis                                            │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────┐
│                       PERSISTENCE LAYER                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  PostgreSQL Database                   │  │
│  │  - ACID Transactions                                   │  │
│  │  - Relational Integrity (Foreign Keys)                 │  │
│  │  - Indexes for Performance                             │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  OpenAI API  │  │Anthropic API │  │  Google OAuth│       │
│  │ (Embeddings) │  │   (Claude)   │  │   Identity   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                │
│  ┌──────────────┐                                             │
│  │  SMTP Server │                                             │
│  │   (Email)    │                                             │
│  └──────────────┘                                             │
└───────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐
│      users      │
│─────────────────│
│ id (PK)         │───┐
│ email           │   │
│ full_name       │   │
│ hashed_password │   │
│ created_at      │   │
│ updated_at      │   │
└─────────────────┘   │
                      │
                      │ 1:N (creator_id)
                      │
                      ▼
            ┌─────────────────────┐
            │   conversations     │
            │─────────────────────│
            │ id (PK)             │───┐
            │ creator_id (FK)     │   │
            │ organization_id     │   │
            │ title               │   │
            │ description         │   │
            │ anonymity_level     │   │
            │ results_access      │   │
            │ invite_only         │   │
            │ access_code (UNIQUE)│   │
            │ state               │   │
            │ auto_analyze        │   │
            │ max_response_length │   │
            │ duration_minutes    │   │
            │ scheduled_activate  │   │
            │ auto_close_at       │   │
            │ manual_close_enabled│   │
            │ time_extension_enab │   │
            │ timezone            │   │
            │ activated_at        │   │
            │ closed_at           │   │
            │ analyzed_at         │   │
            │ created_at          │   │
            │ updated_at          │   │
            └─────────────────────┘   │
                      │               │
                      │ 1:N           │ 1:N
                      │               │
        ┌─────────────┴────┐          │
        ▼                  ▼          │
┌─────────────────┐  ┌──────────────────────┐
│    questions    │  │  participant_codes   │
│─────────────────│  │──────────────────────│
│ id (PK)         │  │ id (PK)              │
│ conversation_id │  │ conversation_id (FK) │
│ question_text   │  │ participant_code     │
│ question_type   │  │ is_used              │
│ question_order  │  │ used_at              │
│ options         │  │ created_at           │
│ created_at      │  └──────────────────────┘
└─────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────┐
│    responses    │
│─────────────────│
│ id (PK)         │
│ conversation_id │
│ question_id (FK)│
│ participant_id  │
│ response_text   │
│ response_data   │
│ anonymity_level │
│ reveal_consent  │
│ submitted_at    │
└─────────────────┘

┌──────────────────────────┐
│ conversation_invitations │
│──────────────────────────│
│ id (PK)                  │
│ conversation_id (FK)     │───┐
│ email                    │   │
│ invited_by_id (FK)       │   │ 1:N
│ invited_user_id (FK)     │   │
│ invitation_token         │   │
│ is_accepted              │   │
│ accepted_at              │   │
│ created_at               │   │
│ expires_at               │   │
└──────────────────────────┘   │
                               │
                               │ 1:1
                               │
                               ▼
                    ┌─────────────────┐
                    │    analyses     │
                    │─────────────────│
                    │ id (PK)         │
                    │ conversation_id │
                    │ overall_summary │
                    │ themes (JSON)   │
                    │ embedding_prov  │
                    │ embedding_model │
                    │ clustering_algo │
                    │ llm_provider    │
                    │ llm_model       │
                    │ total_responses │
                    │ num_clusters    │
                    │ analysis_duration│
                    │ created_at      │
                    └─────────────────┘
```

### Table Specifications

#### `users`
- **Purpose**: Store registered user accounts
- **Key Columns**:
  - `id`: UUID primary key
  - `email`: Unique, indexed, required
  - `hashed_password`: bcrypt hash (nullable for OAuth users)
  - `google_id`: For OAuth integration (nullable)
- **Indexes**: `email`, `google_id`

#### `conversations`
- **Purpose**: Core entity for feedback collection sessions
- **Key Columns**:
  - `id`: UUID primary key
  - `creator_id`: FK to users (who created this)
  - `access_code`: 6-character unique code for participants
  - `state`: Enum (draft, active, closed, analyzed, deleted)
  - `anonymity_level`: Enum (fully_anonymous, platform_tracked, revealable)
  - `invite_only`: Boolean (requires participant code or email invitation)
  - `duration_minutes`: Auto-close after this duration (nullable)
  - `timezone`: IANA timezone for scheduling
- **State Machine**: draft → active → closed → analyzed → deleted
- **Indexes**: `access_code` (unique), `creator_id`, `state`

#### `questions`
- **Purpose**: Questions within a conversation
- **Key Columns**:
  - `conversation_id`: FK to conversations
  - `question_order`: Integer for ordering
  - `question_type`: Default 'text', extensible for future (multiple choice, etc.)
  - `options`: JSONB for storing question options
- **Indexes**: `(conversation_id, question_order)`

#### `responses`
- **Purpose**: Participant responses to questions
- **Key Columns**:
  - `conversation_id`: FK to conversations (denormalized for query performance)
  - `question_id`: FK to questions
  - `participant_id`: UUID to group responses by participant (nullable for fully anonymous)
  - `response_text`: Text response
  - `response_data`: JSONB for structured data
  - `anonymity_level`: Captured at response time
  - `reveal_consent`: Whether participant consented to reveal identity
- **Indexes**: `conversation_id`, `question_id`, `participant_id`

#### `participant_codes`
- **Purpose**: One-time use codes for invite-only conversations
- **Key Columns**:
  - `conversation_id`: FK to conversations
  - `participant_code`: Unique 8-character code
  - `is_used`: Boolean flag
  - `used_at`: Timestamp of first use
- **Indexes**: `participant_code` (unique), `(conversation_id, is_used)`

#### `conversation_invitations`
- **Purpose**: Email-based invitations for invite-only conversations
- **Key Columns**:
  - `conversation_id`: FK to conversations
  - `email`: Email address of invitee
  - `invited_by_id`: FK to users (who sent the invite)
  - `invited_user_id`: FK to users if they're registered (nullable)
  - `invitation_token`: Unique token for acceptance link
  - `is_accepted`: Boolean acceptance status
  - `expires_at`: Optional expiration timestamp
- **Indexes**: `invitation_token` (unique), `(conversation_id, email)`

#### `analyses`
- **Purpose**: Store AI-generated analysis results
- **Key Columns**:
  - `conversation_id`: FK to conversations (unique - one analysis per conversation)
  - `overall_summary`: Text summary from Claude
  - `themes`: JSONB array of {theme, frequency, clusters: [{sentiment, summary, count}]}
  - `embedding_provider`, `embedding_model`: Track which AI service used
  - `llm_provider`, `llm_model`: Track LLM for reproducibility
  - `total_responses_analyzed`: Count for validation
  - `num_clusters_found`: DBSCAN cluster count
  - `analysis_duration_ms`: Performance metric
- **Indexes**: `conversation_id` (unique)

---

## API Architecture

### API Structure

```
/api
├── /auth
│   ├── POST   /register               - Create new user account
│   ├── POST   /login                  - Email/password login → JWT tokens
│   ├── GET    /me                     - Get current user (requires auth)
│   ├── POST   /refresh                - Refresh access token
│   ├── GET    /google/login           - Initiate Google OAuth flow
│   └── GET    /google/callback        - OAuth callback handler
│
├── /conversations
│   ├── POST   /                       - Create conversation (auth required)
│   ├── GET    /                       - List user's conversations (auth required)
│   ├── GET    /:id                    - Get conversation details (auth required)
│   ├── PATCH  /:id                    - Update conversation (auth required)
│   ├── DELETE /:id                    - Delete conversation (auth required)
│   │
│   ├── POST   /:id/activate           - Activate conversation (auth required)
│   ├── POST   /:id/close              - Close conversation (auth required)
│   ├── POST   /:id/extend             - Extend duration (auth required)
│   │
│   ├── POST   /:accessCode/validate   - Validate access code (public)
│   ├── POST   /:accessCode/validate-participant - Validate participant code (public)
│   ├── GET    /by-code/:accessCode    - Get conversation by code (public/session)
│   │
│   ├── POST   /:accessCode/responses  - Submit responses (public/session)
│   ├── GET    /:accessCode/responses/check - Check if user submitted (public)
│   ├── GET    /:id/responses          - Get all responses (auth required)
│   ├── GET    /:id/responses/stats    - Get response statistics (auth required)
│   │
│   ├── POST   /:id/analyze            - Trigger AI analysis (auth required)
│   ├── GET    /:id/analysis           - Get analysis results (auth required)
│   │
│   ├── POST   /:id/participant-codes  - Generate codes (auth required)
│   ├── GET    /:id/participant-codes  - List codes (auth required)
│   │
│   └── POST   /:id/invitations        - Send email invitations (auth required)
│       GET    /:id/invitations        - List invitations (auth required)
│       DELETE /:id/invitations/:invId - Delete invitation (auth required)
│
└── /admin
    ├── POST   /login                  - Admin login
    ├── GET    /users                  - List all users (admin only)
    ├── GET    /conversations          - List all conversations (admin only)
    └── GET    /responses              - List all responses (admin only)
```

### API Design Principles

1. **RESTful Conventions**: Resources mapped to HTTP verbs (GET, POST, PATCH, DELETE)
2. **Nested Routes**: Related resources nested under parent (e.g., `/conversations/:id/responses`)
3. **Public vs Protected**:
   - Public: `/conversations/:accessCode/validate`, `/conversations/:accessCode/responses`
   - Protected: All `/conversations` CRUD, analysis, invitations
   - Admin: All `/admin/*` endpoints
4. **Consistent Error Responses**:
   ```json
   {
     "detail": "Error message",
     "status_code": 400
   }
   ```
5. **Pydantic Validation**: All request/response bodies validated with Pydantic models

### Authentication Patterns

```python
# Public endpoint (no auth)
@router.post("/conversations/{access_code}/validate")
async def validate_code(access_code: str):
    # No dependency on get_current_user
    pass

# Protected endpoint (JWT required)
@router.get("/conversations")
async def list_conversations(current_user: User = Depends(get_current_user)):
    # current_user injected by dependency
    pass

# Session-based endpoint (optional auth)
@router.get("/conversations/by-code/{access_code}")
async def get_by_code(
    access_code: str,
    authorization: str | None = Header(default=None)
):
    # Can work with or without auth header
    pass

# Admin endpoint (admin role required)
@router.get("/admin/users")
async def list_users(admin_user: User = Depends(get_current_admin)):
    # Verifies admin credentials
    pass
```

---

## Authentication & Authorization

### JWT Token Flow

```
┌──────────┐                                    ┌──────────┐
│  Client  │                                    │  Server  │
└────┬─────┘                                    └────┬─────┘
     │                                                │
     │ POST /auth/login                              │
     │ {email, password}                             │
     ├──────────────────────────────────────────────►│
     │                                                │
     │                                        [Verify credentials]
     │                                        [Generate JWT tokens]
     │                                                │
     │ {access_token, refresh_token, token_type}     │
     │◄──────────────────────────────────────────────┤
     │                                                │
[Store tokens in localStorage]                       │
     │                                                │
     │ GET /conversations                            │
     │ Authorization: Bearer {access_token}          │
     ├──────────────────────────────────────────────►│
     │                                                │
     │                                     [Verify JWT signature]
     │                                     [Extract user from token]
     │                                                │
     │ {conversations: [...]}                        │
     │◄──────────────────────────────────────────────┤
     │                                                │
     │                                                │
     │ [access_token expires]                        │
     │                                                │
     │ GET /conversations/:id                        │
     │ Authorization: Bearer {expired_token}         │
     ├──────────────────────────────────────────────►│
     │                                                │
     │                                    [Token expired: 401]
     │                                                │
     │ 401 Unauthorized                              │
     │◄──────────────────────────────────────────────┤
     │                                                │
[Axios interceptor catches 401]                      │
     │                                                │
     │ POST /auth/refresh                            │
     │ {refresh_token}                               │
     ├──────────────────────────────────────────────►│
     │                                                │
     │                                    [Verify refresh token]
     │                                    [Generate new access token]
     │                                                │
     │ {access_token, refresh_token}                 │
     │◄──────────────────────────────────────────────┤
     │                                                │
[Update localStorage]                                │
[Retry original request]                             │
     │                                                │
     │ GET /conversations/:id (retry)                │
     │ Authorization: Bearer {new_access_token}      │
     ├──────────────────────────────────────────────►│
     │                                                │
     │ {conversation: {...}}                         │
     │◄──────────────────────────────────────────────┤
     │                                                │
```

### OAuth 2.0 Flow (Google)

```
┌──────────┐              ┌──────────┐              ┌──────────┐
│  Client  │              │  Server  │              │  Google  │
└────┬─────┘              └────┬─────┘              └────┬─────┘
     │                          │                          │
     │ Click "Sign in with Google"                        │
     ├─────────►│                                          │
     │          │                                          │
     │          │ Redirect to /api/auth/google/login      │
     │◄─────────┤                                          │
     │                                                     │
     │ Redirect to Google OAuth consent screen            │
     ├────────────────────────────────────────────────────►│
     │                                                     │
     │                              [User grants permission]
     │                                                     │
     │ Redirect to /api/auth/google/callback?code=XXX     │
     │◄────────────────────────────────────────────────────┤
     │                          │                          │
     │                          │ Exchange code for tokens │
     │                          ├─────────────────────────►│
     │                          │                          │
     │                          │ {access_token, id_token} │
     │                          │◄─────────────────────────┤
     │                          │                          │
     │                  [Verify ID token]                  │
     │                  [Get user info from Google]        │
     │                  [Create/update user in database]   │
     │                  [Generate JWT tokens]              │
     │                          │                          │
     │ Redirect to /auth/callback?access_token=...&refresh_token=...
     │◄─────────┤                                          │
     │                                                     │
[AuthContext detects tokens in URL]                       │
[Store in localStorage]                                   │
[Redirect to /dashboard]                                  │
     │                                                     │
```

### Authorization Levels

1. **Public Access**:
   - No authentication required
   - Access code validation
   - Response submission (with valid access code or participant code)
   - Endpoints: `/conversations/:accessCode/validate`, `/conversations/:accessCode/responses`

2. **User Access** (JWT required):
   - Create, read, update, delete own conversations
   - View own conversation responses and stats
   - Trigger analysis on own conversations
   - Endpoints: All `/conversations` CRUD operations

3. **Admin Access** (Admin JWT required):
   - View all users, conversations, responses
   - System-wide analytics and management
   - Endpoints: All `/admin/*` endpoints

4. **Session Access** (Temporary session token):
   - Issued when participant code is validated
   - Allows access to conversation questions for invite-only conversations
   - Limited to single conversation
   - Endpoint: `/conversations/by-code/:accessCode` with session token

---

## Frontend Architecture

### Component Hierarchy

```
App
├── AuthProvider (Context)
│   └── Router
│       ├── Header (Global Navigation)
│       │   ├── Logo/Brand
│       │   ├── Navigation Links (conditional on auth state)
│       │   └── User Menu (Login/Logout)
│       │
│       └── Routes
│           ├── HomePage
│           │   ├── Hero Section
│           │   ├── Features Section
│           │   └── CTA Section
│           │
│           ├── LoginPage
│           │   ├── Email/Password Form
│           │   ├── Google OAuth Button
│           │   └── Register Link
│           │
│           ├── RegisterPage
│           │   └── Registration Form
│           │
│           ├── ProtectedRoute (HOC)
│           │   ├── DashboardPage
│           │   │   ├── Conversation Grid
│           │   │   └── Create Conversation Button
│           │   │
│           │   ├── CreateConversationPage
│           │   │   ├── Basic Info Form
│           │   │   ├── Settings Form
│           │   │   └── Questions Builder
│           │   │
│           │   ├── EditConversationPage
│           │   │   └── [Similar to CreateConversationPage]
│           │   │
│           │   ├── ConversationDetailPage
│           │   │   ├── Conversation Info Panel
│           │   │   ├── Questions Panel
│           │   │   ├── Stats Panel
│           │   │   └── Actions Panel
│           │   │
│           │   ├── ManageInvitationsPage
│           │   │   ├── Invite Form
│           │   │   └── Invitations List
│           │   │
│           │   └── AnalysisPage
│           │       ├── Overall Summary
│           │       ├── Themes List
│           │       └── Metadata Panel
│           │
│           ├── JoinPage (Public)
│           │   ├── Access Code Form
│           │   ├── Participant Code Form (if invite-only)
│           │   └── Response Form
│           │
│           ├── TermsOfServicePage
│           ├── PrivacyPolicyPage
│           │
│           └── Admin Routes
│               ├── AdminPortalPage
│               ├── AdminUserDetailPage
│               └── AdminConversationDetailPage
```

### State Management Architecture

**Global State (React Context):**
```typescript
// AuthContext manages authentication state globally
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}
```

**Local State (React useState):**
- Each page component manages its own UI state
- Form inputs, loading states, error messages
- Modal visibility, selected items

**Data Fetching Pattern:**
```typescript
// Standard pattern across all pages
const [data, setData] = useState<DataType | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await api.getData();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, [dependencies]);
```

### Routing Strategy

```typescript
// Public routes - no authentication required
<Route path="/" element={<HomePage />} />
<Route path="/login" element={<LoginPage />} />
<Route path="/register" element={<RegisterPage />} />
<Route path="/join/:accessCode" element={<JoinPage />} />
<Route path="/terms" element={<TermsOfServicePage />} />
<Route path="/privacy" element={<PrivacyPolicyPage />} />

// OAuth callback route
<Route path="/auth/callback" element={<LoginPage />} />

// Protected routes - authentication required
<Route path="/dashboard" element={
  <ProtectedRoute>
    <DashboardPage />
  </ProtectedRoute>
} />

// Admin routes - admin authentication required
<Route path="/adminportal" element={<AdminPortalPage />} />
```

**ProtectedRoute Implementation:**
- Checks authentication state from AuthContext
- Redirects to login with return URL if not authenticated
- Preserves intended destination for post-login redirect

### API Communication Layer

**Axios Instance Configuration:**
```typescript
class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' }
    });

    // Request interceptor: Inject JWT token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor: Auto-refresh on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401 && !originalRequest._retry) {
          // Try to refresh token and retry
          // If refresh fails, redirect to login
        }
        return Promise.reject(error);
      }
    );
  }
}
```

---

## AI Analysis Pipeline

### Analysis Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    ANALYSIS TRIGGER                         │
│  User clicks "Run Analysis" on ConversationDetailPage       │
│  → POST /api/conversations/:id/analyze                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKGROUND TASK START                      │
│  FastAPI BackgroundTasks initiates async analysis          │
│  Returns 200 immediately to user                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              STEP 1: FETCH RESPONSES                        │
│  Query database for all responses to conversation          │
│  Filter: conversation_id = :id                              │
│  Extract: response_text fields                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          STEP 2: GENERATE EMBEDDINGS                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  For each response:                                  │  │
│  │    1. Call OpenAI API                                │  │
│  │       Model: text-embedding-3-small                  │  │
│  │       Input: response_text                           │  │
│  │    2. Receive 1536-dimensional vector                │  │
│  │    3. Store in numpy array                           │  │
│  └──────────────────────────────────────────────────────┘  │
│  Result: embeddings matrix (N x 1536)                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          STEP 3: COMPUTE DISTANCE MATRIX                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  from sklearn.metrics.pairwise import                │  │
│  │    cosine_similarity                                 │  │
│  │                                                       │  │
│  │  similarity_matrix = cosine_similarity(embeddings)   │  │
│  │  distance_matrix = 1 - similarity_matrix             │  │
│  └──────────────────────────────────────────────────────┘  │
│  Result: Pairwise cosine distances between all responses    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            STEP 4: DBSCAN CLUSTERING                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  from sklearn.cluster import DBSCAN                  │  │
│  │                                                       │  │
│  │  dbscan = DBSCAN(                                    │  │
│  │    eps=0.5,              # Distance threshold        │  │
│  │    min_samples=1,        # Min points per cluster    │  │
│  │    metric='precomputed'  # Use distance matrix       │  │
│  │  )                                                    │  │
│  │  cluster_labels = dbscan.fit_predict(distance_matrix)│  │
│  └──────────────────────────────────────────────────────┘  │
│  Result: Each response assigned to a cluster (or -1 = noise)│
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        STEP 5: GROUP RESPONSES BY CLUSTER                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  clusters = {}                                       │  │
│  │  for i, label in enumerate(cluster_labels):          │  │
│  │    if label not in clusters:                         │  │
│  │      clusters[label] = []                            │  │
│  │    clusters[label].append(responses[i].text)         │  │
│  └──────────────────────────────────────────────────────┘  │
│  Result: Dictionary mapping cluster_id → [responses]        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│      STEP 6: SUMMARIZE EACH CLUSTER WITH CLAUDE             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  For each cluster:                                   │  │
│  │    1. Build prompt:                                  │  │
│  │       "Analyze these responses, identify theme,      │  │
│  │        sentiment, provide summary"                   │  │
│  │    2. Call Anthropic API                             │  │
│  │       Model: claude-sonnet-4-5-20250929              │  │
│  │       Max tokens: 1000                               │  │
│  │    3. Parse JSON response:                           │  │
│  │       {                                              │  │
│  │         "theme": "string",                           │  │
│  │         "sentiment": "positive|neutral|negative",    │  │
│  │         "summary": "string"                          │  │
│  │       }                                              │  │
│  └──────────────────────────────────────────────────────┘  │
│  Result: List of {theme, sentiment, summary, count}         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│      STEP 7: AGGREGATE THEMES AND OVERALL SUMMARY           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Group clusters by theme                          │  │
│  │  2. Calculate theme frequencies                      │  │
│  │  3. Call Claude again for overall summary:           │  │
│  │     Input: All themes + sentiment clusters           │  │
│  │     Output: High-level summary of conversation       │  │
│  └──────────────────────────────────────────────────────┘  │
│  Result: {                                                  │
│    overall_summary: string,                                 │
│    themes: [                                                │
│      {                                                      │
│        theme: string,                                       │
│        frequency: number,                                   │
│        clusters: [                                          │
│          {sentiment: string, summary: string, count: number}│
│        ]                                                    │
│      }                                                      │
│    ]                                                        │
│  }                                                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            STEP 8: SAVE TO DATABASE                         │
│  Insert into analyses table:                                │
│    - conversation_id                                        │
│    - overall_summary                                        │
│    - themes (JSONB)                                         │
│    - embedding_provider: "openai"                           │
│    - embedding_model: "text-embedding-3-small"              │
│    - clustering_algorithm: "dbscan"                         │
│    - llm_provider: "anthropic"                              │
│    - llm_model: "claude-sonnet-4-5-20250929"                │
│    - total_responses_analyzed: N                            │
│    - num_clusters_found: K                                  │
│    - analysis_duration_ms: elapsed_time                     │
│  Update conversation.state = 'analyzed'                     │
│  Set conversation.analyzed_at = now()                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  ANALYSIS COMPLETE                          │
│  User can view results at /conversations/:id/analysis       │
└─────────────────────────────────────────────────────────────┘
```

### DBSCAN Parameter Rationale

- **eps=0.5**: Maximum distance between points in same cluster
  - Cosine distance of 0.5 means vectors have ~60° angle
  - Allows semantically similar (but not identical) responses to cluster
  - Too low: Every response is its own cluster
  - Too high: All responses collapse into one cluster

- **min_samples=1**: Minimum points to form a cluster
  - Allows single-response "clusters" (important for minority opinions)
  - DBSCAN still identifies outliers with label=-1

- **metric='precomputed'**: Use pre-computed distance matrix
  - Enables cosine distance (default would be Euclidean)
  - More appropriate for high-dimensional embeddings

### Claude Prompting Strategy

**Cluster Analysis Prompt:**
```
Analyze the following responses and provide:
1. A concise theme that captures the main idea
2. The overall sentiment (positive, neutral, or negative)
3. A brief summary of the key points

Responses:
{response_texts}

Return your analysis in this exact JSON format:
{
  "theme": "string",
  "sentiment": "positive|neutral|negative",
  "summary": "string"
}
```

**Overall Summary Prompt:**
```
Given these themes and sentiment clusters from a feedback conversation:

{themes_and_clusters}

Provide a comprehensive overall summary that:
1. Captures the main takeaways
2. Highlights areas of consensus and divergence
3. Identifies actionable insights

Return just the summary text (no JSON formatting).
```

---

## Access Control System

### Three-Layer Access Control

#### Layer 1: Conversation Access (Who Can Participate)

```
┌─────────────────────────────────────────────┐
│         invite_only = FALSE                 │
│  ┌───────────────────────────────────────┐ │
│  │  Public Access Mode                   │ │
│  │  - Anyone with access code can join   │ │
│  │  - No additional validation required  │ │
│  │  - Simplest mode for public feedback  │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│         invite_only = TRUE                  │
│  ┌───────────────────────────────────────┐ │
│  │  Invite-Only Mode                     │ │
│  │  Two validation methods:              │ │
│  │                                        │ │
│  │  1. Participant Code                  │ │
│  │     - Creator generates N codes       │ │
│  │     - Each code is one-time use       │ │
│  │     - Participant enters code         │ │
│  │     - Code marked as used             │ │
│  │     - Session token issued            │ │
│  │                                        │ │
│  │  2. Email Invitation                  │ │
│  │     - Creator sends invites by email  │ │
│  │     - Email contains unique token     │ │
│  │     - Recipient clicks link           │ │
│  │     - Token validates access          │ │
│  │     - Can track acceptance status     │ │
│  └───────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### Layer 2: Anonymity Level (How Participants Are Tracked)

```
┌──────────────────────────────────────────────────────────┐
│  anonymity_level = FULLY_ANONYMOUS                       │
│  ┌────────────────────────────────────────────────────┐ │
│  │  - No participant_id tracked                       │ │
│  │  - Cannot correlate responses from same person     │ │
│  │  - Maximum privacy for participants                │ │
│  │  - Use case: Sensitive topics, whistleblowing      │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  anonymity_level = PLATFORM_TRACKED                      │
│  ┌────────────────────────────────────────────────────┐ │
│  │  - Participant_id (UUID) tracked                   │ │
│  │  - Can group responses by participant              │ │
│  │  - Prevent duplicate submissions                   │ │
│  │  - Identity not revealed to creator                │ │
│  │  - Use case: Anonymous surveys with deduplication  │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  anonymity_level = REVEALABLE                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │  - Participant_id tracked                          │ │
│  │  - User can optionally reveal identity             │ │
│  │  - reveal_consent flag on response submission      │ │
│  │  - If consented, creator sees who responded        │ │
│  │  - Use case: Transparent feedback with opt-out     │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

#### Layer 3: Results Access (Who Can See Responses)

```
┌──────────────────────────────────────────────────────────┐
│  results_access = INVITE_CODE_HOLDERS                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │  - Only people with access code can view results   │ │
│  │  - Creator always has access                       │ │
│  │  - Participant can view after submitting           │ │
│  │  - Use case: Private team retrospectives           │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  results_access = PUBLIC_LINK                            │
│  ┌────────────────────────────────────────────────────┐ │
│  │  - Anyone with link can view results               │ │
│  │  - Shareable results URL                           │ │
│  │  - No authentication required to view              │ │
│  │  - Use case: Public polls, community feedback      │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### Access Control Matrix

| Scenario | invite_only | anonymity_level | results_access | Participant Experience |
|----------|-------------|-----------------|----------------|------------------------|
| Public Anonymous Poll | FALSE | FULLY_ANONYMOUS | PUBLIC_LINK | Anyone can join with code, no tracking, public results |
| Team Retro | TRUE | PLATFORM_TRACKED | INVITE_CODE_HOLDERS | Only invited, grouped responses, private results |
| Whistleblowing | TRUE | FULLY_ANONYMOUS | INVITE_CODE_HOLDERS | Requires participant code, no tracking, private |
| Public Survey | FALSE | PLATFORM_TRACKED | PUBLIC_LINK | Anyone can join, no duplicates, public results |
| Transparent Feedback | FALSE | REVEALABLE | PUBLIC_LINK | Anyone can join, opt-in identity reveal, public results |

### Validation Flow (Invite-Only)

```
Participant enters access code
         │
         ▼
┌──────────────────────┐
│ Validate access code │
│ (Is conversation     │
│  active?)            │
└──────┬───────────────┘
       │
       ▼
  ┌────────┐
  │Valid?  │
  └───┬────┘
      │ NO → Error: Invalid code
      │
      │ YES
      ▼
┌──────────────────────┐
│ Check invite_only    │
└──────┬───────────────┘
       │
       ▼
  ┌────────────┐
  │invite_only?│
  └─┬────────┬─┘
    │        │
   NO       YES
    │        │
    │        ▼
    │   ┌─────────────────────┐
    │   │ Require participant │
    │   │ code validation     │
    │   └─────────┬───────────┘
    │             │
    │             ▼
    │   Participant enters code
    │             │
    │             ▼
    │   ┌──────────────────────┐
    │   │ Query participant_   │
    │   │ codes table          │
    │   │ WHERE code = ? AND   │
    │   │ is_used = FALSE      │
    │   └──────────┬───────────┘
    │              │
    │              ▼
    │         ┌────────┐
    │         │Valid?  │
    │         └───┬────┘
    │             │ NO → Error: Invalid or used code
    │             │
    │             │ YES
    │             ▼
    │   ┌──────────────────────┐
    │   │ Mark code as used    │
    │   │ Generate session token│
    │   └──────────┬───────────┘
    │              │
    │              ▼
    │   Return session token
    │              │
    ▼              ▼
Show conversation questions
```

---

## Conversation Lifecycle

### State Machine

```
┌─────────┐
│  START  │
└────┬────┘
     │
     │ POST /conversations (create)
     │
     ▼
┌─────────┐
│  DRAFT  │ ◄──┐
└────┬────┘    │
     │         │ PATCH /conversations/:id (edit)
     │         │ (allowed only in DRAFT state)
     │         │
     │ POST /conversations/:id/activate
     │         │
     ▼         │
┌─────────┐   │
│ ACTIVE  │───┘
└────┬────┘
     │
     │ [Auto-close trigger OR Manual close]
     │ - duration_minutes elapsed
     │ - auto_close_at timestamp reached
     │ - POST /conversations/:id/close
     │
     ▼
┌─────────┐
│ CLOSED  │
└────┬────┘
     │
     │ [Auto-analyze if enabled OR Manual]
     │ - POST /conversations/:id/analyze
     │
     ▼
┌──────────┐
│ ANALYZED │
└────┬─────┘
     │
     │ DELETE /conversations/:id (soft delete)
     │
     ▼
┌─────────┐
│ DELETED │
└─────────┘
```

### State Transition Rules

#### DRAFT → ACTIVE
- **Trigger**: `POST /conversations/:id/activate`
- **Requirements**:
  - Current state must be DRAFT
  - At least one question must exist
  - User must be creator
- **Side Effects**:
  - Set `activated_at = now()`
  - If `duration_minutes` set: `auto_close_at = activated_at + duration_minutes`
  - If `scheduled_activate_at` provided: Schedule activation (not immediate)
  - If `auto_analyze = TRUE`: Set flag for automatic analysis after close

#### ACTIVE → CLOSED
- **Triggers**:
  1. **Manual**: `POST /conversations/:id/close` (if `manual_close_enabled = TRUE`)
  2. **Auto**: Background job checks `auto_close_at <= now()`
- **Requirements**:
  - Current state must be ACTIVE
  - For manual: `manual_close_enabled = TRUE`
- **Side Effects**:
  - Set `closed_at = now()`
  - If `auto_analyze = TRUE`: Trigger analysis automatically

#### CLOSED → ANALYZED
- **Trigger**: `POST /conversations/:id/analyze`
- **Requirements**:
  - Current state must be CLOSED
  - At least one response must exist
- **Side Effects**:
  - Run analysis pipeline (background task)
  - Create record in `analyses` table
  - Set `analyzed_at = now()`

#### Any State → DELETED
- **Trigger**: `DELETE /conversations/:id`
- **Requirements**:
  - User must be creator
- **Side Effects**:
  - Soft delete: Set `state = 'deleted'`
  - Responses, questions, invitations remain in database (for audit)

### Time-Based Features

#### Scheduled Activation
```python
# User creates conversation with scheduled_activate_at
conversation = {
  "state": "draft",
  "scheduled_activate_at": "2025-01-15T14:00:00Z",
  "timezone": "America/New_York"
}

# Background job (cron) runs every minute:
# SELECT * FROM conversations
# WHERE state = 'draft'
#   AND scheduled_activate_at <= now()
#   AND scheduled_activate_at IS NOT NULL

# For each matching conversation:
#   - Transition to ACTIVE
#   - Set activated_at = now()
#   - Calculate auto_close_at if duration_minutes set
```

#### Duration-Based Auto-Close
```python
# User activates conversation with duration_minutes = 60
POST /conversations/:id/activate
{
  "duration_minutes": 60
}

# Backend calculates:
auto_close_at = activated_at + timedelta(minutes=60)

# Background job runs every minute:
# SELECT * FROM conversations
# WHERE state = 'active'
#   AND auto_close_at <= now()
#   AND auto_close_at IS NOT NULL

# For each matching conversation:
#   - Transition to CLOSED
#   - Set closed_at = now()
#   - If auto_analyze = TRUE: trigger analysis
```

#### Time Extension
```python
# Conversation is ACTIVE and approaching auto_close_at
# Creator decides to extend by 2 hours
POST /conversations/:id/extend
{
  "additional_hours": 2
}

# Backend updates:
auto_close_at = auto_close_at + timedelta(hours=2)

# Requirements:
#   - time_extension_enabled = TRUE
#   - state = 'active'
```

### Participant Perspective

#### Joining a Conversation

```
DRAFT state:
  - Access code validation fails
  - Error: "Conversation not yet active"

ACTIVE state:
  - Access code validates successfully
  - If invite_only: Additional participant code required
  - Show questions and response form
  - Character count updates in real-time (max_response_length)

CLOSED state:
  - Access code validation fails
  - Error: "Conversation has closed"
  - If results_access = PUBLIC_LINK: Redirect to results

ANALYZED state:
  - Same as CLOSED
  - Results may now include AI analysis

DELETED state:
  - Access code validation fails
  - Error: "Conversation not found"
```

---

## Data Flow

### Create Conversation Flow

```
┌─────────┐                                    ┌──────────┐
│ Creator │                                    │  Server  │
└────┬────┘                                    └────┬─────┘
     │                                              │
     │ Fill form (title, questions, settings)      │
     │                                              │
     │ POST /conversations                          │
     │ {                                            │
     │   title: "Team Retro",                       │
     │   questions: [{text: "What went well?"}],    │
     │   anonymity_level: "platform_tracked",       │
     │   invite_only: true,                         │
     │   duration_minutes: 60                       │
     │ }                                            │
     ├─────────────────────────────────────────────►│
     │                                              │
     │                                     [Validate JWT]
     │                                     [Validate request body]
     │                                     [Generate access_code]
     │                                     [Create conversation record]
     │                                     [Create question records]
     │                                     [Set state = DRAFT]
     │                                              │
     │ {                                            │
     │   id: "uuid",                                │
     │   access_code: "ABC123",                     │
     │   state: "draft",                            │
     │   ...                                        │
     │ }                                            │
     │◄─────────────────────────────────────────────┤
     │                                              │
     │ Redirect to /conversations/:id              │
     │                                              │
```

### Activate Conversation Flow

```
┌─────────┐                                    ┌──────────┐
│ Creator │                                    │  Server  │
└────┬────┘                                    └────┬─────┘
     │                                              │
     │ POST /conversations/:id/activate             │
     │ {                                            │
     │   auto_close_at: "2025-01-15T15:00:00Z"      │
     │ }                                            │
     ├─────────────────────────────────────────────►│
     │                                              │
     │                                     [Validate JWT]
     │                                     [Check state = DRAFT]
     │                                     [Check user = creator]
     │                                     [Update state = ACTIVE]
     │                                     [Set activated_at = now()]
     │                                     [Set auto_close_at if provided]
     │                                              │
     │ {                                            │
     │   id: "uuid",                                │
     │   state: "active",                           │
     │   activated_at: "2025-01-15T14:00:00Z",      │
     │   auto_close_at: "2025-01-15T15:00:00Z"      │
     │ }                                            │
     │◄─────────────────────────────────────────────┤
     │                                              │
     │ Share access_code with participants         │
     │                                              │
```

### Submit Response Flow (Invite-Only)

```
┌──────────────┐                                ┌──────────┐
│ Participant  │                                │  Server  │
└──────┬───────┘                                └────┬─────┘
       │                                             │
       │ Navigate to /join/:accessCode              │
       │                                             │
       │ POST /conversations/:code/validate         │
       ├────────────────────────────────────────────►│
       │                                             │
       │                                    [Check state = ACTIVE]
       │                                    [Check invite_only]
       │                                             │
       │ {                                           │
       │   valid: true,                              │
       │   requires_participant_code: true           │
       │ }                                           │
       │◄────────────────────────────────────────────┤
       │                                             │
       │ [Show participant code input form]         │
       │                                             │
       │ Enter participant code                     │
       │                                             │
       │ POST /conversations/:code/validate-participant
       │ ?participant_code=XYZ789                    │
       ├────────────────────────────────────────────►│
       │                                             │
       │                               [Query participant_codes]
       │                               [WHERE code = XYZ789]
       │                               [AND is_used = FALSE]
       │                               [Mark is_used = TRUE]
       │                               [Generate session token (JWT)]
       │                                             │
       │ {                                           │
       │   valid: true,                              │
       │   conversation_id: "uuid",                  │
       │   session_token: "jwt_token",               │
       │   requires_participant_code: false          │
       │ }                                           │
       │◄────────────────────────────────────────────┤
       │                                             │
       │ [Store session_token in state]             │
       │                                             │
       │ GET /conversations/by-code/:code            │
       │ Authorization: Bearer {session_token}       │
       ├────────────────────────────────────────────►│
       │                                             │
       │                               [Validate session token]
       │                               [Return conversation + questions]
       │                                             │
       │ {conversation: {...}, questions: [...]}    │
       │◄────────────────────────────────────────────┤
       │                                             │
       │ [Show response form]                       │
       │                                             │
       │ Fill responses, click Submit               │
       │                                             │
       │ POST /conversations/:code/responses         │
       │ {                                           │
       │   responses: [                              │
       │     {question_id: "q1", response_text: "..."} │
       │   ],                                        │
       │   participant_code: "XYZ789"                │
       │ }                                           │
       ├────────────────────────────────────────────►│
       │                                             │
       │                               [Validate participant code]
       │                               [Generate participant_id]
       │                               [Create response records]
       │                               [Store responses in database]
       │                                             │
       │ {                                           │
       │   success: true,                            │
       │   message: "Responses submitted"            │
       │ }                                           │
       │◄────────────────────────────────────────────┤
       │                                             │
       │ [Show success message]                     │
       │                                             │
```

### Analysis Flow

```
┌─────────┐                 ┌──────────┐              ┌──────────┐              ┌──────────┐
│ Creator │                 │  Server  │              │  OpenAI  │              │ Anthropic│
└────┬────┘                 └────┬─────┘              └────┬─────┘              └────┬─────┘
     │                           │                          │                          │
     │ POST /conversations/:id/analyze                     │                          │
     ├──────────────────────────►│                          │                          │
     │                           │                          │                          │
     │                    [Start background task]          │                          │
     │                           │                          │                          │
     │ {success: true, ...}      │                          │                          │
     │◄──────────────────────────┤                          │                          │
     │                           │                          │                          │
     │             [Background task runs]                   │                          │
     │                           │                          │                          │
     │                           │ [Fetch responses]        │                          │
     │                           │                          │                          │
     │                           │ POST /embeddings         │                          │
     │                           │ {input: [responses]}     │                          │
     │                           ├─────────────────────────►│                          │
     │                           │                          │                          │
     │                           │ {data: [embeddings]}     │                          │
     │                           │◄─────────────────────────┤                          │
     │                           │                          │                          │
     │                           │ [Run DBSCAN clustering]  │                          │
     │                           │                          │                          │
     │                           │ [Group by cluster]       │                          │
     │                           │                          │                          │
     │                           │ POST /messages                                      │
     │                           │ {                                                   │
     │                           │   model: "claude-sonnet-4-5",                       │
     │                           │   messages: [                                       │
     │                           │     "Analyze cluster: {responses}"                  │
     │                           │   ]                                                 │
     │                           │ }                                                   │
     │                           ├────────────────────────────────────────────────────►│
     │                           │                                                     │
     │                           │ {content: [{text: "{theme, sentiment, summary}"}]} │
     │                           │◄────────────────────────────────────────────────────┤
     │                           │                          │                          │
     │                           │ [Repeat for each cluster]                          │
     │                           │                          │                          │
     │                           │ [Aggregate themes]       │                          │
     │                           │                          │                          │
     │                           │ POST /messages (overall summary)                    │
     │                           ├────────────────────────────────────────────────────►│
     │                           │                                                     │
     │                           │ {content: [{text: "Overall summary..."}]}           │
     │                           │◄────────────────────────────────────────────────────┤
     │                           │                          │                          │
     │                           │ [Save to analyses table] │                          │
     │                           │ [Update conversation state = ANALYZED]             │
     │                           │                          │                          │
     │ [Task complete]           │                          │                          │
     │                           │                          │                          │
     │ Navigate to /conversations/:id/analysis              │                          │
     │                           │                          │                          │
     │ GET /conversations/:id/analysis                      │                          │
     ├──────────────────────────►│                          │                          │
     │                           │                          │                          │
     │ {analysis: {...}}         │                          │                          │
     │◄──────────────────────────┤                          │                          │
     │                           │                          │                          │
     │ [Display results]         │                          │                          │
     │                           │                          │                          │
```

---

## Deployment Architecture

### Production Deployment (Recommended)

```
                      ┌─────────────────┐
                      │   CloudFlare    │
                      │      CDN        │
                      └────────┬────────┘
                               │
                               │ HTTPS
                               │
                      ┌────────▼────────┐
                      │   Nginx Proxy   │
                      │  (Reverse Proxy)│
                      └────┬──────┬─────┘
                           │      │
              ┌────────────┘      └────────────┐
              │                                │
              │ /api/*                         │ /*
              │                                │
    ┌─────────▼─────────┐           ┌─────────▼─────────┐
    │  FastAPI Backend  │           │  React Frontend   │
    │   (Uvicorn)       │           │  (Static Files)   │
    │   Port 8000       │           │   Served by Nginx │
    └─────────┬─────────┘           └───────────────────┘
              │
              │
    ┌─────────▼─────────┐
    │   PostgreSQL      │
    │   Database        │
    │   Port 5432       │
    └───────────────────┘

External Services:
- OpenAI API (embeddings)
- Anthropic API (Claude)
- Google OAuth
- SMTP Server (email)
```

### Environment Variables

**Backend (.env)**:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/mosaic
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

FRONTEND_URL=http://localhost:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

**Frontend (.env)**:
```bash
VITE_API_URL=http://localhost:8000/api
```

### Database Migrations

```bash
# Create new migration
cd backend
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1

# View migration history
alembic history
```

---

## Security Considerations

### Authentication Security
- Passwords hashed with bcrypt (rounds=12)
- JWT tokens signed with HS256
- Access tokens short-lived (30 min)
- Refresh tokens longer-lived (7 days)
- Tokens stored in localStorage (XSS risk: sanitize all user inputs)

### API Security
- CORS configured for trusted origins only
- Rate limiting (TODO: implement)
- SQL injection prevented by SQLAlchemy ORM
- Input validation with Pydantic

### Anonymity Guarantees
- FULLY_ANONYMOUS: No participant_id stored (database-level anonymity)
- PLATFORM_TRACKED: participant_id not exposed in API responses to creators
- REVEALABLE: Identity only revealed if participant explicitly consents

### Data Privacy
- Soft deletes (data retained for audit)
- Email invitations contain unique tokens (not accessible by others)
- Participant codes one-time use
- Session tokens scoped to single conversation

---

## Performance Considerations

### Database Indexing
- Primary keys: All UUIDs indexed
- Foreign keys: Indexed for JOIN performance
- Frequently queried columns: `access_code`, `state`, `email`
- Composite indexes: `(conversation_id, question_order)`, `(conversation_id, is_used)`

### Analysis Optimization
- Background tasks for long-running analysis
- Embeddings cached in memory during analysis run
- Distance matrix computed once, reused for DBSCAN
- Claude API calls parallelized where possible

### Frontend Performance
- Code splitting with React.lazy (TODO)
- Image optimization (TODO)
- API response caching with React Query (TODO)
- Debounced character count updates

---

## Future Enhancements

### Planned Features
1. **Real-time Updates**: WebSocket for live response counts
2. **Advanced Question Types**: Multiple choice, rating scales, matrix questions
3. **Export**: CSV/PDF export of responses and analysis
4. **Notifications**: Email notifications for conversation lifecycle events
5. **Templates**: Conversation templates for common use cases
6. **Multi-language**: i18n support for international users
7. **Mobile App**: React Native app for iOS/Android
8. **Advanced Analytics**: Sentiment trends, word clouds, correlation analysis
9. **Integrations**: Slack, Teams, Discord webhooks
10. **White-label**: Custom branding for enterprise customers

### Technical Improvements
1. **Rate Limiting**: Redis-based rate limiting
2. **Caching**: Redis for session tokens and frequently accessed data
3. **CDN**: Static asset delivery via CDN
4. **Monitoring**: Sentry for error tracking, Prometheus for metrics
5. **Testing**: Comprehensive unit and integration tests
6. **CI/CD**: Automated deployment pipeline
7. **Docker**: Containerization for consistent deployments
8. **Kubernetes**: Orchestration for horizontal scaling

---

## Conclusion

Mosaic's architecture is designed for:
- **Flexibility**: Three-layer access control supports diverse use cases
- **Privacy**: Multiple anonymity levels respect participant preferences
- **Intelligence**: AI-powered analysis extracts actionable insights
- **Scalability**: Background tasks and efficient database design support growth
- **Security**: JWT authentication, input validation, and anonymity guarantees protect users

The system is production-ready for small to medium deployments and has a clear path for scaling to enterprise use cases.
