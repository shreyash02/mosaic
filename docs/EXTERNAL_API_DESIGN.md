# Mosaic External API Design

## Overview

This document outlines the design for exposing Mosaic's feedback collection and analysis capabilities to external products and services via a public API.

**Use cases:**
- Product feedback widgets embedded in apps
- HRIS integrations for employee pulse surveys
- Customer review aggregation and analysis
- Event feedback collection via third-party event platforms
- Research tools collecting and analyzing qualitative data

---

## Core Resources ("Nouns")

| Resource | Description | Internal Mapping |
|----------|-------------|------------------|
| **Campaign** | A feedback collection container | `Conversation` |
| **Question** | A prompt within a campaign | `Question` |
| **Response** | A participant's answer | `Response` |
| **Analysis** | AI-generated insights | `Analysis` |
| **Webhook** | Event notification endpoint | New entity |
| **APIKey** | Authentication credential | New entity |

### Why "Campaign" instead of "Conversation"?

"Campaign" is clearer for external API consumers and more universal across use cases (feedback campaigns, survey campaigns, review campaigns).

---

## API Endpoints

### Authentication

All endpoints require API key authentication via header:
```
Authorization: Bearer sk_live_xxxxx
```

Keys have scopes: `campaigns:read`, `campaigns:write`, `responses:read`, `responses:write`, `analysis:read`, `webhooks:manage`

---

### 1. Campaigns

```
POST   /v1/campaigns                    # Create campaign
GET    /v1/campaigns                    # List campaigns (paginated)
GET    /v1/campaigns/{id}               # Get campaign details
PATCH  /v1/campaigns/{id}               # Update campaign
DELETE /v1/campaigns/{id}               # Delete campaign
POST   /v1/campaigns/{id}/activate      # Start accepting responses
POST   /v1/campaigns/{id}/close         # Stop accepting responses
```

#### Create Campaign Request
```json
{
  "name": "Q1 Product Feedback",
  "description": "Gathering feedback on new features",
  "questions": [
    {
      "text": "What do you like most about the new dashboard?",
      "type": "text",
      "required": true
    },
    {
      "text": "How would you rate the new experience?",
      "type": "rating",
      "required": true,
      "options": { "min": 1, "max": 5, "labels": ["Poor", "Excellent"] }
    }
  ],
  "settings": {
    "auto_close_after_hours": 168,
    "auto_analyze": true,
    "timezone": "America/New_York"
  }
}
```

#### Campaign Response
```json
{
  "id": "camp_abc123",
  "name": "Q1 Product Feedback",
  "status": "draft",
  "response_link": "https://mosaic.app/j/ABCD1234",
  "response_count": 0,
  "created_at": "2026-02-12T10:00:00Z",
  "questions": [...],
  "settings": {...}
}
```

---

### 2. Questions

```
POST   /v1/campaigns/{id}/questions           # Add question
GET    /v1/campaigns/{id}/questions           # List questions
PATCH  /v1/campaigns/{id}/questions/{qid}     # Update question
DELETE /v1/campaigns/{id}/questions/{qid}     # Remove question
PUT    /v1/campaigns/{id}/questions/reorder   # Reorder questions
```

#### Question Types

| Type | Description | Options |
|------|-------------|---------|
| `text` | Free-form text response | `max_length` |
| `rating` | Numeric scale | `min`, `max`, `labels` |
| `single_choice` | Select one option | `choices[]` |
| `multiple_choice` | Select multiple | `choices[]`, `max_selections` |

---

### 3. Responses

Two collection modes supported:

#### Mode A: Server-to-Server (Push)
Your service collects responses, then submits to Mosaic in batches.

```
POST   /v1/campaigns/{id}/responses           # Submit responses (batch)
GET    /v1/campaigns/{id}/responses           # Retrieve responses
GET    /v1/campaigns/{id}/responses/stats     # Response statistics
```

##### Batch Submit Request
```json
{
  "responses": [
    {
      "participant_id": "user_123",        // Optional, for tracking
      "submitted_at": "2026-02-12T10:30:00Z",
      "answers": [
        { "question_id": "q_1", "text": "Love the new search!" },
        { "question_id": "q_2", "rating": 5 }
      ]
    },
    {
      "answers": [
        { "question_id": "q_1", "text": "Navigation could be clearer" },
        { "question_id": "q_2", "rating": 3 }
      ]
    }
  ]
}
```

#### Mode B: Direct Collection (Embed)
Mosaic collects responses directly via embedded widget or links.

```
GET    /v1/campaigns/{id}/embed              # Get embed code/config
POST   /v1/campaigns/{id}/response-links     # Generate unique response links
```

##### Embed Config Response
```json
{
  "iframe_url": "https://mosaic.app/embed/camp_abc123",
  "script_url": "https://mosaic.app/js/embed.js",
  "config": {
    "campaign_id": "camp_abc123",
    "theme": "light"
  }
}
```

---

### 4. Analysis

```
POST   /v1/campaigns/{id}/analyze             # Trigger analysis
GET    /v1/campaigns/{id}/analysis            # Get full analysis
GET    /v1/campaigns/{id}/analysis/summary    # Summary only
GET    /v1/campaigns/{id}/analysis/insights   # Surprising insights only
GET    /v1/campaigns/{id}/analysis/questions  # Per-question breakdown
```

#### Analysis Response
```json
{
  "id": "anl_xyz789",
  "campaign_id": "camp_abc123",
  "status": "completed",
  "completed_at": "2026-02-12T12:00:00Z",
  "total_responses": 47,
  "summary": "Participants expressed strong appreciation for the new dashboard...",
  "insights": [
    {
      "title": "Speed vs. Features Trade-off",
      "description": "Users who praised speed also mentioned missing features..."
    }
  ],
  "questions": [
    {
      "question_id": "q_1",
      "question_text": "What do you like most?",
      "response_count": 47,
      "themes": [
        {
          "name": "Search Improvements",
          "frequency": 18,
          "summary": "Users highlighted faster, more accurate search...",
          "sentiment": "positive"
        }
      ]
    },
    {
      "question_id": "q_2",
      "question_text": "How would you rate?",
      "response_count": 47,
      "stats": {
        "average": 4.2,
        "distribution": { "1": 2, "2": 3, "3": 5, "4": 15, "5": 22 }
      }
    }
  ]
}
```

---

### 5. Webhooks

```
POST   /v1/webhooks                    # Register webhook
GET    /v1/webhooks                    # List webhooks
GET    /v1/webhooks/{id}               # Get webhook details
PATCH  /v1/webhooks/{id}               # Update webhook
DELETE /v1/webhooks/{id}               # Delete webhook
POST   /v1/webhooks/{id}/test          # Send test event
```

#### Webhook Events

| Event | Description | Payload |
|-------|-------------|---------|
| `campaign.activated` | Campaign started accepting responses | Campaign object |
| `campaign.closed` | Campaign stopped accepting responses | Campaign object |
| `responses.received` | New responses submitted (batched, max 5min delay) | Count + campaign_id |
| `analysis.started` | Analysis began processing | Campaign ID |
| `analysis.completed` | Analysis ready | Analysis object |

#### Webhook Payload
```json
{
  "event": "analysis.completed",
  "timestamp": "2026-02-12T12:00:00Z",
  "data": {
    "campaign_id": "camp_abc123",
    "analysis_id": "anl_xyz789"
  }
}
```

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Default anonymity** | `fully_anonymous` | Simplifies privacy; external integrators don't need to manage participant identity |
| **ID format** | Prefixed (`camp_`, `q_`, `anl_`) | Clear resource type at a glance |
| **Pagination** | Cursor-based | Stable for real-time data |
| **Rate limits** | 1000 req/hr default | Prevents abuse, higher tiers for enterprise |
| **Versioning** | URL path (`/v1/`) | Clear, easy to deprecate |

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Create `api_keys` table (id, user_id, name, key_hash, scopes, last_used_at, created_at)
- [ ] API key auth middleware
- [ ] Rate limiting per key
- [ ] Basic Campaign CRUD (wrapping Conversation)

### Phase 2: Response Collection
- [ ] Batch response submission endpoint
- [ ] Response stats endpoint
- [ ] Embed configuration endpoint

### Phase 3: Analysis
- [ ] Expose analysis trigger
- [ ] Expose analysis results (summary, insights, per-question)

### Phase 4: Webhooks
- [ ] Create `webhooks` table
- [ ] Webhook registration endpoints
- [ ] Event dispatch system
- [ ] Retry logic with exponential backoff

### Phase 5: Polish
- [ ] API documentation (OpenAPI/Swagger)
- [ ] SDK generation (Python, JS)
- [ ] Usage dashboard in settings
- [ ] API key management UI

---

## Security Considerations

1. **Key rotation**: Support creating new keys before revoking old ones
2. **Scope restrictions**: Minimal scopes by default
3. **IP allowlisting**: Optional for enterprise
4. **Audit logging**: Log all API calls with key ID
5. **Response data access**: Only allow if campaign allows it (most will be anonymous)

---

## Open Questions

1. Should we support campaign templates via API?
2. Should continuous campaigns (periodic analysis) be exposed in v1?
3. Pricing model: per-response, per-campaign, or per-analysis?

---

## Related Documents

- `PRODUCT_ROADMAP.md` - Overall product roadmap
- `backend/app/routes/` - Current internal API patterns
- `backend/app/services/analysis_service.py` - Analysis implementation

---

*Last updated: Feb 12, 2026*
