# Attribution System Refactor Plan

> **Status**: Draft / Under Discussion
> **Date**: 2026-02-16

## Problem Statement

The current `anonymity_level` field is overloaded - it controls:
1. Whether identity is tracked (anonymous vs not)
2. Whether creator can see identity (tracked vs revealable)
3. Login requirements (open vs others)

The `revealable` mode was intended for "blind brainstorming with reveal" but is not fully implemented:
- No creator action to reveal identities after close
- API currently leaks `participant_id` based on per-response `reveal_consent`
- No `identities_revealed` flag on conversations

---

## Current State

### Two Fields Control Access Today

| Field | Type | Values | Purpose |
|-------|------|--------|---------|
| `anonymity_level` | enum | `open`, `fully_anonymous`, `platform_tracked`, `revealable` | Controls identity tracking AND login requirements |
| `invite_only` | boolean | true/false | Controls who can respond (anyone vs invited users) |

### Current Behavior Matrix

| anonymity_level | invite_only | Login Required | Who Can Respond | Identity Tracked |
|-----------------|-------------|----------------|-----------------|------------------|
| `open` | false | No | Anyone with link | Only if logged in |
| `open` | true | Yes | Invited users only | Yes |
| `fully_anonymous` | false | No | Anyone with participant code | No |
| `fully_anonymous` | true | No | Anyone with participant code | No |
| `platform_tracked` | false | Yes | Anyone with link | Yes (hidden from creator) |
| `platform_tracked` | true | Yes | Invited users only | Yes (hidden from creator) |
| `revealable` | false | Yes | Anyone with link | Yes (consent to reveal) |
| `revealable` | true | Yes | Invited users only | Yes (consent to reveal) |

---

## Proposed New Model

### Two Independent Dimensions

**Attribution** (who sees identities, when):

| Level | Platform knows | Creator sees | When |
|-------|----------------|--------------|------|
| `anonymous` | No | Never | - |
| `tracked` | Yes | Never | - |
| `revealable` | Yes | After reveal action | Creator triggers post-close |
| `transparent` | Yes | After analysis | Automatic |

**Participation Access** (who can respond):

| Level | Description |
|-------|-------------|
| `link` | Anyone with the shareable link |
| `invite_list` | Only explicitly invited users |
| `participant_codes` | Unique one-time codes |

### New Fields on Conversation Model

```python
attribution = Column(String(50), nullable=False, default='tracked')
# 'anonymous', 'tracked', 'revealable', 'transparent'

participation_access = Column(String(50), nullable=False, default='link')
# 'link', 'invite_list', 'participant_codes'

identities_revealed = Column(Boolean, default=False, nullable=False)
# Only used when attribution='revealable', set to True when creator reveals
```

### Constraints

- `anonymous` requires `participant_codes` (for deduplication without identity)
- `anonymous` + `invite_list` is invalid (invite implies known identity)
- `tracked`, `revealable`, `transparent` require login

### Valid Combinations

| Attribution | Participation | Login Required | Use Case |
|-------------|---------------|----------------|----------|
| `anonymous` | `participant_codes` | No | True anonymity with deduplication |
| `anonymous` | `link` | No | Open anonymous (no deduplication) |
| `tracked` | `link` | Yes | Standard anonymous feedback |
| `tracked` | `invite_list` | Yes | Invited-only anonymous feedback |
| `revealable` | `link` | Yes | Blind brainstorm, reveal later |
| `revealable` | `invite_list` | Yes | Blind brainstorm, invite-only |
| `transparent` | `link` | Yes | Open discussion, auto-attributed |
| `transparent` | `invite_list` | Yes | Invite-only, auto-attributed |

### Migration Mapping

| Old `anonymity_level` | Old `invite_only` | New `attribution` | New `participation_access` |
|-----------------------|-------------------|-------------------|---------------------------|
| `fully_anonymous` | any | `anonymous` | `participant_codes` |
| `platform_tracked` | false | `tracked` | `link` |
| `platform_tracked` | true | `tracked` | `invite_list` |
| `revealable` | false | `revealable` | `link` |
| `revealable` | true | `revealable` | `invite_list` |
| `open` | false | `tracked` | `link` |
| `open` | true | `tracked` | `invite_list` |

---

## Key Use Case: Blind Brainstorming with Reveal

### Intended Flow

```
Creator creates (revealable) → Participants respond → Close → Analyze
                                                              ↓
                                          Creator triggers "Reveal Identities"
                                                              ↓
                                          Analysis shows attributions
```

### Why This Matters

- Avoids seniority bias ("the VP's idea must be good")
- Ideas evaluated on merit alone
- After decisions, people get credit for contributions
- Accountability without upfront bias

### Implementation Requirements

1. **No per-response consent** - participating = consenting (remove checkbox from JoinPage)
2. **Creator action required** - "Reveal Identities" button (only after close)
3. **One-way door** - once revealed, cannot be hidden again
4. **API protection** - never return `participant_id` until `identities_revealed = true`

---

## Implementation Phases

### Phase 1: Database Migration
- Add `attribution`, `participation_access`, `identities_revealed` columns
- Migrate existing data from `anonymity_level` + `invite_only`
- Keep old fields temporarily for backward compatibility

### Phase 2: Backend Schema/Route Changes
- Add new enums for Attribution and ParticipationAccess
- Add validation for valid combinations
- Update participant_id exposure logic in responses
- Add `POST /conversations/{id}/reveal` endpoint

### Phase 3: Frontend Changes
- Update CreateConversationPage with two dropdowns
- Remove `reveal_consent` checkbox from JoinPage
- Add "Reveal Identities" button to ConversationDetailPage
- Update AnalysisPage to show attributions when revealed

### Phase 4: Cleanup
- Remove deprecated `anonymity_level` and `invite_only` fields
- Update all references

---

## Open Questions

1. Should we keep `invite_only` as a separate boolean or merge into `participation_access`?
2. What happens to existing `revealable` conversations with `reveal_consent` data?
3. Should `transparent` auto-reveal after ANY analysis or only after manual analysis trigger?

---

## Files to Modify

### Backend
- `backend/app/models/conversation.py` - Add new columns
- `backend/app/schemas/conversation.py` - Add enums, update schemas
- `backend/app/routes/conversations.py` - Add reveal endpoint, update CRUD
- `backend/app/routes/responses.py` - Update participant_id logic (line 1233)
- `backend/alembic/versions/` - New migration

### Frontend
- `frontend/src/types/index.ts` - Add enums, update interfaces
- `frontend/src/pages/CreateConversationPage.tsx` - Two dropdowns
- `frontend/src/pages/JoinPage.tsx` - Remove checkbox, update messaging
- `frontend/src/pages/ConversationDetailPage.tsx` - Add reveal button
- `frontend/src/pages/AnalysisPage.tsx` - Show attributions
