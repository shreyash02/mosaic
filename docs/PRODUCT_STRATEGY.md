# Mosaic - Product Strategy

**Last Updated:** 2026-02-10

## Product Vision

> **"Mosaic enables teams to build trust through honest feedback, transforming anonymous voices into visible progress."**

### What We Are Building

Mosaic is an anonymous feedback collection platform with AI-powered analysis that enables organizations to collect honest input through configurable privacy levels and transform raw responses into actionable insights.

**Current State:** Post-MVP, production-ready for small-to-medium deployments
**Target Market:** Agile/Scrum teams at 10-100 person companies (Primary), expanding to mid-size organizations

### Core Principles

1. **Trust is the Foundation** - Every feature decision asks "does this maintain trust in anonymity?"
2. **Insights Over Data** - We don't just collect responses; we synthesize meaning
3. **Progress Over Snapshots** - Feedback is most valuable when it shows change over time
4. **Simplicity Over Completeness** - We do fewer things exceptionally well
5. **Self-Serve First** - Teams can get value without IT involvement

### Three-Year North Star (By 2029)

**Mosaic is the default choice for teams who value honest feedback and want to prove they're improving.**

- 10,000+ teams using Mosaic for regular feedback
- "Mosaic it" becomes a verb for anonymous team feedback
- Longitudinal data from 1M+ conversations powering industry benchmarks
- Recognized as the trust standard in feedback technology

### What Success Looks Like

**For Users**:
- Teams report higher psychological safety scores
- Facilitators save 2+ hours per feedback cycle on analysis
- Users can demonstrate improvement over time to leadership

**For the Business**:
- Category leader in "anonymous team feedback"
- 50%+ of users cite "trust" or "anonymity" as key differentiator
- Expansion revenue from longitudinal features (Series upgrades)

---

## Unique Selling Proposition (USP)

### What Makes Mosaic Different

**Mosaic owns the "Trust + Insights + Progress" position** - a combination no competitor offers together.

**Recommended Positioning**: "Trust-Based Team Insights"
> *"The feedback platform your team will actually trust -- with insights you can actually use"*

### Three Core Differentiators

1. **Three-Tier Anonymity Model** (UNIQUENESS: HIGH)
   - `fully_anonymous`: One-time codes, zero user tracking
   - `platform_tracked`: Platform knows identity, facilitator doesn't
   - `revealable`: Participant can consent to reveal post-analysis
   - **Why it matters**: Competitors offer binary on/off anonymity. Mosaic offers nuanced privacy controls with transparency.
   - **Technical implementation**: backend/app/models/conversation.py:60-61

2. **AI-Powered Semantic Clustering** (UNIQUENESS: HIGH)
   - OpenAI embeddings + DBSCAN clustering
   - Claude-powered theme naming and perspective analysis
   - Automated "What Surprised Us" insights generation
   - **Why it matters**: Competitors offer either no AI (survey tools) or manual tagging (research tools). True semantic clustering at this level is rare.
   - **Technical implementation**: backend/app/services/analysis_service.py

3. **Longitudinal Trend Tracking** (UNIQUENESS: MEDIUM-HIGH)
   - Series/Collections group related conversations
   - Normalized theme scores over time
   - Cross-conversation insights aggregation
   - **Why it matters**: Culture Amp and Qualtrics have benchmarking but not at the qualitative/theme level. Retro tools lack this entirely.
   - **Technical implementation**: backend/app/services/collection_analysis_service.py

### Additional Differentiators

4. **Continuous Conversation Mode** (UNIQUENESS: HIGH)
   - "Always-on" feedback channels with periodic analysis
   - Automated daily/weekly/monthly analysis windows
   - Trend evolution within single long-running conversations
   - **Why it matters**: This is a "living pulse survey" that competitors don't offer

5. **Flexible Question Types with Unified Analysis** (UNIQUENESS: MEDIUM)
   - Text (AI-analyzed), Ratings (statistical), Polls (distribution)
   - All analyzed together with AI synthesis
   - **Why it matters**: Common feature set, but unified AI synthesis is differentiating

### What Would Make Customers Choose Mosaic?

| Customer Need | How Mosaic Wins |
|---------------|-----------------|
| "My team doesn't trust our current survey tool is truly anonymous" | Tiered anonymity with transparency |
| "I get data but no insights" | AI-powered theme extraction and synthesis |
| "Our retros are one-off, we never see if we're improving" | Series with longitudinal trend tracking |
| "Enterprise tools are too expensive for my team" | Self-serve, team-level pricing |
| "I need ongoing pulse checks, not periodic surveys" | Continuous conversation mode |

---

## Competitive Positioning

### Competitive Landscape Summary

| Competitor | Positioning | Strengths | Weaknesses | How Mosaic Wins |
|------------|-------------|-----------|------------|-----------------|
| **SurveyMonkey/Typeform** | General-purpose surveys | Brand recognition, templates, integrations | Weak anonymity guarantees, no AI analysis, transactional | Verifiable anonymity + AI insights |
| **Culture Amp/Lattice** | Employee engagement platforms | Established in HR, strong analytics, benchmarks | Expensive, rigid cadences, enterprise-only | Flexible for any use case, accessible pricing |
| **Mentimeter/Slido** | Live polling | Real-time engagement, presentation mode | Weak on async, limited analysis depth | Async + analysis depth |
| **15Five/Officevibe** | Pulse surveys | HR integration, manager workflows | Locked to specific cadences, not anonymous | True anonymity, flexible timing |
| **Retrium/Parabol** | Retrospective tools | Purpose-built for agile retros | Session-specific, no longitudinal tracking | Series with trend visualization |
| **Dovetail/Notably** | Research platforms | AI-powered analysis | Expensive, researcher-focused, not anonymous | Self-serve, anonymous, accessible |

### Market Positioning Deep Dive

#### Survey & Feedback Tool Competitors

**SurveyMonkey, Typeform, Google Forms, Microsoft Forms**
- **Gap Mosaic Exploits**: Binary anonymity (on/off only), no meaningful qualitative analysis. They are form builders, not insight generators.
- **Pricing**: Free to $99+/mo
- **Target**: SMB to Enterprise, generalist needs

#### Employee Engagement Platforms

**Lattice ($6-11/user/mo), Culture Amp ($5-10/user), 15Five ($4-14/user/mo), Officevibe ($4-8/user/mo), Qualtrics EmployeeXM**
- **Gap Mosaic Exploits**: Expensive, HR-centric, require organizational buy-in. Serve organization first, not individuals. Independent teams or ad-hoc feedback poorly served.
- **Pricing**: $4-11 per user per month (scales with headcount)
- **Target**: Enterprise HR departments

#### Anonymous Polling Tools

**Slido (Free-$199/mo), Mentimeter (Free-$25/mo), Poll Everywhere ($19-84/mo)**
- **Gap Mosaic Exploits**: Ephemeral polling without persistent data, no AI analysis, no longitudinal tracking. They serve moments, not ongoing feedback programs.
- **Pricing**: Free to $199/mo (event-based)
- **Target**: Presenters, meeting facilitators

#### Retrospective & Team Feedback Tools

**Retrium ($25-50/user/mo), EasyRetro (Free-$10/user/mo), Parabol (Free-$12/user/mo), FunRetro/Metro Retro (Free-$5/user/mo)**
- **Gap Mosaic Exploits**: Session-specific, don't track patterns over time. Mosaic's Series feature with trend visualization provides longitudinal insight they cannot.
- **Pricing**: Free to $50/user/mo
- **Target**: Agile teams

#### Qualitative Research Platforms

**Dovetail ($29-99/user/mo), Notably ($25-50/user/mo)**
- **Gap Mosaic Exploits**: Researcher-focused, expensive, not anonymous. Mosaic's self-serve anonymous feedback with AI analysis fills a different need.
- **Pricing**: $25-99/user/mo
- **Target**: UX researchers, product teams

### Market Position Mosaic Can Own

**"The Trust Layer for Honest Feedback"**

Mosaic is the platform that enables psychological safety through:
- Verifiable anonymity (not just claimed)
- AI that protects while it analyzes
- Longitudinal insights that show progress over time

**One-line positioning**: *"Finally, feedback your team will actually believe is anonymous -- and AI insights you can actually act on."*

### Positioning Strategy: Unified Platform, Segmented Messaging (RECOMMENDED)

**Master Tagline**: "Honest feedback. Continuous insight."

**Master Value Proposition**:
> "Mosaic enables organizations to collect truly anonymous feedback through configurable privacy levels, then uses AI to extract themes, track trends, and surface insights you can act on — whether you need periodic snapshots or always-on listening."

#### Two Complementary Modes (Not Sub-Brands)

Present Mosaic as having two modes that share the same platform:

| Mode | Use Cases | Workflow | Key Value |
|------|-----------|----------|-----------|
| **Snapshot Mode** | Retrospectives, pulse surveys, 360 reviews, course evaluations | Create → collect for defined period → close → analyze → repeat | "See what changed since last time" |
| **Continuous Mode** | Customer feedback, team health channels, product feedback | Create always-on channel → AI extracts periodic summaries → view trends | "Never miss a moment of feedback" |

**Why This Works**:
- Same anonymity model serves all use cases (customers value privacy too)
- Same AI analysis (clusters, themes, summaries)
- Same longitudinal tracking (trends over time)
- Different workflow configuration, not different product

#### Segment-Specific Landing Pages

Create targeted entry points without fragmenting the brand:

| Segment | Landing Page | Headline | Key Message |
|---------|--------------|----------|-------------|
| **Agile Teams** | /for/teams | "Retrospectives that prove you're improving" | Series + trends show sprint-over-sprint progress |
| **HR/People Ops** | /for/hr | "Employee feedback that tells you what to do" | AI analysis saves hours, longitudinal trends track culture |
| **Restaurants/Hospitality** | /for/hospitality | "Every table has a voice" | QR code feedback with weekly AI summaries |
| **Retail** | /for/retail | "Hear from customers between visits" | Continuous feedback captures what exit surveys miss |
| **Product Teams** | /for/product | "User feedback as it happens" | Ambient input during usage, periodic pain point extraction |
| **Community/HOA** | /for/community | "Ongoing input, not one-off surveys" | Continuous dialogue with periodic sentiment reports |

#### Segment-Specific Value Propositions

**For Agile Teams:**
> "The retrospective tool that shows you're actually improving, sprint after sprint. Anonymous feedback that builds psychological safety. AI analysis that saves hours. Trends that prove progress."

**For Customer-Facing Businesses (Hospitality/Retail):**
> "Turn anonymous feedback into weekly insights without reading every comment. QR codes on every table. AI summaries every week. Trends you can act on."

**For HR/People Operations:**
> "Employee feedback that tells you what's changing, not just what's wrong. Replace annual surveys with continuous pulse. AI does the analysis. You take the action."

**For Product Teams:**
> "Capture user pain points as they happen, not just when you remember to ask. Always-on feedback. Periodic AI extraction. Trends across releases."

#### Competitive Messaging

**Against Survey Tools (SurveyMonkey, Typeform):**
> "Surveys capture moments. Mosaic captures movements. With continuous feedback channels, you'll never miss an insight because you forgot to ask."

**Against Suggestion Boxes / Slack Channels:**
> "The difference between a suggestion box and Mosaic? AI that actually reads every response and tells you what's changing."

**Against Pulse Survey Tools (15Five, Officevibe):**
> "Why force feedback into weekly cadences? With continuous mode, feedback flows naturally and AI tells you when something changes."

#### Brand Architecture

**Do NOT create sub-brands** for the next 18-24 months. Keep one unified brand with segment-specific messaging on landing pages.

**Reasons**:
- Same platform serves all use cases — brand separation for same product confuses users
- Early stage — fragmenting now dilutes brand-building effort
- Cross-sell value — an Agile team lead who loves Mosaic for retros might recommend it for customer feedback
- Simplicity — one login, one dashboard, one pricing page, one support system

#### Go-to-Market: Staged Rollout

| Phase | Timeline | Focus | Rationale |
|-------|----------|-------|-----------|
| **Phase 1** | Months 1-6 | Agile/Scrum teams (primary) | Clear use case, high frequency, proven willingness to pay |
| **Phase 2** | Months 4-9 | Customer-facing businesses (parallel experiment) | Test ambient feedback positioning with lightweight landing page |
| **Phase 3** | Months 6-12 | HR/People Ops | Requires more polish (exports, enterprise features) |
| **Phase 4** | Months 9-18 | Education, community, product teams | Based on learnings from Phase 1-3 |

**Defensibility**: HIGH — The combination of anonymity + AI + longitudinal + continuous is defensible. No competitor currently has all four.

---

## Target Users & Use Cases

### Primary Personas

#### 1. The Agile Team Lead (Taylor) - PRIMARY TARGET
**Job Title**: Scrum Master, Engineering Manager, Team Lead
**Context**:
- Runs retrospectives every 2 weeks
- Frustrated that team doesn't speak up in group settings
- Wants to show the team that feedback leads to change
- Works at 10-100 person company

**Needs**:
- Anonymity to get honest feedback
- Recurring conversations (not one-offs)
- Trend tracking to show improvement
- Actionable insights (not just raw data)

**Why Mosaic Wins**: Series + trends show sprint-over-sprint progress. True anonymity builds psychological safety.

#### 2. The HR/People Ops Leader (Jordan) - SECONDARY TARGET
**Job Title**: People Operations Manager, HR Director
**Context**:
- Runs quarterly pulse surveys
- Current tool gives data but no insights
- Needs to justify investment with outcomes
- Mid-size company (50-500 employees)

**Needs**:
- AI analysis to save hours of manual work
- Longitudinal trends to track culture change
- Executive-ready reports
- Organization-level view across teams

**Why Mosaic Wins**: AI synthesis + longitudinal tracking + professional export

#### 3. The Business Owner (Maria) - SECONDARY TARGET
**Job Title**: Restaurant Owner, Cafe Manager, Hotel GM, Retail Store Manager
**Context**:
- Wants ongoing customer feedback, not just post-visit surveys
- Current methods (comment cards, email surveys) get low response rates
- Needs to spot issues quickly and track improvement over time
- Small-to-medium business, limited analytics resources

**Needs**:
- Always-available feedback channel (QR code, link)
- Low friction for customers (no accounts, quick input)
- Regular summaries without manual analysis
- Trend tracking to see if changes are working

**Why Mosaic Wins**: Continuous conversation mode + periodic AI extraction + longitudinal trends. Turns ambient feedback into actionable weekly/monthly reports without manual effort.

#### 4. The Educator (Dr. Chen) - TERTIARY TARGET
**Job Title**: Professor, Course Instructor
**Context**:
- Collects course feedback from students
- Needs truly anonymous feedback for honest input
- Wants to identify common concerns across sections
- Academic institution

**Needs**:
- Verifiable anonymity (students fear retaliation)
- Cross-group analysis (multiple sections)
- Easy distribution (no student accounts needed)
- Semester-over-semester comparison

**Why Mosaic Wins**: True anonymity + AI theme extraction + Series for multi-semester trends

### Ambient Feedback: The Continuous Conversation Model

Beyond traditional episodic surveys, Mosaic enables **ambient feedback** - persistent channels that capture thoughts as they naturally occur, with periodic AI-powered extraction of insights.

**What It Is:**
- Always-on feedback channels (via QR code, link, or integration)
- People drop feedback whenever they think of it - not on a schedule
- AI periodically extracts summaries, themes, and trends (daily/weekly/monthly)

**Why It Works:**
1. **Matches natural behavior** - Feedback happens at random moments. Traditional surveys miss these because they ask at scheduled times.
2. **Lower friction, higher authenticity** - "Drop a thought whenever" feels less like work than "complete this survey by Friday."
3. **Longitudinal insights** - Captures trends over time, not just snapshots.
4. **Actionable through AI extraction** - Unlike suggestion boxes that collect dust, periodic summarization makes the stream useful.

**Key Use Cases for Ambient Feedback:**

| Context | How It Works | Value |
|---------|--------------|-------|
| **Restaurant/Cafe** | QR code on tables → always-on feedback → weekly summary for managers | Replace post-visit emails with 5% response rates |
| **Hotel/Hospitality** | Room QR code → guests share experiences during stay → daily briefings | Real-time service recovery, not just post-checkout surveys |
| **Retail Stores** | Feedback station or QR → ongoing customer sentiment → weekly trends | Continuous pulse on customer experience |
| **Team Health** | Persistent "team pulse" channel → monthly AI-extracted themes | More organic than quarterly engagement surveys |
| **Product Feedback** | Users drop thoughts during usage → periodic pain point extraction | Catches issues as they happen, not in scheduled research |
| **Community Input** | Open channel for residents/members → periodic sentiment reports | Ongoing dialogue, not one-off consultations |

**The Differentiator:** Slack channels and physical suggestion boxes fail because nobody reads them. Mosaic's periodic AI summarization transforms continuous input into actionable insights.

### Core Use Cases (Priority Order)

1. **Team retrospectives and pulse surveys** (PRIMARY - Agile teams)
2. **Ambient feedback channels** (HIGH VALUE - continuous mode)
3. **Anonymous upward feedback / 360 reviews** (HIGH VALUE)
4. **Customer experience feedback** (HOSPITALITY/RETAIL - ambient mode)
5. **Course evaluations** (EDUCATION SEGMENT)
6. **Organizational change sentiment tracking** (HR USE CASE)
7. **Community research and input gathering** (SECONDARY)

### Market Segmentation Strategy

**Recommendation: Narrow First, Expand Later**

#### Primary Target (0-12 months)
**Agile/Scrum teams at 10-100 person companies**
- Clear use case: recurring retrospectives
- Values both anonymity and improvement tracking
- Willing to pay for tools that help
- Word-of-mouth potential in agile community

#### Underserved Segments Mosaic Could Dominate

| Segment | Size | Pain Point | Why Mosaic Wins | Timeline |
|---------|------|------------|-----------------|----------|
| **Agile/Scrum Teams** | Large | Generic retro tools don't track improvement | Series + trends | 0-12 months |
| **Customer-Facing Businesses** | Large | Post-visit surveys get 5% response; no ongoing pulse | Continuous mode + QR codes + periodic AI summaries | 6-12 months |
| **Educational Institutions** | Medium | Anonymous student feedback with insights | Anonymity + AI at accessible price | 6-12 months |
| **Remote/Distributed Teams** | Growing | Need async feedback with trust | True anonymity for dispersed teams | 6-12 months |
| **Coaching/Consulting** | Medium | Need honest client feedback | Professional AI insights presentation | 12-18 months |
| **DEI/Culture Initiatives** | Growing | Safe space for sensitive feedback | Verifiable anonymity for sensitive topics | 12-24 months |

#### Adjacent Markets for Expansion

| Market | Entry Difficulty | Fit with Current Product | Timeline |
|--------|------------------|-------------------------|----------|
| **360 Feedback/Peer Reviews** | Medium | High (anonymity + multi-question) | 12-18 months |
| **Exit Interviews** | Low | High | 6-12 months |
| **Customer Feedback** | Low | High (continuous mode is perfect fit) | 6-12 months |
| **Research Panels** | High | Low (needs recruitment features) | Not recommended |

---

## Feature Improvements

### Quick Wins (High Impact, Low Effort)

- [ ] **Add Export to PDF/CSV** (2-3 days) - Blocking enterprise evaluations
- [ ] **Email Notifications** (1-2 days) - Conversation completion, analysis ready, scheduled activation
- [ ] **Copy Conversation Link Button** (0.5 days) - One-click copy for participant join URL
- [ ] **Response Count in Dashboard** (0.5 days) - Show prominently in conversation cards
- [ ] **Improve Empty States** (1 day) - Better guidance when no conversations exist
- [ ] **Response Threshold Setting** (1-2 days) - "Don't show results until X responses" to protect anonymity in small teams (competitors have this)

### Feature Enhancements (Deepen Existing Capabilities)

- [ ] **Slack Integration** (1-2 weeks) - Notifications when conversation opens/closes/results ready, post links to channels. HIGH PRIORITY - #1 blocker for team adoption per competitive analysis
- [ ] **Action Items from Retrospectives** (1 week) - Track decisions/commitments from feedback, not just what was said. Key differentiator vs Retrium/TeamRetro
- [ ] **Enhanced Analysis Visualization** (1-2 weeks) - Bar charts for ratings, pie charts for polls, word clouds
- [ ] **Response Time Analytics** (3-5 days) - Track submission patterns, identify engagement trends
- [ ] **Comparative Analysis** (1-2 weeks) - Compare across conversations in same series, highlight sentiment changes
- [ ] **Richer Question Types** (1-2 weeks) - Matrix questions, NPS with analysis, ranking questions
- [ ] **Smart Scheduling** (3-5 days) - Time zone-aware, recurring patterns, calendar view
- [ ] **Conditional/Branching Logic** (1-2 weeks) - "If rating < 5, ask why" - smarter surveys

### User Experience Optimizations

- [ ] **Mobile-First Participant Experience** (1 week) - Optimize JoinPage, large touch targets
- [ ] **Real-Time Response Indicator** (3-5 days) - WebSocket for live response count
- [ ] **Conversation Duplication Improvements** (2-3 days) - Preview before creating, carry over invitations
- [ ] **Analysis Loading Experience** (1-2 days) - Progress indicator, estimated time

### Missing Critical Features

- [ ] **Webhook System** (1-2 weeks) - Notify external systems on events
- [ ] **Bulk Invitation Upload** (3-5 days) - Import participants from CSV
- [ ] **SAML/SSO Support** (2-3 weeks) - Enterprise authentication requirement
- [ ] **GDPR Compliance Tools** (1-2 weeks) - Data export, deletion workflows

### Technical Debt

Based on comprehensive architecture review (2026-01-31):

#### Critical Blockers (Immediate Action Required)

- [ ] **🚨 SECURITY: Remove Hardcoded OAuth Credentials** (CRITICAL)
  - **File**: `backend/app/core/config.py:41-42`
  - **Issue**: Google OAuth client ID and secret hardcoded in source
  - **Impact**: Security vulnerability if repo becomes public
  - **Fix**: Move to environment variables, consider rotating credentials
  - **Effort**: Small (30 minutes)

- [ ] **Add Rate Limiting** (HIGH PRIORITY)
  - **Issue**: No rate limiting on API endpoints
  - **Impact**: Vulnerability to DoS attacks, API abuse, runaway AI costs
  - **Fix**: Add FastAPI rate limiting middleware
  - **Effort**: Medium (2-3 days)

#### Accumulating Debt (2-4 weeks)

- [ ] **Refactor Route Bloat** (HIGH PRIORITY)
  - **File**: `backend/app/routes/conversations.py` (1,817 lines)
  - **Issue**: Single file handles CRUD, state management, invitations, codes, follow-ups, lineage
  - **Impact**: Hard to navigate, higher bug risk, difficult to test
  - **Fix**: Split into focused modules (crud.py, lifecycle.py, access_control.py, relationships.py, continuous_mode.py, utils.py)
  - **Effort**: Medium (2-4 weeks)
  - **Detailed Plan**: See `docs/REFACTORING_PLAN_CONVERSATIONS.md`

- [ ] **Add Comprehensive Test Suite** (HIGH PRIORITY)
  - **Issue**: Only 2 e2e test files exist, no unit tests
  - **Impact**: Higher regression risk, slower development velocity
  - **Fix**: Add unit tests for analysis service, auth, critical business logic
  - **Effort**: Medium (4-6 weeks ongoing)

- [ ] **Migrate to Async SQLAlchemy** (MEDIUM PRIORITY)
  - **Issue**: Synchronous DB access blocks FastAPI event loop
  - **Impact**: Scalability bottleneck under load
  - **Fix**: Migrate to SQLAlchemy async engine and sessions
  - **Effort**: Medium (2-3 weeks)

- [ ] **Refactor Frontend State Management** (MEDIUM PRIORITY)
  - **File**: `frontend/src/pages/ConversationDetailPage.tsx` (40+ useState hooks)
  - **Issue**: Complex local state, difficult to reason about
  - **Fix**: Use React Query for server state, custom hooks for feature bundles
  - **Effort**: Medium (3-4 weeks)

#### Improvement Opportunities (Lower Priority)

- [ ] **Implement Caching** (1-2 weeks)
  - Redis for sessions, cache analysis results
  - Response caching for expensive queries

- [ ] **Audit Logging** (1 week)
  - Track who did what when
  - Important for enterprise compliance

- [ ] **Add Security Headers Middleware** (Small)
  - CORS, CSP, X-Frame-Options
  - Effort: 1-2 days

- [ ] **Database Optimizations**
  - Add missing index on `responses.submitted_at`
  - Remove deprecated `themes` column from analysis table
  - Optimize N+1 queries in conversation listing
  - Effort: 1 week

- [ ] **API Improvements**
  - Add request/response logging
  - Implement API versioning (`/api/v1/`)
  - Standardize error response formats
  - Add pagination to all list endpoints
  - Effort: 2-3 weeks

- [ ] **Frontend Improvements**
  - Add granular error boundaries
  - Implement design system/component library
  - Extract reusable components
  - Effort: 3-4 weeks

- [ ] **AI/ML Pipeline Enhancements**
  - Add batch chunking for large embedding sets
  - Implement retry logic for API calls
  - Use structured output for LLM responses
  - Effort: 1-2 weeks

#### Architecture Review Summary

**Overall Health**: GOOD with notable concerns
**Strengths**: Well-defined domain model, comprehensive API, solid AI pipeline
**Top Risks**: Security (hardcoded credentials), scalability (sync DB), maintainability (route bloat, no tests)
**Review Date**: 2026-01-31
**Detailed Report**: See architecture-reviewer agent output

### Feature Parity Analysis

#### Table Stakes Features (MUST HAVE to Compete)

| Feature | Mosaic Status | Priority |
|---------|---------------|----------|
| Email invitations | ✅ IMPLEMENTED | - |
| Access code sharing | ✅ IMPLEMENTED | - |
| Multiple question types | ✅ IMPLEMENTED | - |
| Basic response viewing | ✅ IMPLEMENTED | - |
| User authentication | ✅ IMPLEMENTED | - |
| Organization/team structure | ✅ IMPLEMENTED | - |
| Scheduled activation | ✅ IMPLEMENTED | - |
| **Export/download results** | ❌ NOT IMPLEMENTED | **CRITICAL** |
| **Mobile responsiveness** | ⚠️ NEEDS VERIFICATION | **HIGH** |
| Results sharing | ✅ IMPLEMENTED | - |

**Critical Gap**: Export functionality (CSV/PDF) is table stakes for enterprise and blocks adoption.

#### Differentiating Features (DOUBLE DOWN)

| Feature | Competitive Advantage | Investment Priority |
|---------|----------------------|---------------------|
| Three-tier anonymity | Very High - unique in market | Maintain, enhance UI |
| AI semantic clustering | High - few competitors have this | Maintain, improve accuracy |
| Longitudinal trends (Series) | High - rare capability | Enhance visualizations |
| Continuous conversations | High - unique workflow | Polish, promote |
| "What Surprised Us" insights | Medium-High - distinctive | Enhance quality |
| Recurring templates | Medium - convenience | Maintain |

#### Features to Avoid (Distractions)

| Feature | Why to Avoid |
|---------|--------------|
| Real-time collaboration (Miro-style) | Different product category, high complexity |
| Video feedback | Conflicts with anonymity positioning |
| Complex survey logic (skip patterns, piping) | Moves toward survey tool commodity |
| Social features (commenting, reactions on responses) | Conflicts with anonymity |
| 100+ native integrations | Resource-intensive, focus on key workflows first |

---

## Product Roadmap

### Phase 1: Market Readiness (Months 1-2)

**Theme: "Security, Polish & Essential Features"**

**Priority 0 (Must Have - Week 1):**
- 🚨 **SECURITY FIX**: Remove hardcoded OAuth credentials (IMMEDIATE)
- Add rate limiting middleware
- Security headers implementation

**Priority 0 (Must Have - Weeks 2-4):**
- Export capabilities (PDF reports, CSV data)
- Email notification system
- Complete mobile optimization

**Priority 1 (Should Have):**
- Enhanced visualization (charts for ratings/polls)
- Improved participant flow
- Response count visibility
- Begin conversations.py refactoring

**Success Metrics:**
- Security vulnerabilities resolved: 2/2
- Export feature adoption > 40% of users
- Mobile participant completion rate > 80%
- Email notification open rate > 50%

### Phase 2: Platform Evolution (Months 3-4)

**Theme: "Team Collaboration"**

**Priority 0 (Must Have):**
- Complete Organizations feature (roles, permissions, shared workspaces)
- Organization-level analytics

**Priority 1 (Should Have):**
- Webhook system for integrations
- Collection Analysis v2 (trend visualization, theme evolution)
- Slack/Teams notification templates

**Priority 2 (Nice to Have):**
- Audit logging for compliance

**Success Metrics:**
- Organization adoption rate > 30% of users
- Average team size > 3 members
- Webhook integration usage > 20% of organizations

### Phase 3: Growth Features (Months 5-6)

**Theme: "Scale & Adoption"**

**Priority 1 (Should Have):**
- Bulk operations (CSV import, batch creation)
- Advanced question types (matrix, NPS, conditional logic)
- Template library with sharing

**Priority 2 (Nice to Have):**
- Real-time updates via WebSocket
- API documentation portal
- Public API with key management

**Success Metrics:**
- Template usage > 50% of new conversations
- Bulk import adoption > 25% of enterprise users
- API usage growth month-over-month

### Long-Term Strategic Initiatives (6-24 Months)

#### Phase 4: Enterprise Ready (Months 6-12)

**Focus: Enable enterprise sales and compliance**

| Initiative | Rationale | Expected Impact |
|------------|-----------|-----------------|
| SSO/SAML Support | Enterprise authentication requirement | Unblock enterprise deals |
| SOC2 Type II certification | Security compliance for enterprise | Trust signal, RFP qualifier |
| GDPR data processing agreements | Legal requirement for EU customers | International expansion |
| White-label option | Premium feature for agencies/consultants | New revenue stream |
| Advanced analytics dashboard | Competitive with Culture Amp/Lattice | Enterprise differentiation |
| Action item generation | "Here's what to do" not just "what was said" | Core differentiation |
| Anonymous 360 feedback workflow | Adjacent high-value use case | New market segment |

#### Phase 5: Platform Expansion (Months 12-18)

**Focus: Build ecosystem and expand market reach**

| Initiative | Rationale | Expected Impact |
|------------|-----------|-----------------|
| Public API with OAuth | Enable power users and integrations | Developer adoption |
| Slack/Teams native apps | Meet users where they work | Distribution channel |
| Zapier/Make connectors | Easy integrations for non-technical users | SMB adoption |
| Multi-language support | International market expansion | 3x addressable market |
| Advanced anonymity features | Strengthen trust differentiation | Brand positioning |
| Manager dashboard | Team health monitoring | Team lead adoption |
| Response quality scoring | Improve analysis quality | Better insights |

#### Phase 6: Innovation (Months 18-24)

**Focus: AI-powered intelligence and new use cases**

| Initiative | Rationale | Expected Impact |
|------------|-----------|-----------------|
| AI coaching suggestions | Personalized facilitator tips | Premium feature |
| Conversation templates marketplace | Community-driven growth | Network effects |
| Industry benchmarking | "Your scores vs. similar companies" | Enterprise stickiness |
| Mobile native app | Push notifications, offline capability | Mobile-first users |
| Advanced access patterns | Research use cases (panels, sampling) | New segment |
| Predictive insights | Sentiment trajectory forecasting | Cutting-edge differentiation |

---

## Success Metrics

### North Star Metric

**Monthly Analyzed Responses (MAR)** - Combines usage (responses) with value realization (analysis)

### Key Performance Indicators

| Category | Metric | Current State | 6-Month Target | 12-Month Target |
|----------|--------|---------------|----------------|-----------------|
| Acquisition | New creators/month | TBD | 500 | 2,000 |
| Activation | Conversations with 5+ responses | TBD | 60% | 75% |
| Engagement | Analysis views per conversation | TBD | 3 | 5 |
| Retention | Creator 30-day return rate | TBD | 40% | 60% |
| Revenue | ARR (if monetized) | $0 | $10K | $100K |

### Quality Metrics

- Time to first analysis view < 30 seconds
- Analysis usefulness rating > 4.0/5
- Participant completion rate > 80%
- Support tickets per 1,000 users < 10

---

## Market Viability Assessment

**Assessment Date:** 2026-02-10

### Sellability Verdict

**YES, with conditions** (Confidence: 70%)

Mosaic has a viable commercial foundation with genuine technical differentiation. The product can sell to a specific buyer profile, but success depends on execution of go-to-market and resisting feature creep toward commodity survey tools.

### Why It Would Sell

| Factor | Evidence |
|--------|----------|
| **Real pain, proven budget** | Agile teams already pay $25-50/user/month for retro tools (Retrium). Market exists and is validated. |
| **Genuine technical differentiation** | Embedding + DBSCAN clustering is non-trivial. Most competitors have no AI or just basic sentiment analysis. |
| **Price-value advantage** | $49/month team-based vs $250-500/month for 10-person team on Retrium (per-seat pricing). |
| **Continuous mode is unique** | No competitor offers ambient feedback with periodic AI extraction. Novel workflow. |
| **Longitudinal tracking fills gap** | "Are we getting better?" question is unanswered by session-based retro tools. |

### Why It Might NOT Sell

| Risk | Mitigation |
|------|------------|
| **Missing table-stakes features** | Export, Slack integration, rate limiting are straightforward to implement (days, not weeks) |
| **Crowded market** | Focus on one segment (Agile teams) and win there before expanding |
| **Differentiation requires education** | Invest in comparison content, demos, case studies showing concrete value |
| **CAC concerns at $49/month** | Product-led growth is the only viable path; paid ads won't work at this price point |

### Probability of Success

**Defined as $500K+ ARR within 3 years:**

| Scenario | Probability |
|----------|-------------|
| With focused execution | 40-50% |
| Without addressing gaps | 10-20% |

### Revenue Projections (Conservative)

| Scenario | Year 1 Customers | ARPU | ARR |
|----------|------------------|------|-----|
| Conservative | 50 | $60 | $36K |
| Moderate | 150 | $75 | $135K |
| Optimistic | 300 | $90 | $324K |

### Competitive Window

The technical differentiation (embedding-based clustering, continuous mode) provides a **12-18 month window** before serious competitors can catch up. During this window, Mosaic must:

1. Establish brand recognition in Agile/Scrum niche
2. Accumulate customers to generate benchmark data
3. Build integrations (Slack, Jira) that create switching costs

### Market Readiness Blockers

These are **not technically hard problems** — each can be completed in days:

| Blocker | Effort | Impact |
|---------|--------|--------|
| Export (PDF/CSV) | 2-3 days | Unblocks enterprise evaluations |
| Rate limiting | 1-2 days | Addresses security concerns |
| Slack integration | 1-2 weeks | #1 lever for team adoption and viral growth |
| Mobile optimization | 1 week | Required for participant experience |

**Assessment:** Product is post-MVP but not yet market-ready. A focused 30-day sprint can close all gaps.

### Target Buyer Profile

**Primary: Scrum Master / Engineering Manager**
- 10-100 person tech company
- Runs biweekly retrospectives with 5-15 person team
- Has discretionary budget ($49-149/month without VP approval)
- Buying trigger: "Our retros have gotten stale" or "I want to prove we're improving"

### Go-to-Market Viability

**Viable channels for a small team:**
1. Content marketing / SEO (6-12 month timeline)
2. Product Hunt launch (one-time visibility spike)
3. Community engagement (Agile/Scrum communities)
4. Slack App Directory listing (distribution + viral mechanics)

**Channels to avoid:**
- Paid advertising (CAC exceeds LTV at $49/month)
- Enterprise sales (requires SSO, SOC2, dedicated sales team)
- Trade shows (expensive, wrong audience density)

### Key Success Factors

1. **Fix blockers in next 30 days** — Export, rate limiting, mobile optimization
2. **Ship Slack integration** — Highest leverage feature for adoption
3. **Secure 5 design partners** — Free pilots in exchange for feedback and case studies
4. **Focus on one segment** — Win Agile/Scrum before chasing hospitality or HR

### Bottom Line

> "The product vision is sound, the technical foundation is solid, and the market need is real. The difference between success and failure comes down to execution speed on critical features and focus on one segment."

The window of opportunity is real but finite. If Mosaic establishes brand recognition in the next 12-18 months before competitors add similar AI features, it has a defensible position.

---

## Strategic Decisions & Open Questions

### 1. Monetization Strategy (CRITICAL - Month 1)
- **Decision Needed:** Pricing model and tiers
- **Recommendation**: Freemium with tiered approach:
  - **Free**: Up to 3 conversations, basic anonymity, AI analysis
  - **Team ($49/mo)**: Unlimited conversations, all anonymity levels, Series/Collections, basic export
  - **Pro ($149/mo)**: Multiple teams, advanced analytics, white-label reports, priority support
  - **Enterprise (Custom)**: SSO, dedicated support, SLA, custom integrations
- **Rationale**: Freemium enables viral adoption in agile teams, team tier captures SMB, enterprise tier for large orgs
- **Alternative**: Per-conversation pricing ($5-10/analyzed conversation) - more aligned with value but harder to predict costs
- **Timeline:** Decide and implement by Month 2

### 2. Target Market Focus (CRITICAL - Month 1)
- **Decision Needed:** Which use case drives go-to-market?
- **Recommendation**: **Team retrospectives (Agile/Scrum teams)**
- **Rationale**:
  - High frequency (every 2 weeks) creates habit and retention
  - Clear pain point (shallow retros without follow-through)
  - Willing to pay for tools ($25-50/user/mo market already exists)
  - Word-of-mouth potential in agile community
  - Series feature directly addresses "are we getting better?" question
- **Secondary**: Expand to 360 reviews and course evaluations once primary proven
- **Timeline:** Commit to focus by Month 1

### 3. Open Source Consideration (Month 3)
- **Question:** Should core be open source to strengthen trust positioning?
- **Options:**
  - **Fully Open Source**: Maximum trust, harder monetization, competitive exposure
  - **Open Core**: Anonymity + basic features open, AI + enterprise features proprietary
  - **Source Available**: Code viewable for security audit, not forkable
  - **Closed Source**: Standard SaaS model
- **Recommendation**: Consider "Source Available" for trust without full open-source complexity
- **Trade-offs:** Credibility vs. competitive moat vs. support burden
- **Timeline:** Evaluate by Month 3, decide by Month 6

### 4. Sales Strategy (Month 4)
- **Question:** Ready for outbound sales to organizations?
- **Assessment**:
  - ✅ Product is functional and stable
  - ❌ Missing export (blocking)
  - ⚠️ Need case studies and ROI metrics
  - ⚠️ Need defined pricing and packaging
- **Recommendation**:
  - Month 1-3: Product-led growth only (self-serve)
  - Month 4: Pilot outbound to 10-20 agile teams with warm intros
  - Month 6: Hire first sales/CS person if traction proven
- **Timeline:** Pilot by Month 4, decide on hire by Month 6

### 5. Positioning Messaging (Month 2)
- **Decision Needed:** Finalize primary marketing message
- **Current Homepage**: "Anonymous opinions or responses to questions/polls with AI-powered insights"
- **Recommended**: "Honest feedback, actionable insights. Create anonymous conversations that build trust and unlock genuine organizational understanding."
- **Target Audience Message**: "The retrospective tool that shows your team is actually improving -- sprint after sprint."
- **Timeline:** Update by Month 2

---

## Next Steps

### Immediate Actions (Next 30 Days)

**Day 1: CRITICAL SECURITY FIX**
1. 🚨 **Remove hardcoded OAuth credentials** from `backend/app/core/config.py`
   - Move GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to environment variables
   - Update .env file with values
   - Verify .env is in .gitignore
   - Consider rotating credentials (they've been in source control)

**Week 1: Security & Critical Gaps**
2. Implement rate limiting middleware
3. Add security headers (CORS, CSP, X-Frame-Options)
4. ❗ Add PDF/CSV export - blocking enterprise evaluations (P0)
5. ❗ Mobile responsiveness audit and fixes (P0)

**Week 2-3: Essential Features**
6. Implement email notifications (P0)
7. Add anonymity trust indicators to UI (P1)
8. Begin unit test coverage for critical paths
9. Database optimization (add missing indexes)

**Week 4: Positioning & Foundation**
10. Update homepage messaging to "Trust-Based Team Insights" positioning
11. Finalize pricing model (freemium tiers)
12. Create "Agile Retrospectives" landing page variant
13. Plan conversations.py refactoring

### Strategic Discussions Needed (This Month)

1. **Monetization**: Approve freemium tier structure and pricing
2. **Market Focus**: Commit to Agile/Scrum teams as primary target
3. **Roadmap Prioritization**: Validate Months 1-6 priorities
4. **Metrics Baseline**: Establish current state for KPIs
5. **Open Source**: Preliminary stance on code transparency

### Key Milestones

| Milestone | Target Date | Success Criteria |
|-----------|-------------|------------------|
| Export Feature Live | Month 1 | 40% adoption within first month |
| Pricing Launch | Month 2 | First paid customer |
| 100 Active Conversations | Month 3 | MAR > 1500 |
| Case Study Published | Month 4 | Agile team showing sprint-over-sprint improvement |
| First Enterprise Deal | Month 6 | >$10K ACV |

---

## Appendix: Competitor Pricing Research

### Survey Tools
- **SurveyMonkey**: Free, Basic ($25/mo), Standard ($99/mo)
- **Typeform**: Free, Basic ($25/mo), Plus ($50/mo), Business ($99/mo)
- **Google Forms**: Free
- **Microsoft Forms**: Free (with M365)

### Employee Engagement
- **Lattice**: $6-11 per user/month
- **Culture Amp**: ~$5-10 per user/month (custom pricing)
- **15Five**: $4-14 per user/month
- **Officevibe**: $4-8 per user/month

### Retrospective Tools
- **Retrium**: $25-50 per user/month
- **Parabol**: Free, Team ($6/user/mo), Enterprise ($12/user/mo)
- **EasyRetro**: Free, Premium ($10/user/mo)
- **Metro Retro**: Free, Team ($5/user/mo)

### Research Platforms
- **Dovetail**: $29-99 per user/month
- **Notably**: $25-50 per user/month

**Mosaic Pricing Opportunity**: Position between survey tools ($0-99/mo) and research platforms ($25-99/user/mo) with team-based pricing ($49-149/team/mo) rather than per-seat.

---

## Change Log

- **2026-01-31:** Initial document created based on product strategist analysis
- **2026-01-31:** Added deep competitive analysis, USP clarification, market segmentation, feature parity analysis, enhanced roadmap with long-term initiatives, refined strategic decisions with recommendations
- **2026-01-31:** Added comprehensive technical debt analysis from architecture review, identified critical security issue (hardcoded OAuth credentials), updated roadmap priorities to include security fixes
- **2026-01-31:** Created detailed refactoring plan for conversations.py route splitting (see REFACTORING_PLAN_CONVERSATIONS.md)
- **2026-02-10:** Added missing features from competitive analysis: Response Threshold, Slack Integration, Action Items, Conditional Logic
- **2026-02-10:** Added "Ambient Feedback" concept - continuous conversation mode for persistent feedback channels with periodic AI extraction. Added customer-facing businesses persona (restaurants, hotels, retail) and expanded use cases
- **2026-02-10:** Updated positioning strategy to "Unified Platform, Segmented Messaging" with master tagline "Honest feedback. Continuous insight." Added segment-specific landing pages, value propositions, competitive messaging, and staged go-to-market plan
- **2026-02-10:** Added Market Viability Assessment - sellability verdict (YES, 70% confidence), revenue projections, competitive window analysis, and go-to-market feasibility. Blockers identified are straightforward (days, not weeks)
