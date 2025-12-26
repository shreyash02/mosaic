# Mosaic - Design Decisions

This document captures the key design decisions for the Mosaic system. Fill out your answers below and we'll use these to guide the implementation.

---

## 1. Primary Use Case

**Question**: What is the primary use case for Mosaic?

**Options**:
- Workplace feedback (team retrospectives, pulse checks, anonymous suggestions)
- Classroom discussions (student opinions, course feedback)
- Community input (town halls, neighborhood discussions)
- Research (qualitative data collection, surveys)
- General purpose (any use case)

**Your Answer**:

General purpose

---

## 2. Anonymity Model

**Question**: How should we handle user tracking vs anonymity?

**Options**:
- **Complete anonymity**: No tracking at all. Users can submit multiple times. Risk of spam/abuse.
- **Pseudonymous**: Track that *someone* participated (via session token/fingerprint) to limit one response per user, but don't link to identity.
- **Authenticated anonymous**: Users log in (we know who they are) but responses are stored separately and can't be traced back.
- **Deanonymizable**: Option for facilitator to reveal who said what after analysis (if participants consent).

**Your Answer**:

We should have various levels that the users can control. Different levels can be:

- Users are anon when they respond and will stay anon even after that session is closed and results are seen
- Users are anon when they respond and will stay anon even after that session is closed and results are seen, but they are fine with the platform associating the responses to their identity, and nobody else, including the host/facilitator can find out
- Users are anon when they respond, but they concent to being revealed after the results are seen

etc.

---

## 3. Input Structure

**Question**: How should questions/prompts be structured in each container?

**Options**:
- Single open-ended question per container (e.g., "What went well this sprint?")
- Multiple structured questions in one container (e.g., Q1, Q2, Q3 with separate responses)
- Just a topic/title with free-form responses
- Support both single and multi-question formats

**Your Answer**:

Support both single and multi-question formats

---

## 4. Input Types

**Question**: What types of responses should we support?

**Options**:
- Text only (simple, easier to analyze)
- Text + file uploads (images, documents)
- Rich text with formatting
- Structured data (ratings, multiple choice + text)

**Your Answer**:

Text and Ratings, Polls (one or multiple picks)

we can start with text only first

---

## 5. Access & Creation Model

**Question**: Who can create containers and what authentication is required?

**Options**:
- **Anyone can create**: No auth required, just generate invite codes
- **Registered users only**: Must sign up/login to create containers
- **Hybrid**: Can create anonymously with limits, or register for more features

**Your Answer**:

Must sign up/login to create containers

---

## 6. Participation Limits

**Question**: Should there be limits on how many times someone can respond?

**Options**:
- One response per user (requires some form of tracking)
- Unlimited responses (fully anonymous)
- Configurable by facilitator per container

**Your Answer**:

One response per user.

If responses are associated with an identity it is easy to track

If responses are NOT associated with an identity, we could use the invite code as the unique identifier - one respose per code

---

## 7. Real-Time Features

**Question**: What should be visible while the container is still open?

**Options**:
- Nothing (complete blackout until closure)
- Response count only (users see "12 people have responded")
- Live preview of themes (LLM analyzes incrementally as responses come in)
- All responses visible in real-time (like a chat, but anonymous)

**Your Answer**:

Begin with nothing until closure

---

## 8. Time Window Behavior

**Question**: How should time windows work?

**Options**:
- Fixed duration set at creation (e.g., "open for 24 hours")
- Manual close only (facilitator decides when to end)
- Both (auto-close at timer OR manual early close)
- Extendable (facilitator can add more time while open)

**Your Answer**:

auto-close at timer OR manual early close, facilitator can add more time while open

---

## 9. Results Access

**Question**: Who should be able to see the LLM-generated analysis results?

**Options**:
- Anyone with the invite code (all participants)
- Only the facilitator/creator
- Configurable per container (public vs private results)
- Published publicly after analysis (shareable link)

**Your Answer**:

Configurable per container

Based on configuration - it could be either Anyone with the invite code or Published publicly after analysis (shareable link)

---

## 10. LLM Analysis Depth

**Question**: What should the LLM analysis include?

**Options**:
- Summary only (3-5 paragraph overview)
- Themes + summary (extracted common topics with summary)
- Themes + summary + anonymized quotes (examples for each theme)
- Full structured report (sentiment analysis, key insights, action items, quotes)
- Configurable by facilitator

**Your Answer**:

Themes + summary (extracted common topics with summary)

Themes should be ordered by how frequently that was spoken about

Theme also includes the opinion, if some prople mention a theme and their opinion is positive, and others mention the same theme, but their opinion is negative, these should be separated. Maybe under a theme, we can have clusters of opinions.

No quotes

We can refine this as we go

---

## 10a. LLM Analysis Trigger

**Question**: When should the LLM analysis be triggered?

**Options**:
- Automatically when conversation closes (auto-analyze = true)
- Manual trigger only after close (auto-analyze = false)
- Configurable per conversation

**Your Answer**:

Configurable per conversation. The facilitator should be able to choose whether analysis happens automatically when the conversation closes, or if they want to manually trigger it later.

---

## 11. Data Retention

**Question**: How long should we keep data?

**Raw Responses**: Forever, until deleted

**Analysis Results**: Forever, until deleted

**Container Metadata**: Forever, until deleted


---

## 12. Scale Expectations

**Question**: What scale should we design for initially?

**Concurrent Containers**: MVP: 10, later upto 1000

**Participants per Container**: MVP: 20, later upto 10000

**Expected Response Length**: 5-10k characters max for now


---

## 13. Technology Preferences

**LLM Provider**:
- Anthropic Claude (for theme summarization)
- OpenAI (for embeddings)

**Decision**: Use embedding-based semantic clustering
- OpenAI text-embedding-3-small for generating embeddings
- scikit-learn DBSCAN for clustering
- Claude Sonnet 3.5 for theme naming and summarization

This gives us precise clustering, scalability, and cost-effectiveness.

**Frontend Framework**: React

**Backend Framework**: FastAPI, Python

**Database**: Postgres

**Deployment**: MVP: local and fly.io,


---

## Additional Notes

Add any other requirements, constraints, or ideas here:

We might want to create the concept of organisations. organisations will provide another layer of containerisation for conversations.

organisations are not mandatory for a user to be in, users can optionally belong to one or more organisations.