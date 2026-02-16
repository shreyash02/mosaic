# Journals (Individual Mode) - Design Specification

> Consolidated design document covering UX/UI, product positioning, and technical architecture for adding personal journals to Mosaic.
>
> Created: Feb 16, 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Product Positioning](#2-product-positioning)
3. [Target Personas](#3-target-personas)
4. [UX/UI Design](#4-uxui-design)
5. [Technical Architecture](#5-technical-architecture)
6. [Analysis Pipeline](#6-analysis-pipeline)
7. [Feature Tiering](#7-feature-tiering)
8. [Privacy & Security](#8-privacy--security)
9. [Launch Strategy](#9-launch-strategy)
10. [Implementation Plan](#10-implementation-plan)

---

## 1. Overview

### What

Add "Journals" to Mosaic — personal, private spaces where a single person records reflections over time and gets AI-powered temporal pattern analysis.

### Why

- **Growth lever:** Creates a zero-friction entry point (no team needed), funneling users toward team conversations: Individual -> Team -> Organization
- **Positioning amplifier:** Solidifies Mosaic as "AI-powered pattern recognition for human thought" rather than "another survey tool"
- **Minimal investment:** ~3 weeks of effort, reusing existing Continuous Conversation + PeriodicAnalysis infrastructure

### Core Insight

Mosaic today answers: "What does my group think?" Journals extend this to: "What do I think — and how is my thinking evolving?"

### Use Cases

- 1:1 meeting reflections (tracking themes over time)
- Coaching journals (client reflections between sessions)
- Personal retrospectives (weekly self-check-ins)
- Career development tracking
- Gratitude/wellness journals
- Decision logs, learning journals, reading notes

---

## 2. Product Positioning

### Positioning Statement

**For individuals who want to understand how their thinking evolves over time, Mosaic journals provide AI-powered pattern recognition that reveals recurring themes, blind spots, and growth areas — something no standard journaling app, notes tool, or spreadsheet can do.**

### Elevator Pitch

"Mosaic journals use the same AI that analyzes team feedback to find patterns in your personal reflections. Write your thoughts. Mosaic shows you what keeps coming up, what's changing, and what you might be missing."

### Core Value Prop

**"Mosaic journals are not where you store thoughts. They are where you understand your thinking."**

The differentiator is not journaling. It is AI-powered temporal pattern recognition on personal text data. Every journaling app in the market is a writing surface. Mosaic is an analysis engine that happens to collect text inputs.

### Framing for Users

**Existing users:** "You already trust Mosaic to find patterns in group feedback. Now use the same AI to find patterns in your own thinking."

**New users:** "Mosaic is your AI-powered thinking partner. Record your reflections over time and Mosaic will surface the patterns you can't see yourself."

### Competitive Differentiation

| Capability | Mosaic | Day One | Notion | Rosebud AI | Generic Notes |
|-----------|--------|---------|--------|------------|---------------|
| Freeform text entry | Yes | Yes | Yes | Yes | Yes |
| Structured prompts | Yes | No | Manual | Yes | No |
| AI analysis of single entry | Yes | No | No | Yes (chatbot) | No |
| **Temporal pattern recognition** | **Yes** | No | No | No | No |
| **Cross-entry theme tracking** | **Yes** | No | No | No | No |
| **"Blind spots" identification** | **Yes** | No | No | No | No |
| Periodic automated analysis | Yes | No | No | No | No |
| Group feedback integration | Yes | No | No | No | No |
| Trend visualization over time | Yes | No | No | No | No |

### Naming

**"Journals"** — simple, universally understood, pairs naturally with "Conversations."

- Navigation: "My Journals"
- Creation: "New Journal"
- Analysis page: "Your Patterns"
- Entries are called "entries" (not "responses")
- Prompts are called "prompts" (not "questions")

---

## 3. Target Personas

### Persona 1: The Reflective Manager

Runs weekly 1:1s with 5-8 direct reports. Takes notes after each meeting but never reviews them systematically. Notes sit in Google Docs and are never revisited. Can't spot that the same concerns keep surfacing.

**Why Mosaic:** After 8 weekly entries, the manager gets: "Work-life balance has appeared in 6 of 8 entries. Career progression concerns have intensified over the last month."

### Persona 2: The Executive Coach

Works with 10-20 clients. Client reflections are scattered across tools. Can't show clients quantifiable evidence of their growth. Preparing for sessions requires manually re-reading past entries.

**Why Mosaic:** "Your client has mentioned imposter syndrome in declining frequency over 12 weeks" is dramatically more powerful than "I feel like we've been making progress."

### Persona 3: The Career Developer

Individual contributor thinking about their next career move. Does periodic self-reflection but inconsistently. Journaling feels pointless because they never extract insights.

**Why Mosaic:** The AI analysis gives journaling a purpose. Every entry feeds a growing picture of what they actually care about.

### Persona 4: The Wellness Tracker

Uses journaling for gratitude, mood tracking, or mental health reflection. Mood-tracking apps reduce complex thoughts to numeric scales.

**Why Mosaic:** Handles freeform text and surfaces themes the way a therapist would: "Anxiety about work deadlines has appeared cyclically, roughly every 3-4 weeks, often following mentions of project handoffs."

### Persona 5: The Learning Practitioner

Student, researcher, or continuous learner who keeps a learning journal. Notes are organized by date but not by theme.

**Why Mosaic:** Automatically identifies recurring themes in learning reflections and tracks evolving understanding.

---

## 4. UX/UI Design

### 4.1 Navigation

Journals live as a **peer section to Conversations**, not nested within them.

**Header nav order:**
```
Dashboard | Conversations | Journals | Templates | Collections | Help
```

The "Journals" link is feature-flagged (`useFeature('journals')`). Active when `location.pathname.startsWith('/journals')`.

### 4.2 Route Structure

```
/journals                    -> JournalsPage (list)
/journals/new                -> JournalCreatePage (creation flow)
/journals/new/template/:id   -> JournalCreatePage (pre-filled from template)
/journals/:id                -> JournalDetailPage (entries + insights)
/journals/:id/entry          -> JournalEntryPage (add new entry)
/journals/:id/entry/:entryId -> JournalEntryPage (view/edit past entry)
/journals/:id/insights       -> JournalInsightsPage (analysis dashboard)
/journals/:id/settings       -> JournalSettingsPage (edit journal config)
```

All routes wrapped in `<ProtectedRoute>`.

### 4.3 Dashboard Integration

A "Your Journals" summary card appears on the dashboard when the user has at least one journal — below the stats grid, before the Getting Started Checklist.

```
+---------------------------------------------------------------+
|  Your Journals                                  View all ->    |
|                                                                |
|  [icon] Weekly Check-in     3-entry streak    Last: yesterday  |
|  [icon] Career Development  Due today         Last: 5 days ago |
+---------------------------------------------------------------+
```

Shows up to 3 journals, prioritized by: (1) due today, (2) active streaks, (3) most recently active. If no journals exist, show nothing on the dashboard.

### 4.4 Journal Creation Flow

**Single-page form** — not a multi-step wizard like group conversations. Journals are simpler (no privacy settings, no invites, no access codes).

**Two paths:**
- **Template Selection:** Grid of template cards (same styling as `IntentSelectionCard`)
- **Blank Journal:** Custom form below

**Form fields:**
- **Title** (required): text field, max 200 chars
- **Description** (optional): textarea, max 500 chars. Helper: "Only you can see this. It helps the AI understand your context."
- **Prompts** (at least 1 required): list of text inputs with add/remove/reorder. Max 10. Each can be "text" or "rating" type.
- **Cadence** (required): Daily / Every few days / Weekly / Biweekly / Monthly / No schedule
- **Analysis frequency** (required): After every 3 entries / After every 5 entries / Weekly / Monthly / Manual only. Default: "After every 5 entries"

**What is intentionally omitted (differs from group conversations):**
- Privacy/anonymity step (always private to creator)
- Invite-only / participant codes (no participants)
- Notifications step (no participants to notify)
- Timing/auto-close step (journals don't close)
- Header image

### 4.5 Journal Templates

**Personal/Wellness:**

| Template | Default Prompts | Cadence |
|----------|----------------|---------|
| Weekly Check-in | "What went well this week?", "What was challenging?", "What do you want to focus on next week?" | Weekly, Monday |
| Gratitude Log | "What are you grateful for today?", "Who made a difference for you today?" | Daily |
| Mood Tracker | "How are you feeling right now?" (rating 1-5), "What's influencing your mood?", "What would help you feel better?" | Daily |
| Energy Audit | "What gave you energy today?", "What drained your energy?", "How would you rate your energy level?" (rating 1-10) | Daily |
| Mindfulness Journal | "What am I noticing right now?", "What thoughts keep returning?", "What am I choosing to let go of?" | Daily |

**Professional/Career:**

| Template | Default Prompts | Cadence |
|----------|----------------|---------|
| 1:1 Reflections | "What do I want to discuss in my next 1:1?", "What feedback do I want to share?", "What support do I need?", "What wins should I highlight?" | Weekly, Friday |
| Career Growth | "What skills am I developing?", "What was my biggest professional win this period?", "What would I do differently?", "What's my next growth goal?" | Biweekly |
| Decision Log | "What decision did I make?", "What factors did I consider?", "What alternatives did I reject and why?", "How do I feel about this decision?" | As needed |
| Learning Journal | "What did I learn today?", "How does this connect to what I already know?", "How might I apply this?" | Weekly |
| Project Retrospective | "What progress was made?", "What blocked progress?", "What should change going forward?", "What am I proud of?" | Weekly |

**Coaching/Development:**

| Template | Default Prompts | Cadence |
|----------|----------------|---------|
| Coaching Journal | "What came up in my session?", "What new insight did I gain?", "What am I committing to before next session?", "What resistance am I noticing?" | Weekly |
| Habit Tracker | "Which habits did I follow through on today?", "What got in the way?", "What's my plan for tomorrow?" | Daily |
| Values Alignment | "How did my actions align with my values today?", "Where did I compromise?", "What choice am I most proud of?" | Weekly |

**Creative/Intellectual:**

| Template | Default Prompts | Cadence |
|----------|----------------|---------|
| Reading Notes | "What am I reading?", "What passage or idea stood out?", "How does this relate to my life or work?" | As needed |
| Creative Practice | "What did I create or work on?", "What felt easy? What felt hard?", "What do I want to try next?" | Weekly |
| Ideas Notebook | "What idea am I thinking about?", "Why does it interest me?", "What's the first step to explore it?" | As needed |

**Relationship/Social:**

| Template | Default Prompts | Cadence |
|----------|----------------|---------|
| Relationship Check-in | "How am I feeling about my relationships?", "What conversations do I need to have?", "How did I show up for others?" | Weekly |

### 4.6 Journal Entry Experience

**Design philosophy:** The lowest-friction interaction in all of Mosaic. Every millisecond of friction reduces return rate.

**Layout:** Full-width centered content, **max-width 640px** (narrower than other pages — resembles a writing surface). Background: `var(--color-primary-50)`.

```
+----------------------------------------------------------+
|  <- Weekly Check-in              Entry #13 - Feb 16, 2026 |
|                                                            |
|  What went well this week?                                 |
|  +------------------------------------------------------+ |
|  |  [cursor here, auto-focused]                         | |
|  +------------------------------------------------------+ |
|                                                            |
|  What was challenging?                                     |
|  +------------------------------------------------------+ |
|  |                                                      | |
|  +------------------------------------------------------+ |
|                                                            |
|  What do you want to focus on next week?                   |
|  +------------------------------------------------------+ |
|  |                                                      | |
|  +------------------------------------------------------+ |
|                                                            |
|                                        [Save Entry]       |
+----------------------------------------------------------+
```

**Key details:**
- Entry number in header provides a satisfying sense of accumulation
- Textareas: min 120px, auto-grow, no character counter unless near limit
- Keyboard shortcut: Cmd+Enter / Ctrl+Enter to save (subtle hint below button)
- Auto-save drafts (reuse `useDraftResponses` hook)
- Rating prompts use existing `RatingButtons` component with optional text note

**Save confirmation:** In-place, not a redirect.
1. Button transforms to checkmark + "Saved" (150ms)
2. "Entry #13 recorded." message appears
3. Navigation links appear after 200ms delay

**Streak milestones** (understated tone):
- 4-week streak: "You've kept this up for 4 weeks straight."
- 10 entries: "That's 10 entries. You're building something."
- 25 entries: "25 entries. The patterns are getting interesting."
- 52-week streak: "A full year of reflection. Remarkable."

### 4.7 Journal Dashboard (List Page)

**Route:** `/journals`

**Header:** "Journals" title + "+ New Journal" button

**Card grid:** `grid`, `gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'`, `gap: spacing[4]`

Each card shows:
- Title + overflow menu (Edit Settings, Archive, Delete)
- Prompt count
- Entry count with thin progress bar
- Streak badge (if >= 2)
- Due status ("Due today" / "Next: Monday")
- Last entry timestamp
- "Add Entry" quick-action on hover (always visible on mobile)

**Sorting:** "Due soonest" (default), "Recently active", "Alphabetical"

**Empty state:**
```
         [notebook icon]

      Start your first journal

  Record your reflections over time and let AI
  help you discover patterns you might miss.

  [+ Create Your First Journal]

  [Weekly Check-in]  [1:1 Reflections]  [Gratitude Log]

  How it works:
  1. Choose prompts to reflect on
  2. Add entries at your own pace
  3. AI surfaces patterns and themes over time
```

### 4.8 Journal Detail Page (Entries + Overview)

**Route:** `/journals/:id`

**Layout:** Two columns on desktop (70/30), single column on mobile.

**Left column — Entry timeline:**
- Most recent entry expanded by default, older entries collapsed (2-line preview)
- Click to expand/collapse (accordion)
- Entry cards have left border accent (`3px solid var(--color-primary-900)`) for timeline feel
- Edit link appears on hover per entry
- Paginated: 10 entries initially, "Load more" button

**Right column — "At a Glance" sidebar (sticky):**
- Total entries, current streak, next due date
- Analysis status: "View Insights" link if available, or "X more entries until first analysis" with progress bar

### 4.9 Insights Page ("Your Patterns")

**Route:** `/journals/:id/insights`

**Layout:** Single column, max-width 900px. Five sections:

**1. Summary**
- 2-3 sentence reflective summary in second person
- AI tone: observational, not prescriptive ("You tend to..." not "You should...")
- Styled like the existing "Overall Summary" card in AnalysisPage

**2. Themes Over Time (Chart)**
- Reuses `TrendChart` component
- X-axis: entries or weeks (toggle). Y-axis: theme intensity (0-1)
- Top 6 themes as colored lines, hover tooltips

**3. What's Consistent**
- Insight cards for themes appearing in majority of entries
- Each card: colored dot, theme name, frequency ("10/13 entries"), 1-2 sentence description

**4. What's New**
- Themes that first appeared recently

**5. What's Fading**
- Themes that were prominent earlier but have disappeared

**6. Worth Reflecting On**
- AI-posed reflective **questions** (not statements) based on noticed patterns
- Visually distinct: `var(--color-primary-100)` background, blockquote styling
- Example: "You mention feeling energized by collaboration but drained by the meetings that collaboration requires. This tension might be worth exploring."

**7. By the Numbers**
- Horizontal stats row: entries, weeks, themes identified, avg entry length, most reflective day, longest streak

### 4.10 Progressive Analysis Unlocking

| Entries | What Unlocks |
|---------|-------------|
| 0-2 | No analysis. "Add a few more entries to start seeing patterns." |
| 3-4 | First analysis: Summary + What's Consistent (with "Early patterns" label) |
| 5-9 | What's New section appears |
| 8+ | What's Fading section appears |
| 10+ | Worth Reflecting On section appears |
| 15+ | Themes Over Time chart becomes meaningful |

### 4.11 Mobile Considerations

- Entry form: full-width, **sticky full-width Save button** at viewport bottom
- Journal list: single column, "Add Entry" always visible (not hover-only)
- Insights: single column, chart at 250px height, legend below, stats as 2x2 grid
- Notification deep-links go straight to `/journals/:id/entry` (entry form, not detail page)

### 4.12 Screen Flow Map

```
[Header: Journals]
    |
    v
/journals (list)
    |--- [empty state] -> /journals/new
    |--- [card click] -> /journals/:id (detail)
    |--- [Add Entry quick action] -> /journals/:id/entry
    |--- [+ New Journal] -> /journals/new
    |
/journals/new (create)
    |--- [template click] -> pre-fills form (same page)
    |--- [Create Journal] -> /journals/:id (detail)
    |
/journals/:id (detail)
    |--- [+ Add Entry] -> /journals/:id/entry
    |--- [View Insights] -> /journals/:id/insights
    |--- [Settings gear] -> /journals/:id/settings
    |--- [entry card] -> expand/collapse (in-page)
    |--- [entry edit] -> /journals/:id/entry/:entryId
    |
/journals/:id/entry (add/edit entry)
    |--- [Save] -> in-place confirmation -> links to detail or list
    |
/journals/:id/insights (analysis)
    |--- [interactive chart] -> hover states
    |--- [insight cards] -> read-only
```

---

## 5. Technical Architecture

### 5.1 Design Decision: Conversation Extension

Journals are implemented as a **specialization of the existing Conversation model**, not a new entity. The codebase already has the pattern of adding mode flags (`is_continuous`, `is_template`, `is_recurring_instance`). A journal is a continuous, single-owner conversation where the owner is both creator and sole respondent.

### 5.2 Database Changes

**Conversation table — new columns:**

```python
is_individual = Column(Boolean, default=False, nullable=False)
# True if this conversation is a personal journal

journal_owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
# The user who owns this journal. Separate from creator_id for:
# (a) efficient indexing, (b) future shared journals, (c) explicit semantics

journal_prompt = Column(Text, nullable=True)
# Optional recurring prompt shown when adding entries
```

**New table — `journal_analyses`:**

```python
class JournalAnalysis(Base):
    __tablename__ = "journal_analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey("conversations.id", ondelete="CASCADE"))

    theme_timeline = Column(JSONB)
    # [{ "theme": str, "first_seen": datetime, "last_seen": datetime,
    #    "entry_count": int, "trajectory": "growing|stable|declining|resolved",
    #    "summary": str, "key_entries": [uuid] }]

    mood_trajectory = Column(JSONB)
    # { "data_points": [{ "date": str, "sentiment_score": float,
    #   "dominant_mood": str, "entry_id": uuid }],
    #   "overall_trend": "improving|stable|declining", "summary": str }

    patterns = Column(JSONB)
    # [{ "pattern_type": "recurring_concern|positive_shift|correlation|cyclical",
    #    "title": str, "description": str, "confidence": float }]

    overall_summary = Column(Text)
    total_entries_analyzed = Column(Integer, default=0)
    date_range_start = Column(DateTime)
    date_range_end = Column(DateTime)
    llm_provider = Column(String(50))
    llm_model = Column(String(100))
    analysis_duration_ms = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

**Indexes:**

```sql
-- Fast "list my journals" query
CREATE INDEX idx_conversations_journal_owner ON conversations (journal_owner_id)
    WHERE is_individual = TRUE;

-- Fast paginated entry timeline
CREATE INDEX idx_responses_journal_timeline ON responses (conversation_id, submitted_at DESC)
    WHERE status = 'submitted';

-- Journal analysis lookup
CREATE INDEX idx_journal_analyses_conversation ON journal_analyses (conversation_id);
```

**How data maps:**
- Journal entries = `Response` records (`conversation_id`, `participant_id` = owner, `response_text`)
- Journal prompts = `Question` records (one per prompt)
- Periodic snapshots = existing `PeriodicAnalysis` records
- Cumulative analysis = new `JournalAnalysis` records

### 5.3 Conversation Defaults for Journals

When `is_individual=True` is passed to `POST /api/conversations`:

```python
conversation.is_individual = True
conversation.journal_owner_id = current_user.id
conversation.is_continuous = True
conversation.anonymity_level = "platform_tracked"
conversation.results_access = "creator_only"
conversation.invite_only = True
conversation.state = "active"  # Skip draft, activate immediately
conversation.manual_close_enabled = False
conversation.show_verbatim_responses = True
```

### 5.4 API Design

**Modified existing endpoints:**

| Endpoint | Change |
|----------|--------|
| `POST /api/conversations` | Accept `is_individual: true`, apply journal defaults |
| `GET /api/conversations` | Add `mode` query param: `group`, `individual`, `all` |

**New journal-specific endpoints:**

```
GET    /api/conversations/{id}/journal/entries          # Paginated entry timeline
POST   /api/conversations/{id}/journal/entries          # Add entry (simplified)
GET    /api/conversations/{id}/journal/analysis         # Get cumulative analysis
POST   /api/conversations/{id}/journal/analyze          # Trigger analysis on-demand
```

**Entry creation schema:**

```python
class JournalEntryCreate(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
```

**Entry list response schema:**

```python
class JournalEntry(BaseModel):
    id: UUID
    text: str
    created_at: datetime
    is_edited: bool = False
    edited_at: Optional[datetime] = None
    word_count: int

class JournalStreak(BaseModel):
    current_streak_days: int
    longest_streak_days: int
    total_entries: int
    entries_this_week: int
    entries_this_month: int
    last_entry_at: Optional[datetime] = None

class JournalEntryList(BaseModel):
    conversation_id: UUID
    total_entries: int
    entries: List[JournalEntry]
    streak: JournalStreak
```

**Analysis response schema:**

```python
class ThemeTimelineEntry(BaseModel):
    theme: str
    first_seen: datetime
    last_seen: datetime
    entry_count: int
    trajectory: str  # growing, stable, declining, resolved
    summary: str

class MoodTrajectory(BaseModel):
    data_points: List[MoodDataPoint]
    overall_trend: str  # improving, stable, declining
    summary: str

class PatternInsight(BaseModel):
    pattern_type: str  # recurring_concern, positive_shift, correlation, cyclical
    title: str
    description: str
    confidence: float

class JournalAnalysisSchema(BaseModel):
    id: UUID
    conversation_id: UUID
    overall_summary: Optional[str]
    theme_timeline: Optional[List[ThemeTimelineEntry]]
    mood_trajectory: Optional[MoodTrajectory]
    patterns: Optional[List[PatternInsight]]
    total_entries_analyzed: int
    date_range_start: Optional[datetime]
    date_range_end: Optional[datetime]
    created_at: datetime
    updated_at: datetime
```

**Authorization:**

All journal endpoints use a `require_journal_owner` dependency:

```python
def require_journal_owner(conversation_id, current_user, db) -> Conversation:
    conversation = db.query(Conversation).filter(
        Conversation.id == conversation_id,
        Conversation.is_individual == True,
        Conversation.journal_owner_id == current_user.id
    ).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Journal not found")
    return conversation
```

---

## 6. Analysis Pipeline

### 6.1 Two-Tier Architecture

**Tier 1 — Periodic Snapshots:** Reuse existing `PeriodicAnalysis` infrastructure. Since journals set `is_continuous=True`, the scheduler automatically handles time-windowed analysis. The analysis service detects `is_individual=True` and uses journal-specific prompts.

**Tier 2 — Cumulative Temporal Analysis:** New `JournalAnalysisService` that tracks how themes, mood, and patterns evolve across ALL entries. Produces the `JournalAnalysis` record.

### 6.2 Journal-Specific Analysis Approach

**Skip embedding/clustering entirely** for journals. DBSCAN clustering is designed for many respondents with similar themes — inappropriate for single-author text. Go directly to LLM temporal analysis.

For 20+ entries, use embeddings to identify which entries cluster around similar themes, then feed those clusters to the LLM. This helps handle larger volumes without losing timeline context.

### 6.3 Analysis Prompts

```
Analyze this person's journal entries over time.

Focus on:
1. Recurring themes - what keeps coming up?
2. Evolution - how has their thinking changed?
3. Patterns - are there cycles or triggers?
4. Blind spots - what might they be missing?
5. Growth areas - where do you see progress?

Be supportive but honest. This is for personal reflection.
```

**Language guidelines:**
- Always use "you" and "your" — never "the user"
- Frame observations, not judgments: "You frequently mention..." not "You have a problem with..."
- Use hedging for sensitive patterns: "This might be worth exploring" not "You need to address this"
- Reference specific entries by number to ground analysis in concrete data
- End on an encouraging note, never fabricate positivity
- Avoid clinical/therapeutic language

### 6.4 Trigger Conditions

| Trigger | Type | Condition |
|---------|------|-----------|
| Periodic scheduler | PeriodicAnalysis | Based on `analysis_interval` |
| Manual "Analyze" button | JournalAnalysis | User clicks, minimum 3 entries |
| Post-periodic-analysis | JournalAnalysis | Recompute cumulative after each snapshot |
| Entry milestones | JournalAnalysis | After entries 5, 10, 20, then every 10 |

### 6.5 Sparse Data Handling

- **< 3 entries:** No analysis. Return `needs_more_entries: true` with `entries_until_analysis` count.
- **3-4 entries:** Basic themes and mood only. Skip pattern detection. Include caveat in summary.
- **5+ entries:** Standard analysis with all sections.
- **20+ entries:** Use embeddings to pre-cluster before LLM analysis.

---

## 7. Feature Tiering

### Feature Flag

Slug: `journals`. Follows existing `feature_flag_overrides` pattern.

| Feature | Free | Basic | Pro | Enterprise |
|---------|------|-------|-----|------------|
| Active journals | 1 | 3 | 10 | Unlimited |
| Entries per journal | 50 | 200 | Unlimited | Unlimited |
| Manual analyses/month | 2 | 5 | 20 | Unlimited |
| Periodic auto-analysis | No | Weekly/Monthly | Daily/Weekly/Monthly | All |
| Entry history retention | 90 days | 1 year | Unlimited | Unlimited |
| Temporal theme chart | No | Yes | Yes | Yes |
| Journal templates | 3 built-in | 3 built-in + custom | Unlimited custom | Unlimited custom |
| Share insights (future) | No | No | Yes (link) | Yes (permissions) |

### Upgrade Triggers

1. **Journal count limit:** Coach with 10 clients hits the limit immediately
2. **Analysis frequency:** Manager wanting weekly analysis on every 1:1 journal
3. **History retention:** 90-day free limit — users lose early entries (strong emotional driver)
4. **Temporal chart:** Visual "wow" feature gated to basic+
5. **Sharing (future):** Coaches wanting to share insights with clients

### Key Decision: Never Limit Entries

Entry limits feel punitive and reduce data quality. The analysis is where the value gates should be.

### Feature Flag Config

```json
{
    "max_journals": 1,
    "max_entries_per_journal": 50,
    "journal_analyses_per_month": 2
}
```

Tier overrides follow the existing pattern established for `ai_analysis`.

---

## 8. Privacy & Security

### Visibility Rules

| Actor | See Entries | See Analysis | Know Journal Exists |
|-------|-----------|-------------|-------------------|
| Journal owner | Always | Always | Yes |
| Org admin | No | No | No |
| Other org members | No | No | No |
| Platform admin | Yes (admin portal) | Yes (admin portal) | Yes |

### Enforcement Layers

- **Database:** `results_access = 'creator_only'`, `invite_only = True`
- **API:** `require_journal_owner` dependency on all journal endpoints
- **Query:** Journals with `organization_id = NULL` only appear for the creator

### Principles

- Org admins **cannot** see journal content, even if the journal has an `organization_id`
- No Slack integration for journals (personal content should not post to org channels)
- `results_access = 'creator_only'` is hardcoded, not configurable
- If the user deletes their account, journals are hard-deleted

### Sharing (Future, Not in MVP)

A `JournalShare` model can be added later for "share with coach/manager" with `share_type` of `analysis_only` (can see analysis but not raw entries) or `full`.

---

## 9. Launch Strategy

### Phase 1: Closed Beta (Weeks 1-2 post-development)

10-15 hand-selected users: users with continuous conversations, coaches/consultants, power users.

**Test:**
- Is creation flow intuitive?
- How many entries before analysis is useful? (Hypothesis: 5+)
- Do users return without prompting?
- Prompt tuning needed?

**Success criteria:**
- 70%+ add 3+ entries in first 2 weeks
- 80%+ rate analysis as "useful"

### Phase 2: Soft Launch (Weeks 3-4)

In-app banner: "New: Personal Journals. Track your reflections and let Mosaic find the patterns."

Email to all users. Subject: "Your thinking has patterns. Now you can see them."

Gradual rollout: pro/enterprise first, then basic, then free.

### Phase 3: Public Launch (Month 2)

Content angles:
- "The pattern problem" — why humans can't see their own patterns
- Use case spotlights (coach, manager, career developer)
- Before/after: Google Doc notes vs. Mosaic analysis

### Success KPIs

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Journal creators (existing users) | 15% of active base | Month 1 |
| Entry retention (3+ entries) | 30% of creators | Month 1 |
| Analysis satisfaction | 80%+ "useful" | Beta |
| **Individual-to-team conversion** | **10% of journal users** | Within 60 days |
| Net new registrations lift | +10% | Month 2-3 |
| Free-to-paid conversion lift | +5% | Month 3-6 |
| 30-day retention for journal users | 40%+ | Ongoing |

**Primary success metric:** 10% of journal users create a group conversation within 60 days.

---

## 10. Implementation Plan

### Phase 1: Backend Foundation (2-3 days)

1. Alembic migration: `is_individual`, `journal_owner_id`, `journal_prompt` on Conversation. Create `journal_analyses` table. Indexes.
2. Update `Conversation` model + schemas
3. Create `JournalAnalysis` model
4. Modify `POST /api/conversations` for `is_individual=True` with forced defaults
5. Add `mode` filter to `GET /api/conversations`
6. Seed `journals` feature flag with tier overrides

### Phase 2: Entry Management (1-2 days)

1. Journal entry endpoints (`POST` and `GET` for `/journal/entries`)
2. Streak computation utility
3. `require_journal_owner` authorization dependency
4. Entry editing (reuse existing response editing logic)

### Phase 3: Analysis Pipeline (3-4 days)

1. `_analyze_journal_entries` method in AnalysisService (skip clustering, LLM-direct)
2. New `JournalAnalysisService` for cumulative temporal analysis
3. Analysis endpoints (`POST /journal/analyze`, `GET /journal/analysis`)
4. Scheduler integration for `is_individual=True` conversations
5. Entry milestone auto-trigger logic

### Phase 4: Notifications (1-2 days)

1. New notification types: `journal_analysis_ready`, `journal_streak_milestone`, `journal_reminder`
2. Email template for analysis ready
3. Email preferences: `journal_analysis`, `journal_reminders`
4. Feature flag enforcement on all endpoints

### Phase 5: Frontend Core Loop (3-4 days)

1. Header navigation update (feature-flagged)
2. `JournalCreatePage` with 3 initial templates (Weekly Check-in, 1:1 Reflections, Gratitude Log)
3. `JournalEntryPage` (writing experience, auto-save, Cmd+Enter)
4. `JournalDetailPage` (entry timeline + sidebar)
5. `JournalsPage` (list with cards, empty state)

### Phase 6: Frontend Intelligence (2-3 days)

1. `JournalInsightsPage` (all five sections)
2. Theme timeline chart (reuse `TrendChart`)
3. Insight cards (consistent, new, fading)
4. Streak calculation + display
5. Progressive "need more entries" states

### Phase 7: Polish (2-3 days)

1. Entry save delight moments (streak milestones)
2. Dashboard journal summary card
3. Full template library (all 16 templates)
4. Mobile-specific optimizations (sticky save button, single-column layouts)
5. Empty state refinement and contextual hints
6. Entry reminders via notifications

### Total Effort

| Phase | Days |
|-------|------|
| Backend Foundation | 2-3 |
| Entry Management | 1-2 |
| Analysis Pipeline | 3-4 |
| Notifications | 1-2 |
| Frontend Core Loop | 3-4 |
| Frontend Intelligence | 2-3 |
| Polish | 2-3 |
| **Total** | **14-21 days (~3 weeks)** |

### Files to Modify

| File | Change |
|------|--------|
| `backend/app/models/conversation.py` | Add `is_individual`, `journal_owner_id`, `journal_prompt` |
| `backend/app/models/__init__.py` | Register `JournalAnalysis` |
| `backend/app/schemas/conversation.py` | Add journal fields to all schemas |
| `backend/app/routes/conversations.py` | Add `mode` filter, journal validation |
| `backend/app/services/analysis_service.py` | Add `_analyze_journal_entries` |
| `backend/app/core/access_control.py` | Add `require_journal_owner` |
| `backend/app/main.py` | Register journal router |
| `frontend/src/App.tsx` | Add journal routes |
| `frontend/src/components/Header.tsx` | Add Journals nav link |
| `frontend/src/types/index.ts` | Add journal types |

### Files to Create

| File | Purpose |
|------|---------|
| `backend/alembic/versions/xxx-add_individual_mode.py` | Schema migration |
| `backend/alembic/versions/xxx-seed_journal_feature_flag.py` | Feature flag seed |
| `backend/app/models/journal_analysis.py` | JournalAnalysis model |
| `backend/app/schemas/journal.py` | Journal-specific schemas |
| `backend/app/routes/journals.py` | Journal API endpoints |
| `backend/app/services/journal_analysis_service.py` | Cumulative analysis logic |
| `frontend/src/pages/JournalsPage.tsx` | Journal list |
| `frontend/src/pages/JournalCreatePage.tsx` | Creation flow |
| `frontend/src/pages/JournalDetailPage.tsx` | Entries + overview |
| `frontend/src/pages/JournalEntryPage.tsx` | Entry writing |
| `frontend/src/pages/JournalInsightsPage.tsx` | Analysis dashboard |
| `frontend/src/pages/JournalSettingsPage.tsx` | Settings |

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Habit/retention** (biggest risk — journaling app 30-day retention is ~15-20%) | High | Analysis anticipation loops, smart reminders, entry milestones, streak tracking |
| **AI quality with few entries** | Medium | Minimum 3 entries before analysis, simplified prompts for < 5, honest "early patterns" labeling |
| **Focus dilution** | Low | ~3 weeks effort, reuses existing infrastructure, frames as natural extension |
| **Privacy sensitivity** (personal thoughts more sensitive than anonymous group feedback) | Medium | Owner-only enforcement at every layer, no admin visibility, clear privacy messaging |
| **Cannibalization** (users create journals instead of group conversations) | Low | Use cases are fundamentally different; monitor ratio as a KPI |
| **LLM prompt quality** | Medium | Iterate with real journal data during beta, tune prompts before public launch |
