# Mosaic

Mosaic is a privacy-first anonymous feedback platform with AI-powered analysis. People create conversations (questions/polls), collect anonymous responses, then get LLM-generated insights (themes, surprising findings, sentiment).

## Product Model

### Conversation Lifecycle
Conversations follow a deliberate lifecycle — they are NOT a streaming analytics dashboard:

1. **Create** — Creator sets up questions, privacy level, access rules
2. **Collect** — Participants submit anonymous responses within a time window
3. **Close** — Collection ends (manually or by deadline)
4. **Analyze** — AI generates themes, insights, suggested actions from all responses

Most conversations have a bounded collection window. The analysis covers ALL responses — there is no need for date-range filtering on standard conversations.

**Long-running exception:** Continuous conversations stay open indefinitely. These use **periodic analysis** (daily/weekly/monthly) which already handles temporal slicing. Manual date-range filtering is a low-priority edge case, not a core need.

### Privacy Model
Privacy is a feature, not a constraint. 4 anonymity levels:
- **Open** — Responses attributed to participants
- **Fully Anonymous** — No tracking at all
- **Platform Tracked** — Platform knows identity, creator doesn't
- **Revealable** — Anonymous by default, participants can choose to reveal

Analysis results visibility is controlled by `results_access`:
- `creator_only` — Only the creator sees results
- `participants` — Creator + responders see results
- `public_link` — Anyone authenticated can view

### Key Entities
- **Conversation** — A set of questions collecting responses
- **Series** — A collection of related conversations for cross-conversation trend analysis
- **Organization** — Groups of users with shared subscription tier and usage pools
- **Analysis** — AI-generated insights from responses (themes, surprising insights, question analysis, summary)
- **Suggested Actions** — AI-recommended follow-ups from analysis, with user workflow (accept/defer/dismiss/complete)
- **Insight Annotations** — Private creator-only stars and notes on analysis elements

## Core Principles

### Context-Agnostic
Mosaic is NOT just a workplace/team tool. It serves diverse contexts: workplace teams, suggestion boxes, friend groups, apartments/HOA, events, classrooms, clubs, customer feedback.

When writing features or copy:
- **Don't assume** "team", "manager", "employee", "workplace"
- **Use neutral terms:** "creator", "participants", "group"
- Let AI adapt to context inferred from title/description

### Build the Tooling
Don't export raw data (CSV) for users to analyze elsewhere. Build all analysis and visualization tooling within Mosaic. Only add CSV export if many users explicitly request it.

### Insight-to-Action Loop
The core value chain is: **collect → analyze → annotate → act**. Features should close this loop, not add tangential capabilities.

## Technical Patterns

### Frontend
- **React + TypeScript** with Vite
- **Design tokens** from `src/styles/tokens.ts` — use `colors`, `typography`, `spacing`, `borders`, `shadows`, `transitions` instead of hardcoded values
- **Fixed header layout** — `--header-height: 64px` CSS variable, global `padding-top` on `<main>`. Pages should NOT add their own header offset.
- **Feature flags** — `useFeatures()` hook for flags, `useFeatureUsage()` for usage limits
- **Organization context** — `useOrganization()` provides `currentOrgId`; null = personal workspace

### Backend
- **FastAPI + SQLAlchemy + PostgreSQL**
- **Alembic** for migrations
- **Feature flag resolution:** global → tier → org → user overrides
- **Plan tiers:** free < basic < pro < enterprise
- **Rate limiting** via slowapi (in-memory, Redis for production multi-instance)

### Conventions
- No emojis in UI unless user explicitly requests
- Inline styles using design tokens (not CSS modules for page-level components)
- Creator-only features gated on `isCreator` check
- Upsert patterns preferred for user-facing data (annotations, actions) to simplify frontend
- Use custom modals for confirmations, never `window.confirm()` or browser dialogs
- Use custom styled selects/dropdowns, never native `<select>` elements
