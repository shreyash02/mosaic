# LLM Analysis Approach - Mosaic MVP

## Decision: Embedding-Based Clustering

We'll use **embedding-based semantic clustering** for the MVP to ensure we have the right foundation, even though we'll keep it simple initially.

---

## MVP Implementation

### Architecture

```
Response Texts
    ↓
[1] Generate Embeddings (OpenAI text-embedding-3-small)
    ↓
[2] Cluster Similar Responses (DBSCAN with sensible defaults)
    ↓
[3] Analyze Each Cluster with LLM (Claude Sonnet)
    ↓
[4] Generate Overall Summary (Claude Sonnet)
    ↓
Structured Analysis Results
```

---

## Component Details

### 1. Embedding Generation

**Provider:** OpenAI `text-embedding-3-small`
- **Dimensions:** 1536
- **Cost:** $0.02 per 1M tokens
- **Speed:** ~0.5s for 20 responses

**Implementation:**
```python
from openai import AsyncOpenAI

async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=texts
    )

    return [item.embedding for item in response.data]
```

---

### 2. Clustering Algorithm

**Algorithm:** DBSCAN (Density-Based Spatial Clustering of Applications with Noise)

**Why DBSCAN:**
- Automatically determines number of clusters (no need to specify K)
- Handles outliers gracefully (marks them as noise)
- Works well for varying cluster sizes
- Good for exploratory analysis

**MVP Parameters (simple, sensible defaults):**
```python
eps = 0.35  # Distance threshold (0.3-0.4 works well for text)
min_samples = 2  # Minimum responses to form a cluster
```

**Implementation:**
```python
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def cluster_responses(embeddings: list[list[float]]) -> np.ndarray:
    """
    Cluster embeddings using DBSCAN with sensible defaults.

    Returns:
        Array of cluster labels. -1 indicates outliers/noise.
    """
    embeddings_array = np.array(embeddings)

    # Compute cosine similarity, convert to distance
    similarity = cosine_similarity(embeddings_array)
    distance = 1 - similarity

    # Cluster
    clustering = DBSCAN(
        eps=0.35,
        min_samples=2,
        metric='precomputed'
    )

    return clustering.fit_predict(distance)
```

---

### 3. Theme Analysis per Cluster

**LLM:** Claude 3.5 Sonnet

**For each cluster, we ask Claude to:**
1. Name the theme (2-4 words)
2. Determine sentiment distribution (positive/negative/neutral counts)
3. Write a brief summary

**Prompt Template:**
```python
CLUSTER_ANALYSIS_PROMPT = """
You are analyzing responses to the question: "{question_text}"

Here are {count} semantically similar responses that have been grouped together:

{numbered_responses}

Analyze these responses and return ONLY a JSON object with this exact structure:
{{
  "theme": "2-4 word theme name",
  "sentiment_distribution": {{
    "positive": <integer count>,
    "negative": <integer count>,
    "neutral": <integer count>
  }},
  "summary": "1-2 sentence summary of this theme"
}}

Important:
- The sentiment counts must sum to {count}
- Theme should be concise and descriptive
- Summary should capture the essence and sentiment nuances
- Return ONLY the JSON, no markdown, no explanation
"""
```

**Implementation:**
```python
from anthropic import AsyncAnthropic
import json

async def analyze_cluster(
    responses: list[str],
    question_text: str
) -> dict:
    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    # Format responses with numbers
    numbered = "\n".join(
        f"{i+1}. {resp}"
        for i, resp in enumerate(responses)
    )

    prompt = CLUSTER_ANALYSIS_PROMPT.format(
        question_text=question_text,
        count=len(responses),
        numbered_responses=numbered
    )

    response = await client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1000,
        temperature=0,  # Deterministic for structured output
        messages=[{"role": "user", "content": prompt}]
    )

    # Parse JSON response
    result = json.loads(response.content[0].text)

    return {
        "theme": result["theme"],
        "frequency": len(responses),
        "sentiment_distribution": result["sentiment_distribution"],
        "summary": result["summary"]
    }
```

---

### 4. Overall Summary

After analyzing all clusters, generate a high-level summary:

```python
OVERALL_SUMMARY_PROMPT = """
You have analyzed responses to the question: "{question_text}"

Here are the themes that emerged:

{themes_summary}

Write a 2-3 paragraph overall summary that:
1. Highlights the most prominent themes
2. Notes any interesting patterns or contrasts in sentiment
3. Provides actionable insights if applicable

Keep it concise and focused on key takeaways.
"""

async def generate_overall_summary(
    question_text: str,
    themes: list[dict]
) -> str:
    # Format themes for prompt
    themes_summary = "\n".join(
        f"- {t['theme']} ({t['frequency']} responses): {t['summary']}"
        for t in themes
    )

    prompt = OVERALL_SUMMARY_PROMPT.format(
        question_text=question_text,
        themes_summary=themes_summary
    )

    response = await client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    return response.content[0].text
```

---

## Complete Pipeline

```python
async def analyze_conversation_question(
    conversation_id: str,
    question: Question
) -> dict:
    """
    Full analysis pipeline for one question in a conversation.
    """
    # 1. Fetch responses from database
    responses = await get_responses_for_question(
        conversation_id,
        question.id
    )

    if not responses:
        return {
            "question_id": question.id,
            "question_text": question.question_text,
            "themes": [],
            "overall_summary": "No responses received.",
            "total_responses": 0
        }

    response_texts = [r.response_text for r in responses]

    # 2. Generate embeddings
    embeddings = await generate_embeddings(response_texts)

    # 3. Cluster
    cluster_labels = cluster_responses(embeddings)

    # 4. Group responses by cluster
    clusters = {}
    outliers = []

    for idx, label in enumerate(cluster_labels):
        if label == -1:
            outliers.append(response_texts[idx])
        else:
            clusters.setdefault(label, []).append(response_texts[idx])

    # 5. Analyze each cluster
    themes = []

    for cluster_id, cluster_responses in clusters.items():
        theme_analysis = await analyze_cluster(
            cluster_responses,
            question.question_text
        )
        themes.append(theme_analysis)

    # 6. Handle outliers (if significant)
    if len(outliers) >= 2:
        outlier_analysis = await analyze_cluster(
            outliers,
            question.question_text
        )
        outlier_analysis["theme"] = f"Other: {outlier_analysis['theme']}"
        themes.append(outlier_analysis)

    # 7. Sort by frequency
    themes.sort(key=lambda x: x["frequency"], reverse=True)

    # 8. Generate overall summary
    overall_summary = await generate_overall_summary(
        question.question_text,
        themes
    )

    return {
        "question_id": question.id,
        "question_text": question.question_text,
        "themes": themes,
        "overall_summary": overall_summary,
        "total_responses": len(response_texts),
        "num_themes": len(themes)
    }
```

---

## Multi-Question Conversation Analysis

```python
async def analyze_full_conversation(conversation_id: str) -> dict:
    """
    Analyze all questions in a conversation.
    """
    conversation = await get_conversation(conversation_id)
    questions = await get_questions(conversation_id)

    # Analyze each question
    question_analyses = []
    for question in questions:
        analysis = await analyze_conversation_question(
            conversation_id,
            question
        )
        question_analyses.append(analysis)

    # Generate cross-question insights (optional for MVP)
    # This could identify themes that appear across multiple questions

    return {
        "conversation_id": conversation_id,
        "conversation_title": conversation.title,
        "question_analyses": question_analyses,
        "analyzed_at": datetime.utcnow().isoformat()
    }
```

---

## Error Handling & Fallbacks

### Scenario 1: Too Few Responses (< 3)

```python
if len(responses) < 3:
    # Skip clustering, treat all as one theme
    theme_analysis = await analyze_cluster(
        response_texts,
        question.question_text
    )
    return {
        "themes": [theme_analysis],
        "overall_summary": theme_analysis["summary"]
    }
```

### Scenario 2: All Responses in One Cluster

```python
if len(clusters) == 1:
    # DBSCAN found only one cluster
    # Could fall back to K-means with K=3
    # Or just accept it as one theme
    pass  # Current approach handles this fine
```

### Scenario 3: Too Many Small Clusters

```python
# After clustering, merge clusters with < 2 responses
small_clusters = [c for c in clusters.values() if len(c) < 2]
if small_clusters:
    # Combine into "Miscellaneous" theme
    misc_responses = [r for cluster in small_clusters for r in cluster]
    if len(misc_responses) >= 2:
        misc_analysis = await analyze_cluster(misc_responses, question_text)
        misc_analysis["theme"] = "Miscellaneous"
        themes.append(misc_analysis)
```

---

## Storage in Database

The analysis results are stored in the `analyses` table:

```python
analysis_result = await analyze_full_conversation(conversation_id)

await db.execute(
    """
    INSERT INTO analyses (
        conversation_id,
        overall_summary,
        themes,
        llm_provider,
        llm_model,
        total_responses_analyzed,
        analysis_duration_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    """,
    conversation_id,
    analysis_result["question_analyses"][0]["overall_summary"],
    json.dumps(analysis_result["question_analyses"]),
    "openai+claude",  # embeddings + summarization
    "text-embedding-3-small + claude-3-5-sonnet",
    sum(q["total_responses"] for q in analysis_result["question_analyses"]),
    analysis_duration_ms
)
```

---

## Dependencies

```python
# requirements.txt
openai==1.12.0          # Embeddings
anthropic==0.18.1       # Claude for summarization
scikit-learn==1.4.0     # Clustering (DBSCAN)
numpy==1.26.3           # Array operations
```

---

## Configuration

```python
# .env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# settings.py
class Settings:
    OPENAI_API_KEY: str
    ANTHROPIC_API_KEY: str

    # Clustering parameters (can adjust later)
    DBSCAN_EPS: float = 0.35
    DBSCAN_MIN_SAMPLES: int = 2

    # Analysis limits
    MAX_RESPONSE_LENGTH: int = 10000
    MIN_RESPONSES_FOR_CLUSTERING: int = 3
```

---

## Testing Strategy

### Unit Tests
```python
def test_embedding_generation():
    texts = ["test response 1", "test response 2"]
    embeddings = await generate_embeddings(texts)
    assert len(embeddings) == 2
    assert len(embeddings[0]) == 1536  # OpenAI dimension

def test_clustering():
    # Create synthetic embeddings
    similar_responses = [
        [0.1, 0.2, ...],  # Cluster 1
        [0.11, 0.21, ...],  # Cluster 1
        [0.8, 0.9, ...],  # Cluster 2
        [0.81, 0.91, ...]  # Cluster 2
    ]
    labels = cluster_responses(similar_responses)
    assert len(set(labels)) == 2  # Two clusters
```

### Integration Tests
```python
async def test_full_pipeline():
    # Use sample conversation with known responses
    conversation_id = "test-conv-123"

    # Insert test responses
    await insert_test_responses(conversation_id)

    # Run analysis
    result = await analyze_full_conversation(conversation_id)

    # Verify structure
    assert "question_analyses" in result
    assert len(result["question_analyses"]) > 0
    assert "themes" in result["question_analyses"][0]
```

---

## Performance Expectations

For MVP (20 responses):
- **Embedding generation:** 0.5-1 second
- **Clustering:** < 0.1 second
- **Theme analysis:** 2-3 seconds per cluster (3-5 clusters typical)
- **Overall summary:** 1-2 seconds
- **Total:** ~10-15 seconds

For scale (1000 responses):
- **Embedding generation:** 2-3 seconds
- **Clustering:** 1-2 seconds
- **Theme analysis:** 20-30 seconds (10-15 clusters)
- **Overall summary:** 2-3 seconds
- **Total:** ~30-40 seconds

---

## Future Enhancements (Post-MVP)

1. **Parameter tuning:** Auto-detect optimal DBSCAN parameters
2. **Visualization:** Show embedding clusters in 2D/3D
3. **Re-analysis:** Allow facilitators to regenerate with different parameters
4. **Comparison:** Compare analyses across multiple conversations
5. **Embeddings reuse:** Cache embeddings for multiple analysis runs
6. **Alternative algorithms:** Try hierarchical clustering, HDBSCAN

---

## Summary

**For MVP we use:**
- ✅ OpenAI embeddings (text-embedding-3-small)
- ✅ DBSCAN clustering with default params (eps=0.35, min_samples=2)
- ✅ Claude Sonnet for theme naming and summarization
- ✅ Simple, clean pipeline (~150 lines of core logic)
- ✅ "Good enough" clustering that scales

**Total implementation time:** ~6-8 hours including testing

**Decision:** This is the right foundation. Simple for MVP, but scalable and precise.
