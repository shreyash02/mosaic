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

---

## Remaining Gaps

### P1 - High Priority

1. **Response Rate Tools**
   - Reminder email scheduling for non-respondents
   - Optimal send time suggestions
   - Response rate benchmarks/insights

2. **Enhanced Search**
   - Server-side search across conversations
   - Search within analysis results
   - Filter by date range, status, collection

### P2 - Medium Priority

3. **Help System Depth**
   - More detailed help page content
   - Video walkthroughs for key flows
   - Interactive tutorials

4. **Analysis Comparison View**
   - Side-by-side comparison of 2-3 analyses
   - Delta highlighting (what changed)
   - Useful for tracking improvement over time

5. **Mobile Response Optimization**
   - Optimize JoinPage for mobile (QR code flow)
   - Larger touch targets
   - Simplified question navigation
   - Better progress indicator

### P3 - Lower Priority

6. **Custom Branding on Participant Pages**
   - Apply org logo/colors to JoinPage
   - Branded email templates
   - Custom QR code styling

7. **Export Improvements**
   - CSV export of raw responses
   - Scheduled report emails
   - PowerPoint-ready format

8. **External API** (see `EXTERNAL_API_DESIGN.md`)
   - API key management in settings
   - Public API for campaigns, responses, analysis
   - Webhook support for events
   - Enables third-party integrations (HRIS, product feedback widgets, etc.)

---

## Additional Value-Add Ideas

### Quick Wins (Low effort, good impact)

1. **Response Preview for Creators**
   - Let creators preview what participants see before activating
   - Catches mistakes, builds confidence

2. **Keyboard Shortcuts**
   - Power user shortcuts for common actions
   - j/k navigation, quick actions

3. **Conversation Duplication**
   - One-click duplicate any conversation as draft
   - "Run this again" button

4. **Smart Defaults**
   - Remember last-used settings per user
   - Suggest duration based on question count

5. **Response Sentiment Indicator**
   - Quick visual indicator on dashboard (positive/neutral/negative)
   - Before viewing full analysis

### Medium Effort, High Impact

6. **Suggested Questions Library**
   - Pre-written questions by category (retros, engagement, exit interviews)
   - Community-contributed templates

7. **Anonymous Follow-up Questions**
   - Creator can ask clarifying questions to anonymous respondents
   - Respondent can reply while staying anonymous

8. **Participant Segments**
   - Tag participants (team, department, location)
   - Filter analysis by segment
   - Compare segments

9. **Goal Tracking**
    - Set improvement goals ("increase engagement score by 10%")
    - Track progress across conversations

### Longer Term / Strategic

10. **AI-Suggested Actions**
    - Move from insights to recommendations
    - "Based on this feedback, consider..."

11. **Benchmarking**
    - Compare results to industry/company-size benchmarks
    - "Your response rate is above average"

12. **Manager Coaching**
    - Tips based on feedback patterns
    - Resources for addressing common themes

13. **Integration Ecosystem** (builds on External API)
    - Jira (create tickets from feedback)
    - Notion (sync insights)
    - Calendar (schedule recurring)
    - HRIS (auto-invite new hires, pulse surveys)

14. **Multi-language Support**
    - Translate questions and UI
    - Analyze responses in multiple languages

---

## Notes

- Last updated: Feb 12, 2026
- Priorities may shift based on user feedback and business needs

## Related Documents

- `EXTERNAL_API_DESIGN.md` - Detailed external API design for third-party integrations
