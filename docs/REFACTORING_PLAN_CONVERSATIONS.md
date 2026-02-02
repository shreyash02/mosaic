# Refactoring Plan: conversations.py Route Splitting

**Created:** 2026-01-31
**Priority:** HIGH
**Effort:** Medium (2-4 weeks)
**Status:** Not Started

---

## Problem Statement

**File:** `/Users/shreyas/code/mosaic/backend/app/routes/conversations.py`
**Current Size:** 1,817 lines
**Issue:** Single route file handling too many responsibilities

### Why This Matters

1. **Maintainability**: Hard to navigate and understand the code
2. **Testing**: Difficult to test in isolation
3. **Collaboration**: Higher risk of merge conflicts in team scenarios
4. **Cognitive Load**: Too much to keep in mental model when making changes
5. **Bug Risk**: More opportunities for unintended side effects

---

## Current Structure Analysis

### Endpoint Inventory (21 routes total)

The file currently handles:

#### 1. CRUD Operations (9 endpoints)
- `POST ""` - Create conversation
- `GET ""` - List conversations (with filtering)
- `GET "/participated"` - List conversations user participated in
- `GET "/invitations"` - List user's conversation invitations
- `GET "/by-code/{access_code}"` - Get conversation by access code
- `GET "/{conversation_id}"` - Get conversation by ID
- `PATCH "/{conversation_id}"` - Update conversation
- `DELETE "/{conversation_id}"` - Delete conversation
- `POST "/{conversation_id}/duplicate"` - Duplicate conversation

#### 2. Lifecycle/State Management (5 endpoints)
- `POST "/{conversation_id}/activate"` - Activate conversation
- `POST "/{conversation_id}/close"` - Close conversation
- `POST "/{conversation_id}/extend"` - Extend deadline
- `POST "/{conversation_id}/enable-continuous"` - Enable continuous mode
- `POST "/{conversation_id}/disable-continuous"` - Disable continuous mode

#### 3. Access Control (5 endpoints)
- `POST "/{conversation_id}/participant-codes"` - Generate participant codes
- `GET "/{conversation_id}/participant-codes"` - List participant codes
- `POST "/{conversation_id}/invitations"` - Create invitations
- `GET "/{conversation_id}/invitations"` - List invitations for conversation
- `DELETE "/{conversation_id}/invitations/{invitation_id}"` - Delete invitation

#### 4. Conversation Relationships (2 endpoints)
- `POST "/{conversation_id}/create-follow-up"` - Create follow-up conversation
- `GET "/{conversation_id}/lineage"` - Get conversation lineage tree

### Utility Functions

The file also contains:
- `generate_access_code()` - Generate random access codes
- `send_pending_invitation_emails()` - Send invitation emails
- Various helper logic embedded in endpoints

---

## Proposed New Structure

### Directory Layout

```
backend/app/routes/conversations/
├── __init__.py                 # Re-exports all routers, combines into single router
├── crud.py                     # Create, Read, Update, Delete operations
├── lifecycle.py                # State transitions (activate, close, extend)
├── access_control.py           # Participant codes and invitations
├── relationships.py            # Follow-ups and lineage
├── continuous_mode.py          # Continuous conversation mode management
└── utils.py                    # Shared utility functions
```

### File Responsibilities

#### `crud.py` (~400-500 lines)
**Purpose:** Basic CRUD operations for conversations

**Endpoints:**
- `POST ""` - Create conversation
- `GET ""` - List conversations
- `GET "/participated"` - List participated conversations
- `GET "/by-code/{access_code}"` - Get by access code
- `GET "/{conversation_id}"` - Get by ID
- `PATCH "/{conversation_id}"` - Update conversation
- `DELETE "/{conversation_id}"` - Delete conversation
- `POST "/{conversation_id}/duplicate"` - Duplicate conversation

**Dependencies:**
- Database session
- Current user authentication
- Organization membership checks

**Complexity:** Medium - handles various read patterns and filtering

---

#### `lifecycle.py` (~300-400 lines)
**Purpose:** Conversation state transitions and scheduling

**Endpoints:**
- `POST "/{conversation_id}/activate"` - Activate conversation
- `POST "/{conversation_id}/close"` - Close conversation
- `POST "/{conversation_id}/extend"` - Extend deadline

**Key Logic:**
- State validation (can only activate from draft, etc.)
- Scheduled activation/close_at handling
- Email notifications on activation
- Time zone handling for scheduling

**Dependencies:**
- Email service
- Scheduler service
- Timezone utilities

**Complexity:** Medium-High - involves state machine logic and scheduling

---

#### `access_control.py` (~400-500 lines)
**Purpose:** Managing participant access via codes and invitations

**Endpoints:**
- `POST "/{conversation_id}/participant-codes"` - Generate codes
- `GET "/{conversation_id}/participant-codes"` - List codes
- `POST "/{conversation_id}/invitations"` - Create invitations
- `GET "/{conversation_id}/invitations"` - List invitations (both endpoints)
- `DELETE "/{conversation_id}/invitations/{invitation_id}"` - Delete invitation
- `GET "/invitations"` - List user's invitations (from root)

**Key Logic:**
- Participant code generation
- Email invitation sending
- Invitation state management
- Access validation

**Dependencies:**
- Email service
- Code generation utilities
- Organization membership for access control

**Complexity:** High - handles both code-based and invitation-based access

---

#### `relationships.py` (~300-400 lines)
**Purpose:** Managing conversation relationships (follow-ups, lineage)

**Endpoints:**
- `POST "/{conversation_id}/create-follow-up"` - Create follow-up
- `GET "/{conversation_id}/lineage"` - Get lineage tree

**Key Logic:**
- Follow-up creation with question/invitation copying
- Lineage tree construction
- Parent-child relationship management

**Dependencies:**
- Question model
- Invitation model
- Recursive tree building

**Complexity:** High - involves complex data copying and tree structures

---

#### `continuous_mode.py` (~200-300 lines)
**Purpose:** Continuous conversation mode management

**Endpoints:**
- `POST "/{conversation_id}/enable-continuous"` - Enable continuous mode
- `POST "/{conversation_id}/disable-continuous"` - Disable continuous mode

**Key Logic:**
- Periodic analysis scheduling
- State validation (can't enable on closed conversations)
- Analysis window configuration

**Dependencies:**
- Scheduler service
- Periodic analysis models

**Complexity:** Medium - involves scheduling and state validation

---

#### `utils.py` (~100-150 lines)
**Purpose:** Shared utility functions

**Functions:**
- `generate_access_code()` - Generate random codes
- `send_pending_invitation_emails()` - Send invitation batch
- `validate_conversation_ownership()` - Check user can modify conversation
- `get_conversation_or_404()` - Fetch with error handling
- Other shared helpers

**Complexity:** Low - pure utility functions

---

#### `__init__.py` (~50-100 lines)
**Purpose:** Combine all sub-routers into single `/conversations` router

**Example:**
```python
from fastapi import APIRouter
from . import crud, lifecycle, access_control, relationships, continuous_mode

router = APIRouter()

# Include all sub-routers
router.include_router(crud.router, tags=["conversations-crud"])
router.include_router(lifecycle.router, tags=["conversations-lifecycle"])
router.include_router(access_control.router, tags=["conversations-access"])
router.include_router(relationships.router, tags=["conversations-relationships"])
router.include_router(continuous_mode.router, tags=["conversations-continuous"])

__all__ = ["router"]
```

---

## Migration Strategy

### Phase 1: Preparation (Week 1)

**Goals:**
- Set up new directory structure
- Extract shared utilities first
- Create comprehensive test coverage for current endpoints

**Detailed Plan:** See `/docs/REFACTORING_PHASE1_DETAILED.md`

**Tasks:**
1. Day 1-2: Set up test infrastructure and document endpoint behaviors
2. Day 2-3: Write comprehensive tests for all 21 endpoints
3. Day 3-4: Extract utilities to `utils.py` with unit tests
4. Day 4-5: Establish performance baseline and final validation

**Key Deliverables:**
- Test fixtures and helpers in `tests/fixtures/` and `tests/helpers/`
- Integration tests for all endpoints (100% coverage)
- `backend/app/routes/conversations/utils.py` with 11+ utility functions
- Unit tests for all utilities
- Performance baseline metrics
- PHASE1_VALIDATION.md checklist (must be 100% complete)

**Validation:**
- All tests pass
- Test coverage > 90%
- Performance baselines recorded
- No functionality changes yet

---

### Phase 2: Extract Simple Modules (Week 2)

**Goals:**
- Move low-coupling modules first to build confidence

**Order:**
1. `continuous_mode.py` (least coupled, only 2 endpoints)
2. `relationships.py` (well-isolated follow-up logic)

**For Each Module:**
1. Create new file with appropriate imports
2. Copy endpoints and related logic
3. Update to use shared utilities from `utils.py`
4. Test thoroughly
5. Remove from original file once validated

**Validation:**
- All tests still pass
- Manual testing of moved endpoints
- No regression in functionality

---

### Phase 3: Extract Complex Modules (Week 3)

**Goals:**
- Move more coupled modules with careful dependency management

**Order:**
1. `lifecycle.py` (state transitions)
2. `access_control.py` (codes and invitations)

**Challenges:**
- More cross-cutting dependencies
- Shared state validation logic
- Email service usage across modules

**Approach:**
- Extract shared validation logic to `utils.py`
- Use dependency injection for services
- Careful testing of state transitions

**Validation:**
- Full integration test suite passes
- Manual smoke testing of critical paths
- Performance testing (ensure no regression)

---

### Phase 4: Extract CRUD & Finalize (Week 4)

**Goals:**
- Move remaining CRUD operations
- Create `__init__.py` to combine routers
- Clean up and polish

**Tasks:**
1. Create `crud.py` with remaining endpoints
2. Create `__init__.py` with router composition
3. Update main app to import from new location
4. Remove old `conversations.py` file
5. Update documentation

**Final Structure Validation:**
```python
# In backend/app/main.py
from app.routes.conversations import router as conversations_router
app.include_router(conversations_router, prefix="/api/conversations", tags=["conversations"])
```

**Testing:**
- Full regression test suite
- Load testing to ensure no performance degradation
- Manual E2E testing of all conversation workflows

---

## Risks & Mitigation

### Risk 1: Breaking Changes
**Probability:** Medium
**Impact:** High
**Mitigation:**
- Comprehensive test coverage before starting
- Move one module at a time
- Keep old file until everything is migrated
- Use feature flags if needed

### Risk 2: Circular Dependencies
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Identify shared dependencies early
- Extract to `utils.py` or separate service modules
- Use dependency injection instead of direct imports

### Risk 3: Lost Functionality
**Probability:** Low
**Impact:** High
**Mitigation:**
- Test coverage at 100% before starting
- Code review each module migration
- Manual testing checklist
- Rollback plan for each phase

### Risk 4: Performance Regression
**Probability:** Low
**Impact:** Medium
**Mitigation:**
- Benchmark current performance
- Performance tests after each phase
- Profile any slowdowns immediately

---

## Testing Strategy

### Before Migration
- [ ] Document all current endpoint behaviors
- [ ] Write integration tests for all 21 endpoints
- [ ] Establish performance baseline (response times, DB queries)
- [ ] Create test data fixtures for all scenarios

### During Migration (Per Module)
- [ ] Unit tests for extracted module
- [ ] Integration tests for module endpoints
- [ ] Test interactions with remaining modules
- [ ] Verify no N+1 queries introduced

### After Migration
- [ ] Full regression suite (all 21 endpoints)
- [ ] Load testing (500 req/sec baseline)
- [ ] Manual E2E testing
- [ ] API contract validation (OpenAPI schema unchanged)

---

## Success Criteria

### Functional
- [ ] All 21 endpoints work identically to before
- [ ] All existing tests pass
- [ ] No new bugs introduced
- [ ] API contract (OpenAPI) unchanged

### Non-Functional
- [ ] No performance regression (within 5% of baseline)
- [ ] Code is more maintainable (subjective - ask team)
- [ ] Each module < 500 lines
- [ ] Test coverage maintained or improved

### Documentation
- [ ] README updated with new structure
- [ ] Architecture docs updated
- [ ] API docs regenerated
- [ ] Migration documented for future reference

---

## Alternative Approaches Considered

### Alternative 1: Keep Single File, Add Comments
**Pros:** No refactoring risk
**Cons:** Doesn't solve the core problem
**Verdict:** ❌ Not recommended - technical debt will worsen

### Alternative 2: Split by HTTP Method (GET, POST, etc.)
**Pros:** Simple splitting logic
**Cons:** Poor cohesion - related functionality scattered
**Verdict:** ❌ Not recommended - doesn't improve maintainability

### Alternative 3: Split by Domain Entity (Codes, Invitations, etc.)
**Pros:** High cohesion within modules
**Cons:** Conversations endpoints span multiple entities
**Verdict:** ✅ Recommended - this is our chosen approach (with slight variation for lifecycle)

### Alternative 4: Extract Services, Keep Routes Together
**Pros:** Thin route layer, logic in services
**Cons:** Doesn't solve route file bloat
**Verdict:** ⚠️ Complementary - do this AFTER route splitting

---

## Post-Migration Improvements

Once the split is complete, consider:

1. **Extract Business Logic to Services**
   - Create `ConversationService` for complex operations
   - Keep routes as thin adapters

2. **Add Request/Response DTOs**
   - More granular validation schemas
   - Better API documentation

3. **Implement Repository Pattern**
   - Abstract database queries from route logic
   - Easier to test and mock

4. **Add Middleware for Common Checks**
   - Organization membership validation
   - Conversation ownership checks
   - Rate limiting per conversation

---

## Rollback Plan

If issues arise during migration:

### Immediate Rollback (Same Day)
1. Revert git commits to pre-migration state
2. Redeploy previous version
3. Verify all tests pass
4. Post-mortem to understand failure

### Partial Rollback (Keep Some Modules)
1. Identify problematic module
2. Revert only that module's migration
3. Keep successfully migrated modules
4. Fix issues and re-attempt

### Forward Fix (Preferred)
1. Identify specific bug
2. Fix in new structure
3. Add test to prevent regression
4. Document lesson learned

---

## Questions for Discussion

Before starting the refactoring:

1. **Team Agreement**: Does the team agree this is the right structure?
2. **Timeline**: Is 4 weeks acceptable for this refactoring?
3. **Pairing**: Should this be pair-programmed for knowledge sharing?
4. **Freeze**: Can we freeze feature development in this file during migration?
5. **Deployment**: Can we deploy incrementally or must it be all-at-once?

---

## Checklist: Ready to Start?

- [ ] Team has reviewed and approved this plan
- [ ] 100% test coverage of current endpoints exists
- [ ] Performance baseline established
- [ ] Rollback plan understood and agreed
- [ ] Timeline allocated (4 weeks)
- [ ] Other work in this file is paused/frozen
- [ ] Monitoring/alerting in place for API errors

---

## References

- **Current File:** `/Users/shreyas/code/mosaic/backend/app/routes/conversations.py`
- **Architecture Review:** See architecture-reviewer agent output (2026-01-31)
- **Related Issue:** Technical Debt tracking in PRODUCT_STRATEGY.md
- **FastAPI Best Practices:** https://fastapi.tiangolo.com/tutorial/bigger-applications/

---

## Change Log

- **2026-01-31:** Initial refactoring plan created based on architecture review findings
