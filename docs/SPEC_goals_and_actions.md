# Product Spec: AI-Suggested Actions & Goal Tracking

> **Summary**: After analysis, AI suggests 2-5 actions. Users review and decide (accept/dismiss/edit/add their own). For recurring conversations, actions can become trackable goals. One-off conversations get actions only, no goal tracking.

> **Key Principle**: AI assists, human decides. Not all actions need to become goals.

> **Implementation**: ~12-14 weeks across 5 phases. See Implementation Phases section.

---

## Overview

Transform Mosaic from a feedback collection tool into an **action-oriented improvement system**. After analyzing feedback, AI suggests concrete actions. Users review and decide what to act on. Some actions become trackable goals that persist across conversations, creating a closed-loop improvement cycle.

### The Flow: AI Suggests, Human Decides

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│   Analysis          AI-Suggested        User Reviews        Goals       │
│   Complete    →     Actions        →    & Decides     →    (optional)  │
│                                                                         │
│   [Clusters,        [2-5 concrete       [Accept/Edit/       [Track      │
│    Themes,           suggestions         Dismiss/Add         progress   │
│    Summary]          from AI]            their own]          over time] │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Key principle: AI assists, human decides. Not all actions need to become goals.
```

### When Goals Apply vs. Don't Apply

**Goals require future measurement** - they only make sense when there will be another conversation to compare against.

| Conversation Type | Insights & Actions | Goals |
|-------------------|-------------------|-------|
| **Recurring template** | ✓ | ✓ Track across instances |
| **Collection/series** | ✓ | ✓ Track across collection |
| **Follow-up conversation** | ✓ | ✓ Compare to parent |
| **One-off conversation** | ✓ | ✗ Nothing to measure against |

**UI adapts based on context:**
- One-off: Show "Accept" and "Dismiss" only, hide "Track as Goal"
- Recurring/Collection: Show full options including "Track as Goal"

```
ONE-OFF CONVERSATION:
┌─────────────────────────────────────────────────────────────┐
│ 📢 Clarify event schedule for next year                     │
│                                                             │
│ 38% mentioned confusion about session times...              │
│                                                             │
│  [Dismiss]    [Accept]                                      │
│                        └─ "I'll handle this, no tracking"   │
└─────────────────────────────────────────────────────────────┘

RECURRING / COLLECTION:
┌─────────────────────────────────────────────────────────────┐
│ 📢 Clarify team priorities                                  │
│                                                             │
│ 45% of responses mention unclear direction...               │
│                                                             │
│  [Dismiss]    [Accept]    [Track as Goal]                  │
│                                  └─ "Measure in next retro" │
└─────────────────────────────────────────────────────────────┘
```

### Use Cases

Mosaic serves diverse contexts beyond workplace teams:

| Context | Example Use | Typical Creator |
|---------|-------------|-----------------|
| **Workplace teams** | Sprint retros, engagement pulses | Team lead, manager, HR |
| **Suggestion box** | "How can we improve?" | Business owner, school admin |
| **Appreciation box** | "Shout out a colleague" | Community manager |
| **Friend groups** | "Where should we travel?" | Trip organizer |
| **Apartment/HOA** | "What should we improve in the building?" | Building manager, resident |
| **Events** | Post-conference feedback | Event organizer |
| **Customer feedback** | Product/service feedback | Product manager, business owner |
| **Classroom** | Student feedback on course | Teacher, professor |
| **Clubs/orgs** | Member feedback | Club president, organizer |

The AI suggestions and goal tracking should adapt to these different contexts based on the information provided.

---

## User Stories

1. **As a team lead**, after reading an analysis, I want to see suggested next steps so I don't have to figure out what to do with the feedback.

2. **As a manager**, I want to track whether my actions are working by seeing if themes improve over time.

3. **As a building manager**, I want to collect resident feedback and track whether issues like "noise complaints" decrease after taking action.

4. **As an event organizer**, I want to see what attendees loved and what to improve for next year's event.

5. **As a teacher**, I want to understand student concerns and track if my course adjustments are working.

6. **As any creator**, I want to know when a problem has been addressed so I can move focus elsewhere.

---

## Feature 1: AI-Suggested Actions

### What It Does

After analysis completes, AI generates 2-5 suggested actions based on the feedback clusters. These appear in a new "Suggested Actions" section on the analysis page.

### Action Types

| Type | Description | Examples by Context |
|------|-------------|---------------------|
| **Investigate** | Dig deeper into an issue | Team: "Schedule 1:1s to understand workload concerns"<br>Apartment: "Survey residents about preferred quiet hours"<br>Event: "Follow up with workshop attendees about format preferences" |
| **Communicate** | Share information or decisions | Team: "Clarify the Q2 priorities"<br>Apartment: "Post update about package room security improvements"<br>Classroom: "Share study resources based on student requests" |
| **Change** | Modify a process or behavior | Team: "Reduce meeting frequency"<br>Coffee shop: "Adjust opening hours based on demand"<br>Event: "Add more networking breaks next year" |
| **Celebrate** | Acknowledge positives | Team: "Recognize collaboration improvements"<br>Apartment: "Thank residents for community garden participation"<br>Friend group: "The beach destination was a clear favorite!" |
| **Monitor** | Watch a trend | Team: "Track onboarding feedback"<br>Classroom: "Watch for continued concerns about pace"<br>Suggestion box: "Monitor if new menu items are well-received" |

### Action Structure

```typescript
interface SuggestedAction {
  id: string;
  analysis_id: string;

  // Content
  title: string;              // "Address communication gaps"
  description: string;        // "45% of responses mention unclear priorities..."
  action_type: ActionType;    // "communicate" | "investigate" | "change" | "celebrate" | "monitor"

  // Source linking
  related_cluster_ids: string[];  // Which clusters informed this action
  response_percentage: number;    // % of responses related to this theme
  sentiment: "positive" | "negative" | "neutral" | "mixed";

  // User interaction
  status: "suggested" | "accepted" | "dismissed" | "converted_to_goal";
  dismissed_reason?: string;

  // Metadata
  created_at: datetime;
  priority: "high" | "medium" | "low";  // Based on frequency + sentiment
}
```

### UI: Suggested Actions on Analysis Page

```
┌─────────────────────────────────────────────────────────────┐
│  Analysis: Q1 Team Retro                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Executive Summary]                                        │
│  [Clusters]                                                 │
│  [Key Themes]                                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💡 Suggested Actions                        3 new   │   │
│  │                                                     │   │
│  │  AI-generated suggestions based on your feedback.   │   │
│  │  Review and decide what to act on.                  │   │
│  │                                                     │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │                                                     │   │
│  │  ⚡ HIGH PRIORITY                                   │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ 📢 Clarify team priorities              [✏️] │   │   │
│  │  │                                             │   │   │
│  │  │ 45% of responses mention unclear direction  │   │   │
│  │  │ or shifting priorities. Consider sharing    │   │   │
│  │  │ a written summary of Q2 goals.              │   │   │
│  │  │                                             │   │   │
│  │  │ Related: "Direction & Strategy" cluster     │   │   │
│  │  │                                             │   │   │
│  │  │  ○ Dismiss   ◉ Accept   ○ Track as Goal    │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  MEDIUM PRIORITY                                    │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ 🔍 Investigate workload distribution    [✏️] │   │   │
│  │  │ ...                                         │   │   │
│  │  │  ○ Dismiss   ○ Accept   ○ Track as Goal    │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │ 🎉 Celebrate collaboration improvements [✏️] │   │   │
│  │  │ ...                                         │   │   │
│  │  │  ○ Dismiss   ○ Accept   ○ Track as Goal    │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  │                                                     │   │
│  │  [+ Add my own action]                              │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Context for Better Suggestions

Without context about the team/workplace, suggestions can be generic. We solve this by:

1. **Auto-extracting context** from existing fields:
   - Conversation title ("Q1 Engineering Retro")
   - Description ("Quarterly feedback for the platform team")
   - Question text (reveals what creator cares about)
   - Organization name and settings

2. **Optional context field** for information the AI wouldn't know:
   - Recent events ("We just went through a reorg")
   - Team characteristics ("Remote team across 3 timezones")
   - Past context ("We tried weekly standups but they didn't stick")

#### UI: Context Input (Optional)

On conversation creation or before analysis:

```
┌─────────────────────────────────────────────────────────────┐
│  Context for AI (optional)                              [?] │
│  Help the AI make more relevant suggestions                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│  Examples vary by use case - see below                      │
└─────────────────────────────────────────────────────────────┘
```

**Context examples by use case:**

| Context | Example Input |
|---------|---------------|
| **Workplace team** | "Remote team of 12 engineers. New manager joined in January. Last retro we discussed on-call burden." |
| **Suggestion box** | "Small coffee shop, 3 employees. Open 6 months. Mostly regulars." |
| **Apartment building** | "40-unit building, mix of renters and owners. Recent issue with package theft." |
| **Event feedback** | "Tech conference, 500 attendees, first year running. 2-day event with workshops." |
| **Friend group** | "Group of 8 friends planning summer trip. Mix of budgets. Some prefer adventure, others relaxation." |
| **Classroom** | "Intro to Biology, 60 students, large lecture format. Midterm just completed." |

#### Context Data Structure

```typescript
interface ConversationContext {
  // Auto-extracted (always present)
  title: string;
  description?: string;
  questions: string[];           // Question texts
  organization_name?: string;

  // User-provided (optional)
  context_notes?: string;        // Free-form context field

  // Historical (if available)
  previous_themes?: string[];    // Themes from past analyses in collection
  past_actions?: string[];       // Actions taken on previous suggestions
}
```

### How Actions Are Generated

Actions are generated during the analysis pipeline by adding a new step:

```python
# In analysis service, after clustering and summarization

def generate_suggested_actions(
    analysis: Analysis,
    clusters: List[Cluster],
    context: ConversationContext
) -> List[SuggestedAction]:
    """
    Use Claude to generate actionable suggestions based on clusters and context.
    """

    prompt = f"""
    Based on this feedback analysis, suggest 2-5 concrete actions.

    CONTEXT:
    - Title: {context.title}
    - Description: {context.description or 'Not provided'}
    - Organization/Group: {context.organization_name or 'Not specified'}
    - Additional context: {context.context_notes or 'None provided'}
    - Questions asked: {context.questions}

    ANALYSIS SUMMARY:
    {analysis.summary}

    CLUSTERS (themes found in responses):
    {format_clusters(clusters)}

    For each action, provide:
    - A clear, actionable title (verb + object)
    - Why this matters (reference specific clusters/percentages)
    - Action type: investigate, communicate, change, celebrate, or monitor
    - Priority: high (>30% of responses + negative), medium, or low

    Guidelines:
    - First, infer the context type from the title/description (workplace team,
      apartment building, event, friend group, classroom, suggestion box, etc.)
    - Tailor suggestions to that context - don't assume workplace/corporate setting
    - Make suggestions specific and actionable for the creator's situation
    - Frame as "Consider..." rather than prescriptive commands
    - Focus on issues mentioned by many people or with strong sentiment
    - Include at least one positive/celebrate action if warranted
    - Keep language appropriate to the context (casual for friends, professional for work)

    Return as JSON array.
    """

    return call_claude(prompt, response_format=List[SuggestedAction])
```

---

## Feature 2: User Actions (Human in the Loop)

### What It Does

After AI generates suggestions, users review and decide what to act on. This is the critical step where humans stay in control. Not every suggestion needs to become a goal - some are just things to do.

### User Choices

For each suggested action, users can:

| Choice | What Happens | When to Use |
|--------|--------------|-------------|
| **Dismiss** | Hide the suggestion, mark as not relevant | AI missed the mark, already addressed, not applicable |
| **Accept** | "I'll do this" - moves to accepted list | Actionable, will handle it, no need to measure |
| **Edit → Accept** | Refine the wording, then accept | Good idea but needs adjustment |
| **Track as Goal** | Convert to measurable goal with baseline/target | Want to measure improvement over time |

Users can also **add their own actions** that the AI didn't suggest.

### Action States

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  suggested   │ ──→ │   accepted   │ ──→ │  completed   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│  dismissed   │     │    goal      │
└──────────────┘     │  (tracked)   │
                     └──────────────┘
```

### Data Structure

```typescript
interface UserAction {
  id: string;
  creator_id: string;
  analysis_id?: string;           // null if user-created

  // Content
  title: string;
  description?: string;
  action_type: ActionType;

  // Source
  source: "ai_suggested" | "user_created";
  original_suggestion_id?: string; // if edited from AI suggestion

  // Source linking (from AI)
  related_cluster_ids?: string[];
  response_percentage?: number;

  // State
  status: "suggested" | "accepted" | "dismissed" | "completed" | "converted_to_goal";

  // User modifications
  edited_at?: datetime;
  dismissed_reason?: string;
  completed_at?: datetime;
  goal_id?: string;               // if converted to goal

  // Metadata
  created_at: datetime;
  priority: "high" | "medium" | "low";
}
```

### UI: Actions Section on Analysis Page

```
┌─────────────────────────────────────────────────────────────┐
│  💡 Actions                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SUGGESTED (3)                          AI-generated        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📢 Clarify team priorities                      [✏️] │   │
│  │                                                     │   │
│  │ 45% of responses mention unclear direction...       │   │
│  │ Related: "Direction & Strategy" cluster             │   │
│  │                                                     │   │
│  │  [Dismiss]    [Accept]    [Track as Goal]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔍 Investigate workload distribution            [✏️] │   │
│  │ ...                                                 │   │
│  │  [Dismiss]    [Accept]    [Track as Goal]          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [+ Add my own action]                                      │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ACCEPTED (2)                           You'll handle these │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ Review meeting cadence                            │   │
│  │   Accepted Feb 10                                   │   │
│  │   [Mark Complete]  [→ Track as Goal]  [Undo]       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ Share Q2 roadmap update                           │   │
│  │   Accepted Feb 10                                   │   │
│  │   [Mark Complete]  [→ Track as Goal]  [Undo]       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  COMPLETED (1)                                    Done! 🎉  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✓ Celebrated team's Q4 wins                         │   │
│  │   Completed Feb 8                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Show dismissed (2)]                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### UI: Add Custom Action

When user clicks "+ Add my own action":

```
┌─────────────────────────────────────────────────────────────┐
│  Add Action                                            [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  What will you do?                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Schedule skip-level 1:1s with team members          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Why? (optional)                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Several responses hinted at concerns not captured   │   │
│  │ in the main themes                                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Type:  ○ Investigate  ○ Communicate  ● Change             │
│         ○ Celebrate    ○ Monitor                           │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  □ Track as Goal (measure progress over time)              │
│                                                             │
│              [Cancel]    [Add Action]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### UI: Edit Suggested Action

When user clicks ✏️ to edit before accepting:

```
┌─────────────────────────────────────────────────────────────┐
│  Edit Action                                           [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Title                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Clarify Q2 priorities in team wiki                  │   │
│  └─────────────────────────────────────────────────────┘   │
│  Original: "Clarify team priorities"                        │
│                                                             │
│  Description                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 45% of responses mention unclear direction. Will    │   │
│  │ create a wiki page outlining Q2 goals and update    │   │
│  │ it weekly.                                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│              [Cancel]    [Save & Accept]                    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Actions Persist Across Conversations

Accepted actions are linked to the analysis but visible at the creator level. When viewing a collection or series:

```
┌─────────────────────────────────────────────────────────────┐
│  Collection: Engineering Retros                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Actions across this collection:                            │
│                                                             │
│  In Progress (3)                                            │
│  • Clarify Q2 priorities (from Feb retro)                  │
│  • Review meeting cadence (from Feb retro)                 │
│  • Improve onboarding docs (from Jan retro)                │
│                                                             │
│  Completed (5)                                              │
│  • Celebrated Q4 wins (Feb)                                │
│  • Added async standup (Jan)                               │
│  • ...                                                      │
│                                                             │
│  Goals (2)                                                  │
│  • Reduce "unclear priorities" mentions (45% → 15%)        │
│  • Improve meeting satisfaction                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature 3: Goal Tracking

### What It Does

When users want to **measure progress over time**, they convert an action into a goal. Goals have baselines, targets, and are tracked across future conversations in a collection or series.

### When Goals Make Sense

Goals are only offered when there's something to track against:

- **Recurring templates**: Each instance measures progress
- **Collections**: Track theme across related conversations
- **Follow-up conversations**: Compare to parent

For **one-off conversations** (single event feedback, one-time poll), goal tracking is hidden - the value is in insights and actions, not measurement.

### Goal Structure

```typescript
interface Goal {
  id: string;
  creator_id: string;
  organization_id?: string;

  // Content
  title: string;                    // "Improve team communication"
  description?: string;             // Longer context
  target_description: string;       // "Reduce mentions of unclear priorities"

  // Source
  source_type: "action" | "manual"; // Where goal came from
  source_action_id?: string;        // If converted from action
  source_analysis_id?: string;

  // Tracking
  tracking_method: "theme_reduction" | "theme_increase" | "sentiment" | "manual";
  tracked_theme?: string;           // Theme/keyword to track
  baseline_percentage?: number;     // Starting point (e.g., 45%)
  target_percentage?: number;       // Goal (e.g., 15%)
  current_percentage?: number;      // Latest measurement

  // Scope
  collection_id?: string;           // Track within a collection
  conversation_ids: string[];       // Or specific conversations

  // Timeline
  target_date?: datetime;
  created_at: datetime;
  updated_at: datetime;

  // Status
  status: "active" | "achieved" | "missed" | "paused" | "archived";
  achieved_at?: datetime;

  // Progress history
  progress_entries: GoalProgressEntry[];
}

interface GoalProgressEntry {
  id: string;
  goal_id: string;
  analysis_id: string;
  conversation_id: string;

  measured_at: datetime;
  percentage: number;
  response_count: number;

  // AI-generated insight
  progress_note: string;  // "Down from 45% to 32% - good progress"
}
```

### UI: Goal Creation (from Action)

When user clicks "Track as Goal" on a suggested action:

```
┌─────────────────────────────────────────────────────────────┐
│  Track as Goal                                         [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Title                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Improve team communication clarity                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  What does success look like?                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Reduce mentions of "unclear priorities" and         │   │
│  │ "lack of direction" in future feedback              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Tracking                                                   │
│                                                             │
│  Track in:  [Collection: Q1 Retros ▼]                      │
│                                                             │
│  Baseline:  45% of responses mention this theme            │
│  Target:    [15]% or less                                  │
│                                                             │
│  Target date: [June 30, 2026        📅]  (optional)        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│              [Cancel]    [Create Goal]                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### UI: Goals Dashboard

New page or dashboard section showing all active goals:

```
┌─────────────────────────────────────────────────────────────┐
│  Goals                                    [+ Create Goal]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Filter: [All ▼]  [Active]  [Achieved]  [Archived]         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎯 Improve team communication clarity               │   │
│  │                                                      │   │
│  │  ████████████░░░░░░░░  62% progress                 │   │
│  │  45% → 28% → 17%  (target: 15%)                     │   │
│  │                                                      │   │
│  │  📊 Tracking in: Engineering Retros                  │   │
│  │  📅 Target: June 30, 2026 (4 months left)           │   │
│  │  📈 Last update: Feb 10 - "Good progress, down 11%" │   │
│  │                                                      │   │
│  │  [View Details]                                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅ Reduce meeting overload                ACHIEVED  │   │
│  │                                                      │   │
│  │  ████████████████████  100% - Goal met!             │   │
│  │  38% → 22% → 12%  (target: 15%)                     │   │
│  │                                                      │   │
│  │  Achieved on Jan 15, 2026                           │   │
│  │  [View Details]  [Archive]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### UI: Goal Progress in Analysis

When viewing an analysis that's linked to a goal:

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Goal Progress                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  This conversation is tracking 2 goals:                     │
│                                                             │
│  🎯 Improve team communication                              │
│     Previous: 28%  →  This round: 17%  ✅ Improving         │
│     Target: 15%  (almost there!)                            │
│                                                             │
│  🎯 Increase psychological safety                           │
│     Previous: 52%  →  This round: 54%  ➡️ Stable           │
│     Target: 70%                                             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Cluster Visualizations

Clusters are groups of similar responses created by DBSCAN clustering during analysis. Visualizing them helps users quickly understand feedback themes and track changes over time.

### Single Conversation: Cluster Overview

Display the clusters from one analysis. User needs to quickly see: What are the themes? How big are they? What's the sentiment?

#### Option A: Bubble Chart

Visual, engaging, good for presentations. Size = response count, color = sentiment.

```
        ┌──────────────────────────────────────────────────────┐
        │                                                      │
        │        ┌───────────────┐                             │
        │        │               │    ┌─────────┐              │
        │        │ Communication │    │Workload │              │
        │        │     45%       │    │  28%    │   ┌─────┐    │
        │        │    😟 neg     │    │ 😐 mix  │   │Tools│    │
        │        │               │    │         │   │ 12% │    │
        │        └───────────────┘    └─────────┘   │ 😊  │    │
        │                                          └─────┘    │
        │    ┌──────────┐                                      │
        │    │Recognition                    ┌────┐            │
        │    │   15%    │                    │Misc│            │
        │    │   😊 pos │                    │ 8% │            │
        │    └──────────┘                    └────┘            │
        │                                                      │
        └──────────────────────────────────────────────────────┘

        Size = % of responses    Color = sentiment (red/yellow/green)
```

**Pros:** Visual impact, intuitive sizing, good for reports
**Cons:** Harder to compare exact sizes, can be cluttered with many clusters
**Best for:** Executive summaries, presentations, 3-7 clusters

#### Option B: Horizontal Bar Chart with Sentiment

Clear, scannable, precise. Recommended for primary display.

```
        Communication & Clarity  ████████████████████░░░░  45%  😟
        Workload & Balance       ███████████░░░░░░░░░░░░  28%  😐
        Recognition & Growth     ██████░░░░░░░░░░░░░░░░░  15%  😊
        Tools & Process          █████░░░░░░░░░░░░░░░░░░  12%  😊

        [Click any bar to expand and see responses in cluster]
```

**Pros:** Easy to read, precise percentages, scannable, accessible
**Cons:** Less visually engaging than bubbles
**Best for:** Primary analysis view, detailed review, many clusters

#### Option C: Treemap

Space-efficient, shows hierarchy, good for many clusters.

```
        ┌─────────────────────────────┬───────────────┬───────┐
        │                             │               │ Tools │
        │      Communication          │   Workload    │  12%  │
        │          45%                │     28%       ├───────┤
        │         (neg)               │    (mixed)    │ Misc  │
        ├─────────────────────────────┤               │  8%   │
        │      Recognition 15%        │               │       │
        │         (pos)               │               │       │
        └─────────────────────────────┴───────────────┴───────┘
```

**Pros:** Space efficient, shows relative sizes clearly, good for many clusters
**Cons:** Less intuitive than bars, harder to read exact percentages
**Best for:** Dashboards with space constraints, 5+ clusters

#### Option D: Donut/Pie Chart

Shows proportions as a whole.

```
              ┌─────────────────┐
              │   ████████      │
              │ ██        ██    │
              │██          ██   │  Communication  45% 😟
              │█   THEMES   █   │  Workload       28% 😐
              │██          ██   │  Recognition    15% 😊
              │ ██        ██    │  Tools          12% 😊
              │   ████████      │
              └─────────────────┘
```

**Pros:** Shows whole = 100%, familiar format
**Cons:** Hard to compare similar-sized segments, limited to ~5 segments
**Best for:** High-level summary, simple analyses with few clusters

### Cluster Evolution Over Time

Display how themes change across a series of conversations (follow-ups, recurring template instances, or collection). Key questions: Which themes persist? Grow? Shrink? Emerge? Disappear?

#### Option A: Stream Graph (Stacked Area)

Shows volume of each theme over time with flowing visual.

```
        │
        │   ░░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░
        │  ░░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░  ← Communication (shrinking ✓)
        │ ░░░░░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░
        │ ████████████████████████████████  ← Workload (stable)
        │ ████████████████████████████████
        │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▓▓▓▓▓▓▓▓▓  ← Recognition (growing)
        │ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▓▓▓▓▓▓▓▓▓▓▓
        └────────────────────────────────────
           Jan     Feb     Mar     Apr     May
```

**Pros:** Beautiful, shows relative proportions, good for trends
**Cons:** Hard to read exact values, can be confusing with many themes
**Best for:** Presentations, showing overall trend direction, 3-5 themes

#### Option B: Sankey Diagram

Shows flow, splits, merges, and new themes emerging.

```
        Round 1              Round 2              Round 3

        Communication ━━━━━━━━━━┓
             45%               ┣━━━ Leadership Comms ━━━━━ Resolved ✓
                               ┃         20%                  5%
                               ┗━━━ Team Comms ━━━━━━━━━━ Team Comms
                                       18%                   12%

        Workload ━━━━━━━━━━━━━━━━━━━━ Workload ━━━━━━━━━━━━ Workload
           28%                          25%                   22%

                               ┏━━━ New: Onboarding ━━━━━ Onboarding
                               ┃         15%                  18%
        (new theme emerges) ━━━┛
```

**Pros:** Shows theme evolution (splits, merges), new themes visible, tells a story
**Cons:** Complex to implement, can be overwhelming, requires theme matching logic
**Best for:** Deep analysis, understanding how specific issues evolved

#### Option C: Bump Chart (Ranking)

Shows which themes are top concerns over time.

```
        Rank
          1 │  ●━━━━━━━━━━●━━━━━━━━━━●          Communication (was #1, now #3)
            │              ╲
          2 │  ●━━━━━━━━━━━━●━━━━━━━━●━━━━━━●   Workload
            │                ╲      ╱
          3 │                  ●━━━●           Leadership (new)
            │  ●━━━━━━━━━━●━━━━━━━━━━━━●━━━━●   Recognition
          4 │
            └──────────────────────────────────
               Jan      Feb      Mar      Apr
```

**Pros:** Clear ranking changes, answers "what's #1 now?", simple to read
**Cons:** Doesn't show magnitude, only relative position
**Best for:** Quick view of priority shifts, comparing "top concerns"

#### Option D: Connected Dot Plot (Recommended)

Clear, precise, shows exact numbers and trends. Best for goal tracking.

```
        Theme                    Jan     Feb     Mar     Apr     Trend
        ─────────────────────────────────────────────────────────────────
        Communication            ●━━━━━━━●━━━━━━━●━━━━━━━○       ↓ Improving
                                45%     32%     20%     12%      (target: 15%)

        Workload                 ●━━━━━━━●━━━━━━━●━━━━━━━●       → Stable
                                28%     26%     25%     24%

        Recognition              ○━━━━━━━●━━━━━━━●━━━━━━━●       ↑ Growing
                                 8%     12%     18%     22%

        Onboarding (new)                 ◐━━━━━━━●━━━━━━━●       ⚠️ Emerging
                                        --      15%     18%
        ─────────────────────────────────────────────────────────────────

        Legend: ● measured  ○ low/resolved  ◐ newly appeared  -- not present
```

**Pros:** Precise values, clear trends, works with goals, shows new/resolved themes
**Cons:** Less visually exciting than other options
**Best for:** Goal tracking, detailed analysis, data-focused users

#### Option E: Small Multiples (Side-by-side bars)

Same bar chart repeated for each time period.

```
        Jan 2026          Feb 2026          Mar 2026          Apr 2026

        Comm    ████ 45%  Comm    ███ 32%   Comm    ██ 20%    Comm    █ 12%
        Work    ███ 28%   Work    ███ 26%   Work    ██ 25%    Work    ██ 24%
        Recog   █ 8%      Recog   █ 12%     Recog   ██ 18%    Recog   ██ 22%
        Tools   █ 12%     Tools   █ 10%     Onboard █ 15%     Onboard ██ 18%
```

**Pros:** Familiar format, easy to compare specific time points, precise
**Cons:** Takes more space, harder to see trends at a glance
**Best for:** Comparing 2-4 specific time points, detailed reports

### Visualization Recommendations

| Use Case | Primary | Secondary |
|----------|---------|-----------|
| Single analysis (quick view) | Horizontal bars | Bubble chart |
| Single analysis (presentation) | Bubble chart | Treemap |
| Evolution over time (goal tracking) | Connected dot plot | Small multiples |
| Evolution over time (presentation) | Stream graph | Sankey |
| Understanding theme changes | Sankey diagram | Bump chart |
| Dashboard/overview | Treemap | Horizontal bars |

### Implementation Notes

1. **Theme matching across analyses**: To show evolution, we need to match themes. Options:
   - Embedding similarity (compare cluster summaries)
   - Keyword overlap
   - AI-assisted matching ("Is 'Communication issues' the same as 'Transparency concerns'?")

2. **Handling new/disappeared themes**:
   - New themes: Show with "NEW" badge or different marker
   - Disappeared: Show faded or with "Resolved" indicator
   - Threshold: Theme "resolved" if < 5% for 2+ consecutive analyses

3. **Interactive features**:
   - Click cluster → expand to see responses
   - Hover → show summary
   - Filter by sentiment
   - Toggle between visualization types

---

## Feature 4: Closing the Loop

### AI References Goals in Analysis

When generating analysis for a conversation linked to goals, the AI prompt includes goal context:

```python
def generate_analysis_with_goals(responses, goals):
    goal_context = format_goals_for_prompt(goals)

    prompt = f"""
    Analyze this feedback. The creator is tracking these goals:

    {goal_context}

    In your analysis:
    1. Note progress or regression on tracked themes
    2. Call out if a goal appears achieved
    3. Suggest if goals need adjustment based on new data
    """
```

### Automated Goal Updates

After each analysis in a tracked collection:

1. System measures current theme percentages
2. Compares to goal baseline/target
3. Creates progress entry
4. Generates AI progress note
5. Updates goal status if target reached

### Notifications

- **Goal progress**: "Your goal 'Improve communication' is 62% complete"
- **Goal achieved**: "Congratulations! Goal 'Reduce meeting overload' achieved"
- **Goal at risk**: "Goal 'Improve onboarding' has regressed - 25% → 32%"

---

## Data Model Summary

### New Tables

```sql
-- Actions: both AI-suggested and user-created
-- This is the "human in the loop" table where users decide what to act on
CREATE TABLE user_actions (
    id UUID PRIMARY KEY,
    creator_id UUID REFERENCES users(id) NOT NULL,
    analysis_id UUID REFERENCES analyses(id),  -- null if user-created without analysis context

    -- Content
    title VARCHAR(255) NOT NULL,
    description TEXT,
    action_type VARCHAR(50) NOT NULL,  -- investigate, communicate, change, celebrate, monitor
    priority VARCHAR(20) NOT NULL,      -- high, medium, low

    -- Source tracking
    source VARCHAR(50) NOT NULL,        -- 'ai_suggested' or 'user_created'
    original_title VARCHAR(255),        -- if edited, store original for reference

    -- AI-generated metadata (null for user-created)
    related_cluster_ids UUID[],
    response_percentage DECIMAL(5,2),
    sentiment VARCHAR(20),

    -- State: suggested → accepted/dismissed, accepted → completed/converted_to_goal
    status VARCHAR(50) DEFAULT 'suggested',  -- suggested, accepted, dismissed, completed, converted_to_goal
    dismissed_reason TEXT,
    completed_at TIMESTAMP,
    edited_at TIMESTAMP,

    -- Goal linkage
    goal_id UUID REFERENCES goals(id),  -- set when converted to goal

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for showing actions by creator and status
CREATE INDEX idx_user_actions_creator_status ON user_actions(creator_id, status);
-- Index for showing actions by analysis
CREATE INDEX idx_user_actions_analysis ON user_actions(analysis_id);

-- Goals: for tracking measurable improvement over time
CREATE TABLE goals (
    id UUID PRIMARY KEY,
    creator_id UUID REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),

    title VARCHAR(255) NOT NULL,
    description TEXT,
    target_description TEXT,

    source_type VARCHAR(50) NOT NULL,  -- action, manual
    source_action_id UUID REFERENCES user_actions(id),
    source_analysis_id UUID REFERENCES analyses(id),

    tracking_method VARCHAR(50) NOT NULL,  -- theme_reduction, theme_increase, sentiment, manual
    tracked_theme VARCHAR(255),
    baseline_percentage DECIMAL(5,2),
    target_percentage DECIMAL(5,2),
    current_percentage DECIMAL(5,2),

    collection_id UUID REFERENCES collections(id),

    target_date TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active',  -- active, achieved, missed, paused, archived
    achieved_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Track goal progress over time
CREATE TABLE goal_progress_entries (
    id UUID PRIMARY KEY,
    goal_id UUID REFERENCES goals(id),
    analysis_id UUID REFERENCES analyses(id),
    conversation_id UUID REFERENCES conversations(id),

    measured_at TIMESTAMP DEFAULT NOW(),
    percentage DECIMAL(5,2),
    response_count INTEGER,
    progress_note TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Link goals to specific conversations
CREATE TABLE goal_conversations (
    goal_id UUID REFERENCES goals(id),
    conversation_id UUID REFERENCES conversations(id),
    PRIMARY KEY (goal_id, conversation_id)
);
```

---

## Implementation Phases

### Phase 1: AI-Suggested Actions (2-3 weeks)
- Add `user_actions` table and API
- Modify analysis pipeline to generate suggestions
- Add "Suggested Actions" section to AnalysisPage
- Basic display of AI suggestions with priority

### Phase 2: User Actions - Human in the Loop (2-3 weeks)
- Accept/Dismiss/Edit flow for suggestions
- User-created actions ("+ Add my own")
- Accepted actions list with completion tracking
- Actions persist and show across collection view

### Phase 3: Goal Tracking (2-3 weeks)
- Add `goals` and `goal_progress_entries` tables
- "Track as Goal" conversion flow
- Goals dashboard page
- Baseline/target/progress visualization

### Phase 4: Progress Measurement (2-3 weeks)
- Automatic theme measurement after analysis
- Progress entries and history
- Connected dot plot visualization
- Goal status updates (achieved/at risk)

### Phase 5: Closing the Loop (1-2 weeks)
- Include goals in analysis prompt
- AI-generated progress notes
- Goal-related notifications
- Surface past actions in new analyses

---

## Open Questions

1. **Theme matching**: How do we reliably match themes across analyses? Embedding similarity? Keyword matching? Both?

2. **Manual goals**: Should users be able to create goals without a source action? (Probably yes, for flexibility)

3. **Shared goals**: Can goals be shared across an organization? Or always per-creator?

4. **Goal templates**: Pre-defined goals like "Improve psychological safety" with standard tracking?

5. **Sentiment goals**: Track overall sentiment, not just theme frequency? "Improve sentiment from 3.2 to 4.0"

---

## Success Metrics

### AI Suggestions
- % of analyses that generate suggestions (should be ~100%)
- Average suggestions per analysis (target: 2-5)
- Suggestion quality: % accepted or converted vs dismissed

### User Actions (Human in the Loop)
- % of analyses where user takes at least one action (accept/edit/add)
- Ratio of AI-suggested vs user-created actions
- Action completion rate (accepted → completed)
- Time from acceptance to completion

### Goals
- % of actions converted to goals (subset want tracking)
- Goals created per active creator
- Goal achievement rate
- Time to goal achievement
- Goal engagement: views of goals dashboard

### Overall
- Feature adoption: % of creators using actions/goals
- Return visits: do users come back to check progress?
- Feedback loop closure: % of goals that show measurable change
