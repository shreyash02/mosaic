"""Analysis service for LLM-powered response analysis."""

import time
from typing import List, Dict, Any, Tuple
import numpy as np
from sklearn.cluster import DBSCAN
from openai import OpenAI
from anthropic import Anthropic

from app.core.config import settings
from app.models.response import Response


class AnalysisService:
    """Service for analyzing conversation responses using LLMs."""

    def __init__(self):
        """Initialize the analysis service with API clients."""
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.embedding_model = "text-embedding-3-small"
        self.llm_model = "claude-sonnet-4-5-20250929"

    def analyze_responses(
        self,
        responses: List[Response],
        min_cluster_size: int = 2
    ) -> Dict[str, Any]:
        """
        Analyze responses using embedding-based clustering and LLM summarization.

        Args:
            responses: List of Response objects to analyze
            min_cluster_size: Minimum number of responses to form a cluster

        Returns:
            Analysis results dict with themes, summary, and metadata
        """
        start_time = time.time()

        if not responses:
            return {
                "overall_summary": "No responses to analyze",
                "themes": [],
                "embedding_provider": "openai",
                "embedding_model": self.embedding_model,
                "clustering_algorithm": "dbscan",
                "llm_provider": "anthropic",
                "llm_model": self.llm_model,
                "total_responses_analyzed": 0,
                "num_clusters_found": 0,
                "analysis_duration_ms": int((time.time() - start_time) * 1000)
            }

        # Step 1: Extract response texts
        response_texts = []
        response_objects = []
        for response in responses:
            if response.response_text and response.response_text.strip():
                response_texts.append(response.response_text)
                response_objects.append(response)

        if len(response_texts) < min_cluster_size:
            # Not enough responses for clustering, just summarize
            overall_summary = self._generate_simple_summary(response_texts)
            return {
                "overall_summary": overall_summary,
                "themes": [],
                "embedding_provider": "openai",
                "embedding_model": self.embedding_model,
                "clustering_algorithm": "dbscan",
                "llm_provider": "anthropic",
                "llm_model": self.llm_model,
                "total_responses_analyzed": len(response_texts),
                "num_clusters_found": 0,
                "analysis_duration_ms": int((time.time() - start_time) * 1000)
            }

        # Step 2: Generate embeddings
        embeddings = self._generate_embeddings(response_texts)

        # Step 3: Cluster responses
        clusters = self._cluster_embeddings(embeddings, min_samples=min_cluster_size)

        # Step 4: Analyze each cluster with LLM
        themes = self._analyze_clusters(response_texts, clusters)

        # Step 5: Generate overall summary
        overall_summary = self._generate_overall_summary(response_texts, themes)

        duration_ms = int((time.time() - start_time) * 1000)

        return {
            "overall_summary": overall_summary,
            "themes": themes,
            "embedding_provider": "openai",
            "embedding_model": self.embedding_model,
            "clustering_algorithm": "dbscan",
            "llm_provider": "anthropic",
            "llm_model": self.llm_model,
            "total_responses_analyzed": len(response_texts),
            "num_clusters_found": len(themes),
            "analysis_duration_ms": duration_ms
        }

    def _generate_embeddings(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for texts using OpenAI.

        Args:
            texts: List of text strings

        Returns:
            NumPy array of embeddings
        """
        response = self.openai_client.embeddings.create(
            model=self.embedding_model,
            input=texts
        )

        embeddings = [item.embedding for item in response.data]
        return np.array(embeddings)

    def _cluster_embeddings(
        self,
        embeddings: np.ndarray,
        eps: float = 0.5,
        min_samples: int = 2
    ) -> np.ndarray:
        """
        Cluster embeddings using DBSCAN.

        Args:
            embeddings: NumPy array of embeddings
            eps: Maximum distance for points to be in same cluster
            min_samples: Minimum samples in a cluster

        Returns:
            Array of cluster labels (-1 for noise)
        """
        clustering = DBSCAN(eps=eps, min_samples=min_samples, metric='cosine')
        labels = clustering.fit_predict(embeddings)
        return labels

    def _analyze_clusters(
        self,
        texts: List[str],
        cluster_labels: np.ndarray
    ) -> List[Dict[str, Any]]:
        """
        Analyze each cluster to extract themes and sentiments.

        Args:
            texts: Original response texts
            cluster_labels: Cluster assignments for each text

        Returns:
            List of theme dictionaries
        """
        themes = []

        # Group texts by cluster
        unique_labels = set(cluster_labels)
        # Remove noise label (-1)
        unique_labels.discard(-1)

        for label in sorted(unique_labels):
            cluster_indices = np.where(cluster_labels == label)[0]
            cluster_texts = [texts[i] for i in cluster_indices]

            # Analyze this cluster with Claude
            theme_data = self._analyze_cluster_with_llm(cluster_texts)
            theme_data["frequency"] = len(cluster_texts)
            themes.append(theme_data)

        # Sort themes by frequency (most common first)
        themes.sort(key=lambda x: x["frequency"], reverse=True)

        return themes

    def _analyze_cluster_with_llm(self, cluster_texts: List[str]) -> Dict[str, Any]:
        """
        Use Claude to analyze a cluster of responses.

        Args:
            cluster_texts: List of response texts in the cluster

        Returns:
            Theme data with name and sentiment clusters
        """
        prompt = f"""Analyze the following {len(cluster_texts)} responses and:
1. Identify the main theme they share (2-4 words)
2. Group them by sentiment (positive, negative, or neutral)
3. For each sentiment group, provide a brief summary

Responses:
{chr(10).join(f"{i+1}. {text}" for i, text in enumerate(cluster_texts))}

Return your analysis in this exact JSON format:
{{
  "theme": "Theme Name Here",
  "clusters": [
    {{"sentiment": "positive", "summary": "Brief summary of positive responses", "count": X}},
    {{"sentiment": "negative", "summary": "Brief summary of negative responses", "count": Y}},
    {{"sentiment": "neutral", "summary": "Brief summary of neutral responses", "count": Z}}
  ]
}}

Only include sentiment groups that actually exist in the responses. Each response should be counted in exactly one sentiment group."""

        message = self.anthropic_client.messages.create(
            model=self.llm_model,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        # Extract JSON from response
        response_text = message.content[0].text

        # Try to parse JSON from the response
        import json
        try:
            # Find JSON in the response (it might be wrapped in markdown code blocks)
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.find("```", json_start)
                json_text = response_text[json_start:json_end].strip()
            else:
                # Assume the entire response is JSON
                json_text = response_text.strip()

            result = json.loads(json_text)

            # Filter out empty sentiment clusters
            if "clusters" in result:
                result["clusters"] = [c for c in result["clusters"] if c.get("count", 0) > 0]

            return result
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return {
                "theme": "Miscellaneous Feedback",
                "clusters": [
                    {
                        "sentiment": "neutral",
                        "summary": f"Collection of {len(cluster_texts)} related responses",
                        "count": len(cluster_texts)
                    }
                ]
            }

    def _generate_overall_summary(
        self,
        all_texts: List[str],
        themes: List[Dict[str, Any]]
    ) -> str:
        """
        Generate an overall summary of all responses.

        Args:
            all_texts: All response texts
            themes: Identified themes

        Returns:
            Overall summary text
        """
        if not themes:
            return self._generate_simple_summary(all_texts)

        theme_descriptions = []
        for theme in themes:
            theme_descriptions.append(
                f"- {theme['theme']} ({theme['frequency']} responses)"
            )

        prompt = f"""Summarize the key insights from this feedback analysis in 2-3 sentences.

Total responses: {len(all_texts)}

Main themes identified:
{chr(10).join(theme_descriptions)}

Provide a concise, actionable summary of what these responses reveal."""

        message = self.anthropic_client.messages.create(
            model=self.llm_model,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )

        return message.content[0].text.strip()

    def _generate_simple_summary(self, texts: List[str]) -> str:
        """
        Generate a simple summary when clustering isn't possible.

        Args:
            texts: Response texts

        Returns:
            Summary text
        """
        if not texts:
            return "No responses received."

        # Take a sample if there are many responses
        sample_texts = texts[:10] if len(texts) > 10 else texts

        prompt = f"""Summarize the main points from these {len(texts)} feedback responses in 2-3 sentences:

{chr(10).join(f"{i+1}. {text}" for i, text in enumerate(sample_texts))}
{"..." if len(texts) > 10 else ""}

Provide a concise summary of the key feedback."""

        message = self.anthropic_client.messages.create(
            model=self.llm_model,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )

        return message.content[0].text.strip()
