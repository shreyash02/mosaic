# Embedding-Based Clustering - Feasibility Analysis for MVP

## Overview

This document analyzes the feasibility of implementing embedding-based semantic clustering for response analysis in the Mosaic MVP.

---

## Implementation Components

### 1. Embedding Generation

**API Options:**

| Provider | Model | Dimensions | Cost (per 1M tokens) | Notes |
|----------|-------|------------|---------------------|-------|
| OpenAI | text-embedding-3-small | 1536 | $0.02 | Fast, cheap, good quality |
| OpenAI | text-embedding-3-large | 3072 | $0.13 | Higher quality, slower |
| Cohere | embed-english-v3.0 | 1024 | $0.10 | Good for clustering |
| Voyage AI | voyage-2 | 1024 | $0.12 | Optimized for retrieval |

**Recommendation:** OpenAI `text-embedding-3-small` - best price/performance ratio

**Python Implementation:**
```python
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key="...")

async def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for a list of texts.

    OpenAI allows batch processing up to 2048 texts per request.
    """
    response = await client.embeddings.create(
        model="text-embedding-3-small",
        input=texts,
        encoding_format="float"
    )

    return [item.embedding for item in response.data]

# For a conversation with 20 responses:
responses = ["response 1", "response 2", ..., "response 20"]
embeddings = await generate_embeddings(responses)
# Returns: [[0.123, -0.456, ...], [0.234, -0.567, ...], ...]
```

**Time:** ~0.5-1 second for 20 responses
**Cost:** Negligible (~$0.0001 for 20 responses of 100 words each)

---

### 2. Clustering Algorithm

**Options:**

#### Option A: DBSCAN (Density-Based Spatial Clustering)
**Pros:**
- Automatically determines number of clusters
- Identifies outliers (noise points)
- Works well for varying cluster sizes
- No need to specify K upfront

**Cons:**
- Requires tuning `eps` (distance threshold) and `min_samples`
- Can create too many small clusters or too few large ones

**Python Implementation:**
```python
from sklearn.cluster import DBSCAN
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

def cluster_with_dbscan(embeddings: list[list[float]], eps: float = 0.3, min_samples: int = 2):
    """
    Cluster embeddings using DBSCAN.

    Args:
        embeddings: List of embedding vectors
        eps: Maximum distance between samples (0.2-0.5 typical for cosine similarity)
        min_samples: Minimum samples in a cluster

    Returns:
        cluster_labels: Array of cluster IDs (-1 = outlier/noise)
    """
    embeddings_array = np.array(embeddings)

    # Use cosine similarity (better for text embeddings than Euclidean)
    similarity_matrix = cosine_similarity(embeddings_array)
    distance_matrix = 1 - similarity_matrix  # Convert to distance

    clustering = DBSCAN(eps=eps, min_samples=min_samples, metric='precomputed')
    cluster_labels = clustering.fit_predict(distance_matrix)

    return cluster_labels

# Example output for 20 responses:
# [0, 0, 0, 1, 1, 1, 2, 2, -1, 0, 1, 3, 3, -1, 2, 0, 1, 3, -1, 2]
# Cluster 0: 5 responses
# Cluster 1: 5 responses
# Cluster 2: 4 responses
# Cluster 3: 3 responses
# Outliers (-1): 3 responses
```

#### Option B: K-Means
**Pros:**
- Simple, fast, predictable
- Always produces exactly K clusters
- Works well when you know approximate theme count

**Cons:**
- Must specify K (number of clusters) upfront
- Sensitive to initialization
- Assumes spherical clusters

**Python Implementation:**
```python
from sklearn.cluster import KMeans

def cluster_with_kmeans(embeddings: list[list[float]], n_clusters: int = 5):
    """
    Cluster embeddings using K-Means.

    Args:
        embeddings: List of embedding vectors
        n_clusters: Number of clusters to create
    """
    embeddings_array = np.array(embeddings)

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    cluster_labels = kmeans.fit_predict(embeddings_array)

    return cluster_labels, kmeans.inertia_  # inertia_ = within-cluster sum of squares
```

#### Option C: Hierarchical Agglomerative Clustering
**Pros:**
- Creates dendrogram (tree of clusters)
- Can cut at any level to get different K values
- Deterministic

**Cons:**
- Slower (O(n³) for some methods)
- Memory intensive for large datasets

**Recommendation for MVP:** DBSCAN
- Automatic cluster detection
- Handles outliers well (some responses might not fit any theme)
- Good for exploratory analysis

---

### 3. Theme Naming & Summarization with LLM

Once we have clusters, use LLM to analyze each cluster:

```python
async def analyze_cluster(
    cluster_responses: list[str],
    question_text: str,
    llm_client
) -> dict:
    """
    Use LLM to name theme and determine sentiment for a cluster.

    Args:
        cluster_responses: All responses in this cluster
        question_text: The question being analyzed
        llm_client: Claude or GPT client
    """

    prompt = f"""
You are analyzing responses to this question: "{question_text}"

Here are {len(cluster_responses)} responses that are semantically similar:

{chr(10).join(f"{i+1}. {resp}" for i, resp in enumerate(cluster_responses))}

Tasks:
1. Identify the common theme across these responses (2-4 words)
2. Determine the predominant sentiment (positive/negative/neutral)
3. Write a 2-sentence summary of this theme
4. Count how many responses have each sentiment

Return JSON:
{{
  "theme": "Clear, concise theme name",
  "sentiment_distribution": {{
    "positive": <count>,
    "negative": <count>,
    "neutral": <count>
  }},
  "summary": "2-sentence summary of this theme and its sentiment nuances"
}}
"""

    response = await llm_client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    return json.loads(response.content[0].text)
```

---

## Complete Pipeline

```python
async def analyze_conversation_with_embeddings(
    conversation_id: str,
    question_id: str
) -> dict:
    """
    Full pipeline: embeddings → clustering → LLM analysis
    """

    # 1. Fetch responses from database
    responses = await db.fetch_responses(conversation_id, question_id)
    response_texts = [r.response_text for r in responses]

    # 2. Generate embeddings
    embeddings = await generate_embeddings(response_texts)

    # 3. Cluster responses
    cluster_labels = cluster_with_dbscan(embeddings, eps=0.35, min_samples=2)

    # 4. Group responses by cluster
    clusters = {}
    outliers = []

    for idx, label in enumerate(cluster_labels):
        if label == -1:
            outliers.append(response_texts[idx])
        else:
            if label not in clusters:
                clusters[label] = []
            clusters[label].append(response_texts[idx])

    # 5. Analyze each cluster with LLM
    themes = []
    for cluster_id, cluster_responses in clusters.items():
        analysis = await analyze_cluster(
            cluster_responses,
            question_text,
            claude_client
        )

        themes.append({
            "theme": analysis["theme"],
            "frequency": len(cluster_responses),
            "sentiment_distribution": analysis["sentiment_distribution"],
            "summary": analysis["summary"]
        })

    # 6. Handle outliers (if any)
    if outliers:
        # Option A: Create "Other/Miscellaneous" theme
        # Option B: Analyze individually
        # Option C: Ignore if too few
        if len(outliers) >= 3:
            outlier_analysis = await analyze_cluster(outliers, question_text, claude_client)
            themes.append({
                "theme": f"Other: {outlier_analysis['theme']}",
                "frequency": len(outliers),
                "sentiment_distribution": outlier_analysis["sentiment_distribution"],
                "summary": outlier_analysis["summary"]
            })

    # 7. Sort themes by frequency
    themes.sort(key=lambda x: x["frequency"], reverse=True)

    return {
        "themes": themes,
        "total_responses": len(response_texts),
        "num_themes": len(themes)
    }
```

---

## Cost Analysis

### For MVP (20 responses, avg 100 words each)

| Component | Provider | Cost per Analysis | Notes |
|-----------|----------|------------------|-------|
| Embeddings | OpenAI text-embedding-3-small | ~$0.0001 | 20 responses × 100 words |
| Clustering | Local (scikit-learn) | $0 | Runs in Python |
| LLM Theme Analysis | Claude Sonnet | ~$0.01 - $0.03 | 3-5 clusters × 200 tokens each |
| **Total per conversation** | | **~$0.01 - $0.03** | Very affordable |

### At Scale (1000 responses)

| Component | Cost |
|-----------|------|
| Embeddings | ~$0.005 |
| Clustering | $0 |
| LLM Analysis (assume 15 clusters) | ~$0.15 - $0.30 |
| **Total** | **~$0.16 - $0.31** |

**Comparison with Pure LLM:**
- Pure LLM (all 1000 responses in context): $2-5+ depending on model
- **Savings: ~90% at scale**

---

## Implementation Complexity

### Required Python Libraries
```bash
pip install openai scikit-learn numpy anthropic
```

All are mature, well-documented libraries.

### Code Complexity
- **Embedding generation**: ~20 lines
- **Clustering**: ~30 lines
- **LLM analysis**: ~40 lines
- **Pipeline orchestration**: ~60 lines
- **Total new code**: ~150 lines

**Estimate: 4-6 hours of implementation + 2-4 hours of testing/tuning**

---

## Challenges & Solutions

### Challenge 1: Tuning DBSCAN parameters
**Problem:** `eps` and `min_samples` need tuning per use case

**Solutions:**
1. **Start with defaults**: `eps=0.35, min_samples=2` works for most text
2. **Adaptive tuning**: Calculate optimal eps using k-distance graph
3. **User feedback loop**: Let facilitators adjust in UI (advanced feature)

```python
def estimate_optimal_eps(embeddings, k=2):
    """
    Estimate optimal eps using k-nearest neighbors distance.
    """
    from sklearn.neighbors import NearestNeighbors

    embeddings_array = np.array(embeddings)
    neighbors = NearestNeighbors(n_neighbors=k, metric='cosine')
    neighbors.fit(embeddings_array)

    distances, _ = neighbors.kneighbors(embeddings_array)
    distances = np.sort(distances[:, -1], axis=0)

    # Use elbow method or percentile
    optimal_eps = np.percentile(distances, 90)
    return optimal_eps
```

### Challenge 2: Too many small clusters
**Problem:** DBSCAN might create 10+ tiny clusters from 20 responses

**Solutions:**
1. Increase `min_samples` (e.g., min_samples=3)
2. Post-processing: merge clusters < 2 responses into "Other"
3. Fall back to K-means with fixed K=3-5 for small datasets

### Challenge 3: All responses in one cluster
**Problem:** If all responses are very similar, get 1 massive cluster

**Solutions:**
1. Detect this scenario: `if num_clusters == 1`
2. Fall back to pure LLM analysis (ask it to find sub-themes)
3. Use hierarchical clustering to split further

---

## Comparison: Embedding vs Pure LLM

### Embedding-Based Clustering

**Example Output:**
```json
{
  "themes": [
    {
      "theme": "Communication Improvements",
      "frequency": 8,
      "sentiment_distribution": {"positive": 7, "neutral": 1, "negative": 0},
      "summary": "Most responses highlighted better team communication and more effective meetings. Positive sentiment throughout."
    },
    {
      "theme": "Meeting Overload",
      "frequency": 5,
      "sentiment_distribution": {"positive": 0, "neutral": 1, "negative": 4},
      "summary": "Several responses mentioned too many meetings disrupting focus time. Predominantly negative sentiment."
    },
    ...
  ]
}
```

**Characteristics:**
- Precise semantic grouping
- Quantitative metrics (frequency, sentiment counts)
- Scalable to thousands of responses
- 2-step process (cluster → analyze)

### Pure LLM Analysis

**Example Output:**
```json
{
  "themes": [
    {
      "theme": "Team Collaboration",
      "frequency": "common",
      "clusters": [
        {"sentiment": "positive", "summary": "...", "count": "several"},
        {"sentiment": "negative", "summary": "...", "count": "a few"}
      ]
    },
    ...
  ]
}
```

**Characteristics:**
- Natural language understanding
- More interpretive / qualitative
- Less precise metrics ("several" vs exact count)
- Single-step process
- Better for nuanced context

---

## Recommendation for MVP

### Option 1: Start with Embeddings (Recommended)
**Why:**
- Only ~150 lines of code (~6 hours work)
- Better scalability from day one
- More precise clustering
- Lower costs at scale
- Good learning experience with embeddings

**Dependencies:**
- OpenAI API key (for embeddings)
- Claude API key (for summarization)
- scikit-learn, numpy

**Risk:** Slightly more complex, need to tune parameters

---

### Option 2: Start with Pure LLM, Add Embeddings Later
**Why:**
- Faster MVP (2-3 hours vs 6 hours)
- Single API provider (Claude only)
- Simpler code
- Good enough for 20 responses

**Dependencies:**
- Claude API key only

**Risk:** Expensive at scale, requires refactor later

---

## My Recommendation

**Go with embeddings for MVP** because:

1. **Marginal complexity increase** (6 hours vs 3 hours) - worth it
2. **Future-proof** - won't need to refactor at 100+ responses
3. **Better results** - more objective clustering
4. **Cost savings** - significant at scale
5. **Learning opportunity** - embeddings are valuable for future features (search, recommendations, etc.)

**Implementation Plan:**
1. Set up OpenAI API for embeddings
2. Implement DBSCAN clustering with default params
3. Use Claude for theme naming/summarization
4. Add parameter tuning as post-MVP enhancement

**Fallback:** If clustering produces poor results (too many/few clusters), log a warning and fall back to pure LLM analysis for that conversation.

---

## Code Structure

```
backend/
  services/
    analysis_service.py
      - analyze_conversation() # Main entry point

    embeddings/
      embedding_provider.py
        - OpenAIEmbeddingProvider
        - (Future: CohereEmbeddingProvider)

      clustering.py
        - DBSCANClustering
        - KMeansClustering
        - auto_cluster() # Smart selection

    llm/
      llm_provider.py
        - ClaudeProvider
        - analyze_cluster()
        - generate_overall_summary()
```

Clean abstraction = easy to swap algorithms later.

---

## Next Steps

1. **Decision:** Embedding-based or Pure LLM for MVP?
2. **If embeddings:** Get OpenAI API key, add to requirements
3. **Implement:** Start with basic pipeline, tune later
4. **Test:** Use sample data to validate clustering quality

What do you think? Should we go with embeddings for the MVP?
