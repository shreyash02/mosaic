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

---

## Completed (as of Feb 2026)

- [x] Onboarding (Getting Started checklist + contextual hints)
- [x] Email notifications (closing warning, closed, analysis ready, periodic analysis, recurring instance)
- [x] Slack notifications (participant DMs + conversation events)
- [x] Conversation archiving
- [x] Bulk operations (select, close, archive, delete)
- [x] Recurring template pause/resume + inline pattern editing
- [x] Timezone display + human-friendly dates
- [x] Response editing for participants
- [x] Batch invitation uploads via CSV
- [x] QR code/poster generation
- [x] Help documentation (10 topics + contextual hints)
- [x] Scheduled activation ("Launch Monday at 9am")
- [x] Full-text search across conversations, collections, and analyses
- [x] Skeleton loaders for consistent loading states
- [x] Forgot password flow with email reset
- [x] Email verification for sensitive actions
- [x] Profile page and settings (notifications, security)
- [x] Reminders for non-respondents
- [x] Announcements to participants
- [x] Preview/dry-run page for creators to test participant experience
- [x] Centralized access control for conversations
- [x] Conversation duplication ("Duplicate as draft")
- [x] Slack channel posts (activation, analysis complete)

---

## Remaining Gaps

### Essential (Critical for trust/core UX)

1. **Response Threshold Setting**
   - Protect anonymity when response count is low (<N responses)
   - Spec exists at `SPEC_response_threshold.md` - needs implementation
   - Critical for trust positioning ("We protect anonymity")
   - Competitors have this as standard

2. **Copy Link Buttons Throughout UI**
   - Currently buried in Share section
   - Need one-click copy on dashboard conversation cards
   - Add to detail page header area
   - Quick win, high friction reduction

### P1 - High Priority

3. **Mobile JoinPage Optimization**
   - QR code use case is mobile-first
   - Touch targets too small (especially radio/checkbox options)
   - Rating slider needs larger touch area
   - Simplified question navigation for mobile
   - Minimum 48px touch targets

4. **CSV Export**
   - PDF export exists, raw data export missing
   - Power users need data for external analysis
   - Add to AnalysisPage alongside PDF

### P2 - Medium Priority

5. **Analysis Comparison View**
   - Side-by-side comparison of 2-3 analyses
   - Delta highlighting (what changed)
   - Collections exist but no comparison UI
   - Key for longitudinal tracking value prop

6. **Response Analytics**
   - Response rate prominently displayed
   - Engagement benchmarks
   - Reminder effectiveness tracking
   - Optimal send time suggestions

7. **Help System Depth**
   - Video walkthroughs for key flows
   - Interactive tutorials
   - Expanded FAQ sections

### P3 - Lower Priority (Polish)

8. **Keyboard Shortcuts**
    - j/k navigation on lists
    - Quick actions (a for activate, c for close)
    - Help modal on ? key

9. **Enhanced Visualizations**
    - Pie charts for poll distributions
    - Word clouds for themes
    - Better rating distribution charts

10. **Smart Defaults**
    - Remember last-used settings per user
    - Suggest duration based on question count

11. **Question Library**
    - Pre-written questions by category
    - Community-contributed templates

12. **Real-time Response Count**
    - WebSocket for live updates during active conversations
    - Creator engagement feature

13. **Custom Branding on Participant Pages**
    - Apply org logo/colors to JoinPage
    - Branded email templates
    - Custom QR code styling

14. **External API** (see `EXTERNAL_API_DESIGN.md`)
    - API key management in settings
    - Public API for campaigns, responses, analysis
    - Webhook support for events

---

## UX Inconsistencies to Address

- Back navigation patterns (buttons vs breadcrumbs) - standardize
- Date formatting (relative vs absolute) - establish clear rules
- Action confirmation patterns - consistent modal usage
- Form validation timing (inline vs submit) - prefer inline

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

| Priority | Items | Effort |
|----------|-------|--------|
| **Essential** | Response Threshold, Copy Link buttons | Small-Medium |
| **Quick Wins** | CSV Export | Small |
| **High Impact** | Mobile JoinPage, Analysis Comparison | Medium-Large |
| **Medium** | Response Analytics, Help System Depth | Medium |

---

## Notes

- Last updated: Feb 14, 2026
- Priorities may shift based on user feedback and business needs

## Related Documents

- `EXTERNAL_API_DESIGN.md` - Detailed external API design for third-party integrations
- `SPEC_goals_and_actions.md` - AI-suggested actions and goal tracking spec
- `SPEC_response_threshold.md` - Response threshold for anonymity protection
- `PRODUCT_STRATEGY.md` - Comprehensive product strategy and technical notes
