# Mosaic Product Roadmap

## Core Product Principles

**1. Context-agnostic design**: Mosaic is a general anonymous feedback tool, not just a workplace/team tool. All features, copy, and AI should work for diverse contexts:

| Context | Example |
|---------|---------|
| Workplace teams | Sprint retros, engagement pulses, exit interviews |
| Suggestion/appreciation box | Business, school, community org |
| Friend groups | Trip planning, group decisions |
| Apartment/HOA | Resident feedback, community issues |
| Events | Conference feedback, workshop reviews |
| Customer feedback | Product/service improvement |
| Classroom | Student feedback on courses |
| Clubs/orgs | Member feedback |

When designing features or writing copy, avoid assuming "team", "manager", "employee", "workplace". Use neutral terms like "creator", "participants", "group" where possible, or make the UI adapt to context.

**2. Privacy-first architecture**: Multiple anonymity levels, trust screen with countdown, anonymous conflict handling for logged-in users accessing anonymous conversations.

---

## Completed Features (as of Feb 2026)

### Core Conversation Management
- [x] Multi-step conversation creation wizard (7 steps: Intent, Details, Privacy, Questions, Timing, Notifications, Review)
- [x] Question types: text, rating (1-5/1-10), single choice, multiple choice
- [x] Drag-and-drop question reordering with image attachments
- [x] Conversation states (Draft, Active, Closed, Analyzing, Analyzed)
- [x] Scheduled activation ("Launch Monday at 9am")
- [x] Auto-close with time extension capability
- [x] Conversation duplication ("Duplicate as draft")
- [x] Conversation archiving/unarchiving
- [x] Bulk operations (select, close, archive, delete)
- [x] Centralized access control

### Participant Experience
- [x] Trust screen with 10-second read timer and privacy disclosure
- [x] Anonymous conflict handling for logged-in users
- [x] Response editing (when enabled by creator)
- [x] Server-side draft auto-save with status indicator
- [x] Question image lightbox (click-to-enlarge)
- [x] Announcements banner from creator
- [x] Preview/dry-run page for creators to test participant experience

### Analysis & Insights
- [x] AI-powered analysis (themes, perspectives, insights, "What Surprised Us")
- [x] Question-by-question breakdown
- [x] Rating statistics with distribution charts
- [x] Poll statistics with choice counts and percentages
- [x] Verbatim responses (grouped by question or responder)
- [x] PDF export with cover page
- [x] Periodic analysis for continuous conversations
- [x] Analysis history with manual/scheduled triggers

### Collections & Recurring
- [x] Create/manage collections
- [x] Collection-level analysis with aggregated insights
- [x] Trend charts for theme evolution
- [x] Templates with recurring patterns (weekly, biweekly, monthly, quarterly)
- [x] Recurring template pause/resume + inline pattern editing

### Notifications
- [x] Email notifications (7 types with granular control)
- [x] Slack participant DMs
- [x] Slack channel notifications (activation, close, analysis events)
- [x] Reminders for non-respondents (manual and scheduled)
- [x] Announcements to participants

### User & Organization Management
- [x] Profile page (name editing, avatar)
- [x] Password management (change/set)
- [x] Email preferences with granular control
- [x] Email verification for sensitive actions
- [x] Forgot password flow with email reset
- [x] Organization creation and management
- [x] Organization branding (logo, name)
- [x] Member management with admin/member roles
- [x] Workspace switching (personal + org)
- [x] Slack integration per organization

### Onboarding & Help
- [x] Getting Started checklist with progressive completion
- [x] Welcome modal for first-time users
- [x] Contextual hints throughout UI
- [x] Help documentation (10 topics: creating, inviting, responding, analysis, etc.)

### Other
- [x] Full-text search across conversations, collections, and analyses
- [x] QR code/poster generation (downloadable)
- [x] Copy link buttons on cards and detail page header
- [x] Invitation management with CSV batch upload
- [x] Skeleton loaders for loading states
- [x] Timezone display + human-friendly dates
- [x] Admin portal (user/conversation management, test data generation)

---

## Remaining Gaps

### Essential (Critical for Trust)

1. **Response Threshold Setting**
   - Protect anonymity when response count is low (<N responses)
   - Spec exists at `SPEC_response_threshold.md` - needs implementation
   - Critical for trust positioning ("We protect anonymity")
   - Competitors have this as standard
   - **Effort:** Medium

### P1 - High Priority

2. **Mobile JoinPage Optimization**
   - QR code use case is mobile-first entry point
   - Touch targets below 48px minimum (radio/checkbox options)
   - Rating slider difficult on mobile
   - Need swipe navigation between questions
   - Sticky submit button at bottom
   - **Effort:** Medium-Large

3. ~~**CSV/Data Export**~~ - **DEFERRED**
   - Philosophy: Build the tooling users need, don't export raw data for other tools
   - Only revisit if many users explicitly request it

4. **Analysis Comparison View**
   - Side-by-side comparison of 2-3 analyses
   - Delta highlighting (what changed between periods)
   - Collections exist but no comparison UI
   - Key differentiator for longitudinal tracking value prop
   - **Effort:** Medium-Large

### P2 - Medium Priority

5. **Accessibility Improvements**
   - Add ARIA labels to all interactive elements
   - Implement focus trapping in modals
   - Screen reader testing and fixes
   - Color contrast verification for WCAG compliance
   - **Effort:** Medium

6. **Response Analytics Dashboard**
   - Response rate trends over time
   - Optimal send time suggestions
   - Reminder effectiveness tracking
   - Engagement benchmarks
   - **Effort:** Medium

7. **Real-time Response Count**
   - WebSocket for live updates during active conversations
   - Creator engagement feature - seeing responses come in
   - **Effort:** Medium

### P3 - Lower Priority (Polish)

8. **Keyboard Shortcuts**
   - j/k navigation on lists
   - Quick actions (a for activate, c for close)
   - Help modal on ? key
   - Esc for modal close (partially done)
   - **Effort:** Small

9. **Enhanced Visualizations**
   - Pie charts for poll distributions
   - Word clouds for themes
   - Sentiment visualization
   - **Effort:** Small-Medium

10. **Smart Defaults**
    - Remember last-used settings per user
    - Suggest duration based on question count
    - **Effort:** Small

11. **Question Library**
    - Pre-written questions by category
    - Community-contributed templates
    - **Effort:** Medium

12. **Custom Branding on Participant Pages**
    - Apply org logo/colors to JoinPage header
    - Branded email templates
    - Custom QR code styling
    - **Effort:** Medium

13. **Help System Depth**
    - Video walkthroughs for key flows
    - Interactive tutorials
    - Expanded FAQ sections
    - **Effort:** Medium

14. **External API** (see `EXTERNAL_API_DESIGN.md`)
    - API key management in settings
    - Public API for campaigns, responses, analysis
    - Webhook support for events
    - **Effort:** Large

---

## UX Inconsistencies to Address

| Issue | Current State | Recommendation |
|-------|---------------|----------------|
| Back navigation | Mix of buttons and breadcrumbs | Breadcrumbs for >2 levels, back button for single-level |
| Date formatting | Mix of relative and absolute | <24h: relative, <7d: day+time, >7d: absolute |
| Form validation | Mix of inline and submit-time | Prefer inline validation with debouncing |
| Action confirmation | Inconsistent modal usage | Standardize confirmation patterns |
| Loading states | Skeleton loaders exist but inconsistent | Audit all pages for consistent usage |
| Error messages | Generic messages in many places | Expand error library with actionable guidance |

---

## Future Value-Add Ideas

### Medium Effort, High Impact

1. **Anonymous Follow-up Questions**
   - Creator can ask clarifying questions to anonymous respondents
   - Respondent can reply while staying anonymous

2. **Participant Segments**
   - Tag participants (team, department, location)
   - Filter analysis by segment
   - Compare segments

3. **Goal Tracking** (see `SPEC_goals_and_actions.md`)
   - Set improvement goals for recurring conversations
   - Track progress across conversation instances
   - Only for recurring/collection conversations

4. **AI-Suggested Actions** (see `SPEC_goals_and_actions.md`)
   - Move from insights to recommendations
   - Human-in-the-loop approval before tracking
   - Context-aware suggestions

### Longer Term / Strategic

5. **Benchmarking**
   - Compare results to industry/company-size benchmarks
   - "Your response rate is above average"

6. **Integration Ecosystem** (builds on External API)
   - Jira (create tickets from feedback)
   - Notion (sync insights)
   - Calendar (schedule recurring)
   - HRIS (auto-invite new hires, pulse surveys)

7. **Multi-language Support**
   - Translate questions and UI
   - Analyze responses in multiple languages

---

## Priority Summary

| Priority | Items | Effort | Impact |
|----------|-------|--------|--------|
| **Essential** | Response Threshold | Medium | Critical for trust |
| **Quick Wins** | Keyboard Shortcuts | Small | Power user value |
| **High Impact** | Mobile JoinPage, Analysis Comparison | Medium-Large | Unlock new use cases |
| **Foundation** | Accessibility | Medium | Required for enterprise |
| **Engagement** | Response Analytics, Real-time Updates | Medium | Creator retention |

---

## Technical Notes

### Code Quality Strengths
- Consistent design tokens (`src/styles/tokens.ts`)
- Well-defined TypeScript types (`src/types/index.ts`)
- React context for state management (Auth, Organization, Theme, ConversationForm)
- Custom hooks for reusable logic (useOnboarding, usePageTitle, useDraftResponses)

### Areas for Improvement
- Some components very long (JoinPage: 1860 lines, ConversationDetailPage: 2277 lines) - consider extraction
- Inline styles prevalent - could migrate to CSS modules
- Limited test coverage

---

## Notes

- Last updated: Feb 14, 2026
- Priorities may shift based on user feedback and business needs

## Related Documents

- `EXTERNAL_API_DESIGN.md` - Detailed external API design for third-party integrations
- `SPEC_goals_and_actions.md` - AI-suggested actions and goal tracking spec
- `SPEC_response_threshold.md` - Response threshold for anonymity protection
- `PRODUCT_STRATEGY.md` - Comprehensive product strategy and technical notes
