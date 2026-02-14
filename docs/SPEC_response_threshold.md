# Response Threshold Setting - Design Spec

**Status:** Draft - Discussion in progress
**Created:** 2026-02-13

## Overview

A setting that requires a minimum number of responses before analysis runs and results become viewable. This protects participant anonymity when response counts are low (e.g., if only 1 person responded, their answers are fully identifiable even if marked "anonymous").

## Key Decisions

### Scope
- **Applies to:** Anonymous and semi-anonymous conversations only
- **Does NOT apply to:** Transparent conversations (identity already exposed)
- **Applies to both:** Creator viewing results AND participants viewing results

### Behavior When Threshold Not Met
- Analysis **does not run** at all
- No partial results shown
- Message displayed explaining why results aren't available

### Simplifications (for v1)
- No separate threshold for verbatim responses vs summaries
- Single threshold applies to entire conversation

## Open Questions

### 1. Semi-anonymous vs Fully Anonymous
- Should threshold differ by anonymity level?
- e.g., fully anonymous = 5, semi-anonymous = 3?
- Or same threshold for both?

### 2. Default Threshold Value
- What's the default? 3? 5?
- Should it be configurable globally (org setting) or just per-conversation?

### 3. Open Conversations (non-invite-only)
- No way to know audience size upfront
- Use fixed default threshold?
- Or skip threshold entirely for open conversations?

### 4. Auto-suggest for Invite-only
- Auto-suggest threshold based on invite count
- Formula? e.g., `min(5, ceil(invited_count * 0.5))`
- Or simpler: suggest 3 if invites ≤ 10, suggest 5 if invites > 10?

### 5. Creator Override
- **Option A:** Hard block - no way to see results if threshold not met
- **Option B:** Soft block - creator can acknowledge "I understand participants may be identifiable" and view anyway
- If override exists, should participants be notified?

### 6. Continuous Conversations
- Each periodic analysis must meet threshold independently?
- Or cumulative total across all periods?

### 7. User Messaging
- What message when threshold not met?
  - "Results require at least X responses. Currently Y responses received."
- Where does this appear? Analysis page? Conversation detail?

### 8. UI Placement
- Where in conversation creation flow?
- Privacy step seems logical (alongside anonymity level)
- Or separate "Advanced Settings" section?

## Database Changes (Tentative)

```sql
-- Add to conversations table
ALTER TABLE conversations ADD COLUMN response_threshold INTEGER DEFAULT NULL;
-- NULL = no threshold (for transparent conversations)
-- Value = minimum responses required
```

## Implementation Notes

- Check threshold before triggering analysis (both manual and auto-analyze)
- Check threshold before displaying results on analysis page
- Consider: what if responses are deleted after analysis ran? Re-check on view?

## Related Features

- Anonymity levels (transparent, semi-anonymous, anonymous)
- Auto-analyze on close
- Results access settings (creator_only, participants, public)
