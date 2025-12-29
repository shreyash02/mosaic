# Mosaic

> Anonymous feedback collection platform with AI-powered insights

Mosaic is a full-stack web application that enables organizations to collect honest, anonymous feedback from teams and communities, then unlock powerful insights using AI-driven analysis. The platform supports multiple anonymity levels, flexible access controls, email invitations, and provides comprehensive sentiment analysis powered by OpenAI embeddings and Claude Sonnet 4.5.

## Key Features

### 🔒 Three Anonymity Levels
- **Fully Anonymous**: Participant codes for one-time use with zero user tracking
- **Platform Tracked**: Users authenticated internally but identity hidden from facilitator
- **Revealable**: Users can optionally consent to reveal their identity with responses

### 🎯 Flexible Access Control
- **Public Access**: Anyone with the access code can participate
- **Invite-Only Mode**: Restricted to specific participant codes or email invitations
- **Email Invitations**: Send personalized invitation links to specific users
- **Participant Code System**: Generate unique codes for fully anonymous participation

### 🤖 AI-Powered Analysis
- Automatic response clustering using OpenAI `text-embedding-3-small` (1536 dimensions)
- DBSCAN algorithm for semantic grouping based on cosine similarity
- Theme extraction and sentiment analysis via Claude Sonnet 4.5
- Comprehensive summaries with actionable insights grouped by sentiment (positive/negative/neutral)

### ⚡ Smart Scheduling & Time Management
- Manual activation or scheduled auto-activation
- Duration-based conversations with automatic closure
- Time zone support for global teams
- Flexible time extensions during active conversations
- Manual close override when needed

### 🔐 Authentication & Security
- Email/password authentication with JWT tokens
- Google OAuth 2.0 integration for seamless sign-in
- Automatic token refresh on expiry
- Protected routes with redirect preservation
- Admin portal with separate authentication
- Password hashing with bcrypt
- CORS configuration for API security

### 📊 Analytics & Management
- Real-time response tracking and statistics
- Participant count monitoring
- Response rate calculation
- Admin portal for system oversight
- Conversation state management (draft → active → closed → analyzed)
- Preview mode before activation

### 🎨 Modern User Interface
- Responsive design for all devices
- Clean, accessible interface
- Modal components for participant code display
- Legal pages (Terms of Service, Privacy Policy)
- Comprehensive error handling and success states

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.13)
- **Database**: PostgreSQL with SQLAlchemy 2.0
- **Authentication**: JWT tokens with refresh, OAuth 2.0 (Google)
- **AI/ML**:
  - OpenAI API (text-embedding-3-small for embeddings)
  - Anthropic Claude Sonnet 4.5 (analysis & summarization)
  - scikit-learn (DBSCAN clustering algorithm)
  - NumPy (vector operations)
- **Task Processing**: FastAPI BackgroundTasks for async analysis
- **API Documentation**: Auto-generated OpenAPI/Swagger docs

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **Routing**: React Router v6 with protected routes
- **HTTP Client**: Axios with interceptors for auth
- **State Management**: React Context API
- **Styling**: Custom CSS with responsive breakpoints

## Project Structure

```
mosaic/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py         # Environment config
│   │   │   ├── database.py       # DB connection
│   │   │   └── dependencies.py   # Auth dependencies
│   │   ├── models/               # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── conversation.py
│   │   │   ├── question.py
│   │   │   ├── response.py
│   │   │   ├── participant_code.py
│   │   │   ├── conversation_invitation.py
│   │   │   └── analysis.py
│   │   ├── schemas/              # Pydantic schemas
│   │   │   ├── user.py
│   │   │   ├── conversation.py
│   │   │   ├── response.py
│   │   │   ├── analysis.py
│   │   │   └── common.py
│   │   ├── routes/               # API endpoints
│   │   │   ├── auth.py          # Authentication & OAuth
│   │   │   ├── conversations.py  # Conversation CRUD
│   │   │   ├── responses.py      # Response submission
│   │   │   ├── analysis.py       # AI analysis
│   │   │   └── admin.py          # Admin portal
│   │   ├── services/             # Business logic
│   │   │   ├── analysis_service.py  # AI analysis pipeline
│   │   │   └── oauth_service.py     # Google OAuth
│   │   └── main.py               # FastAPI app
│   ├── alembic/                  # Database migrations
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/           # React components
│   │   │   ├── Header.tsx        # Navigation header
│   │   │   └── ProtectedRoute.tsx
│   │   ├── contexts/             # Context providers
│   │   │   └── AuthContext.tsx   # Auth state management
│   │   ├── pages/                # Page components
│   │   │   ├── HomePage.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── RegisterPage.tsx
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── CreateConversationPage.tsx
│   │   │   ├── EditConversationPage.tsx
│   │   │   ├── ConversationDetailPage.tsx
│   │   │   ├── ManageInvitationsPage.tsx
│   │   │   ├── JoinPage.tsx
│   │   │   ├── AnalysisPage.tsx
│   │   │   ├── TermsOfServicePage.tsx
│   │   │   ├── PrivacyPolicyPage.tsx
│   │   │   ├── AdminPortalPage.tsx
│   │   │   ├── AdminUserDetailPage.tsx
│   │   │   └── AdminConversationDetailPage.tsx
│   │   ├── services/             # API client
│   │   │   └── api.ts            # Axios service layer
│   │   ├── types/                # TypeScript definitions
│   │   │   └── index.ts
│   │   ├── App.tsx               # Main app component
│   │   └── App.css               # Global styles
│   ├── package.json              # Node dependencies
│   └── .env                      # Environment variables
│
└── README.md                     # This file
```

## Getting Started

### Prerequisites
- Python 3.13+
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key
- Anthropic API key
- (Optional) Google OAuth credentials for social login

### Backend Setup

1. **Create PostgreSQL database**
   ```bash
   createdb mosaic
   ```

2. **Set up Python environment**
   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip3 install -r requirements.txt
   ```

3. **Configure environment variables**

   Create `.env` file in `backend/` directory:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@localhost/mosaic

   # Security
   SECRET_KEY=your-secret-key-here-generate-with-openssl-rand-hex-32

   # AI Services
   OPENAI_API_KEY=sk-...
   ANTHROPIC_API_KEY=sk-ant-...

   # OAuth (Optional)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

   # CORS
   FRONTEND_URL=http://localhost:3000

   # Admin Portal
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=your-secure-admin-password
   ```

4. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

5. **Start the backend server**
   ```bash
   python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   Services available:
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**

   Create `.env` file in `frontend/` directory:
   ```env
   VITE_API_URL=http://localhost:8000/api
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

   Frontend will be available at http://localhost:3000

## Usage Guide

### Creating a Conversation

1. **Register/Login** to your account (or use Google OAuth)
2. Navigate to **Dashboard** and click "+ New Conversation"
3. **Configure the conversation**:
   - **Title and Description**: Clear, descriptive information
   - **Anonymity Level**: Choose from fully anonymous, platform tracked, or revealable
   - **Access Control**: Public (anyone with code) or invite-only (restricted)
   - **Questions**: Add 1 or more questions
   - **Duration** (optional): Set hours/minutes for auto-close
   - **Scheduling** (optional): Schedule activation for later
   - **Time Zone** (optional): Specify for global teams
4. **Preview** the participant experience before activating
5. **Activate** immediately or schedule for later

### Managing Access

**For Public Conversations:**
- Share the access code link: `http://localhost:3000/join/YOUR_ACCESS_CODE`
- Anyone with the link can participate (subject to anonymity settings)

**For Invite-Only Conversations:**
- **Generate Participant Codes**: Create unique codes for fully anonymous participation
- **Send Email Invitations**: Invite specific users by email
- View and manage all invitations from the conversation detail page

### Collecting Responses

Participants:
1. Visit the join link or enter the access code
2. For invite-only: Enter their participant code or use invitation link
3. Complete the response form
4. Submit (one-time submission enforced)

### Managing Active Conversations

From the conversation detail page:
- **Extend Time**: Add more hours to an active conversation
- **Close Early**: Manually close before duration expires
- **View Statistics**: Real-time response count and participant tracking
- **Manage Codes**: View generated participant codes and usage status

### Running AI Analysis

After closing a conversation:
1. Click **"Run AI Analysis"** button
2. Analysis runs in the background (~15-30 seconds for typical datasets)
3. View comprehensive results:
   - **Overall Summary**: High-level insights
   - **Themes**: Grouped similar responses with frequency counts
   - **Sentiment Clusters**: Positive/negative/neutral breakdown per theme
   - **Metadata**: Processing time, model info, cluster counts

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Create new account
- `POST /login` - Email/password login
- `GET /me` - Get current user info
- `POST /refresh` - Refresh access token
- `GET /google/login` - Initiate Google OAuth flow
- `GET /google/callback` - OAuth callback handler

### Conversations (`/api/conversations`)
- `POST /` - Create conversation
- `GET /` - List user's conversations
- `GET /{id}` - Get conversation details with questions
- `PATCH /{id}` - Update conversation (draft only)
- `DELETE /{id}` - Soft delete conversation
- `POST /{id}/activate` - Activate conversation
- `POST /{id}/close` - Close conversation
- `POST /{id}/extend` - Extend active conversation time
- `POST /{id}/participant-codes` - Generate participant codes
- `GET /{id}/participant-codes` - List participant codes with usage
- `GET /by-code/{access_code}` - Get conversation by access code

### Invitations (`/api/conversations/{id}/invitations`)
- `POST /` - Send email invitations
- `GET /` - List all invitations with status
- `DELETE /{invitation_id}` - Remove invitation

### Responses (`/api/conversations`)
- `POST /{code}/validate` - Validate access code
- `POST /{code}/validate-participant` - Validate participant code
- `GET /{code}/responses/check` - Check if user already responded
- `POST /{code}/responses` - Submit response
- `GET /{id}/responses` - Get all responses (owner only)
- `GET /{id}/responses/stats` - Get response statistics

### Analysis (`/api/conversations/{id}`)
- `POST /analyze` - Trigger AI analysis (background task)
- `GET /analysis` - Get analysis results

### Admin (`/api/admin`)
- `POST /login` - Admin authentication
- `GET /users` - List all users (with filters)
- `GET /conversations` - List all conversations
- `GET /responses` - List all responses

## Database Schema

### Core Tables

**users**
- id, email, hashed_password, full_name
- created_at, updated_at

**conversations**
- id, creator_id, organization_id (nullable)
- title, description
- anonymity_level (enum), results_access (enum)
- invite_only (boolean), access_code (unique)
- state (enum: draft/active/closed/analyzed/deleted)
- auto_analyze, max_response_length
- duration_minutes, timezone
- scheduled_activate_at, auto_close_at
- manual_close_enabled, time_extension_enabled
- activated_at, closed_at, analyzed_at
- created_at, updated_at

**questions**
- id, conversation_id
- question_text, question_type, question_order
- options (JSONB)
- created_at

**responses**
- id, conversation_id, question_id
- participant_id (nullable), participant_code_id (nullable)
- response_text, response_data (JSONB)
- anonymity_level, reveal_consent
- submitted_at

**participant_codes**
- id, conversation_id
- participant_code (unique), is_used
- used_at, created_at

**conversation_invitations**
- id, conversation_id
- email, invited_by_id, invited_user_id
- invitation_token, is_accepted
- accepted_at, created_at, expires_at

**analyses**
- id, conversation_id
- overall_summary, themes (JSONB)
- embedding_provider, embedding_model
- clustering_algorithm
- llm_provider, llm_model
- total_responses_analyzed, num_clusters_found
- analysis_duration_ms
- created_at

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed schema and relationships.

## Development

### Database Migrations

**Create new migration:**
```bash
cd backend
alembic revision --autogenerate -m "Add new field to conversations"
```

**Apply migrations:**
```bash
alembic upgrade head
```

**Rollback last migration:**
```bash
alembic downgrade -1
```

### Building for Production

**Backend:**
```bash
# Install production WSGI server
pip install gunicorn

# Run with multiple workers
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

**Frontend:**
```bash
npm run build
# Static files output to dist/
# Serve with nginx, Vercel, or any static host
```

## Environment Variables

### Backend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | PostgreSQL connection string | ✅ Yes |
| SECRET_KEY | JWT signing key (generate with `openssl rand -hex 32`) | ✅ Yes |
| OPENAI_API_KEY | OpenAI API key for embeddings | ✅ Yes |
| ANTHROPIC_API_KEY | Anthropic API key for Claude | ✅ Yes |
| GOOGLE_CLIENT_ID | Google OAuth client ID | ❌ No |
| GOOGLE_CLIENT_SECRET | Google OAuth client secret | ❌ No |
| GOOGLE_REDIRECT_URI | OAuth callback URL | ❌ No |
| FRONTEND_URL | Frontend origin for CORS | ✅ Yes |
| ADMIN_USERNAME | Admin portal username | ✅ Yes |
| ADMIN_PASSWORD | Admin portal password | ✅ Yes |

### Frontend (.env)
| Variable | Description | Required |
|----------|-------------|----------|
| VITE_API_URL | Backend API base URL | ✅ Yes |

## Feature Status

### ✅ Completed
- User authentication (email/password + JWT refresh)
- Google OAuth integration
- Conversation CRUD with full state management
- Multi-question support
- All three anonymity levels
- Public and invite-only access modes
- Participant code generation and tracking
- Email invitation system
- Text responses with character limits
- Manual and auto-close functionality
- Duration-based conversations with scheduling
- Time zone support
- Time extension for active conversations
- AI analysis with embeddings + DBSCAN + Claude
- Both access modes for results (invite code holders, public)
- Admin portal with user/conversation/response views
- Legal pages (Terms, Privacy)
- Responsive UI with comprehensive styling
- Preview mode before activation
- Response duplicate prevention
- Automatic token refresh
- Protected routes with redirect preservation

### 🚧 Future Enhancements
- Organizations/teams support
- Rating and poll question types
- Real-time response count updates
- Analysis regeneration
- Export results (PDF, CSV)
- Advanced analytics dashboard
- Notification system
- Response editing window
- Batch invitation uploads

## Troubleshooting

**Backend won't start:**
- Ensure PostgreSQL is running: `pg_isready`
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- Verify Python 3.13+: `python3 --version`
- Check all dependencies installed: `pip3 list`

**Frontend build errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Check Node version: `node --version` (should be 18+)
- Verify VITE_API_URL in .env

**Analysis fails:**
- Verify API keys are correct and active
- Check API quotas/rate limits on OpenAI/Anthropic dashboards
- Ensure conversation has at least one response
- Check backend logs: look for detailed error messages
- Verify the correct Claude model name: `claude-sonnet-4-5-20250929`

**OAuth not working:**
- Verify Google OAuth credentials in Google Cloud Console
- Check GOOGLE_REDIRECT_URI matches exactly (including protocol and port)
- Ensure authorized redirect URIs include your callback URL
- Verify FRONTEND_URL for redirect after OAuth

**Participant codes not working:**
- Ensure conversation is in `active` state
- Verify `invite_only` is `true` for the conversation
- Check code hasn't been used already (one-time use)
- Codes are case-sensitive

## License

Proprietary - All rights reserved

## Support

For issues and questions:
- Create an issue in the repository
- See [ARCHITECTURE.md](ARCHITECTURE.md) for technical details
- Contact the development team

## Acknowledgments

- [OpenAI](https://openai.com/) for embeddings API
- [Anthropic](https://anthropic.com/) for Claude API
- [FastAPI](https://fastapi.tiangolo.com/) framework
- [React](https://react.dev/) and [Vite](https://vitejs.dev/) teams
- [SQLAlchemy](https://www.sqlalchemy.org/) ORM
