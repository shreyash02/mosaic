# Mosaic Documentation

This directory contains all design and implementation documentation for the Mosaic project.

## Documents

### Planning & Design

1. **[Design Decisions](DESIGN_DECISIONS.md)**
   - User-answered questionnaire about system requirements
   - Primary use case, anonymity models, input types
   - Technology preferences and scale expectations

2. **[System Design](SYSTEM_DESIGN.md)**
   - Complete system architecture
   - Database schema
   - API design
   - Key flows and state machines
   - Security considerations

### Implementation Details

3. **[LLM Analysis Approach](LLM_ANALYSIS_APPROACH.md)**
   - Embedding-based clustering implementation
   - Complete code examples
   - Pipeline architecture
   - Error handling and fallbacks

4. **[Embedding Clustering Feasibility](EMBEDDING_CLUSTERING_FEASIBILITY.md)**
   - Feasibility analysis for MVP
   - Cost comparisons
   - Implementation complexity
   - Algorithm selection rationale

## Quick Reference

### Key Decisions

- **Name**: Mosaic
- **Use Case**: General purpose anonymous feedback
- **Anonymity**: Three levels (fully_anonymous, platform_tracked, revealable)
- **Analysis**: Embedding-based semantic clustering
- **Tech Stack**: FastAPI + React + PostgreSQL + OpenAI + Claude

### Architecture

```
Responses → OpenAI Embeddings → DBSCAN Clustering → Claude Analysis → Themes
```

### MVP Scope (Phase 1)

- User authentication with JWT
- Conversation management (CRUD)
- Single question per conversation
- Text-only responses
- Platform-tracked anonymity only
- Manual close
- Embedding-based analysis
- Invite code access to results

## Navigation

- Start with [Design Decisions](DESIGN_DECISIONS.md) to understand requirements
- Review [System Design](SYSTEM_DESIGN.md) for architecture overview
- See [LLM Analysis Approach](LLM_ANALYSIS_APPROACH.md) for implementation details
- Check [Embedding Feasibility](EMBEDDING_CLUSTERING_FEASIBILITY.md) for technical justification

## Updates

All documentation should be kept up-to-date as the system evolves. When making significant changes to the implementation, update the relevant design documents.
