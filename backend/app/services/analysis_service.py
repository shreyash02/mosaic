"""Analysis service for LLM-powered response analysis."""

import time
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
from sklearn.cluster import DBSCAN
from openai import OpenAI
from anthropic import Anthropic

from app.core.config import settings
from app.models.response import Response
from app.models.question import Question


class AnalysisService:
    """Service for analyzing conversation responses using LLMs."""

    def __init__(self):
        """Initialize the analysis service with API clients."""
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.embedding_model = "text-embedding-3-small"
        self.llm_model = "claude-sonnet-4-5-20250929"

    def analyze_conversation(
        self,
        questions: List[Question],
        responses: List[Response],
        min_cluster_size: int = 2
    ) -> Dict[str, Any]:
        """
        Analyze all questions in a conversation with their responses.

        Args:
            questions: List of Question objects
            responses: List of Response objects
            min_cluster_size: Minimum number of responses to form a cluster (for text)

        Returns:
            Analysis results dict with per-question analysis
        """
        start_time = time.time()

        # Group responses by question
        responses_by_question = {}
        for response in responses:
            qid = str(response.question_id)
            if qid not in responses_by_question:
                responses_by_question[qid] = []
            responses_by_question[qid].append(response)

        # Analyze each question
        question_analyses = []
        total_analyzed = 0

        for question in questions:
            qid = str(question.id)
            q_responses = responses_by_question.get(qid, [])

            if not q_responses:
                # No responses for this question
                continue

            # Analyze based on question type
            if question.question_type == 'rating':
                analysis = self._analyze_rating_question(question, q_responses)
            elif question.question_type in ['single_choice', 'multiple_choice']:
                analysis = self._analyze_poll_question(question, q_responses)
            else:  # text
                analysis = self._analyze_text_question(question, q_responses, min_cluster_size)

            question_analyses.append(analysis)
            total_analyzed += len(q_responses)

        duration_ms = int((time.time() - start_time) * 1000)

        # Generate "What Surprised Us" insights
        surprising_insights = self._generate_surprising_insights(questions, responses, question_analyses)

        return {
            "overall_summary": self._generate_conversation_summary(question_analyses),
            "question_analyses": question_analyses,
            "surprising_insights": surprising_insights,
            "embedding_provider": "openai",
            "embedding_model": self.embedding_model,
            "clustering_algorithm": "dbscan",
            "llm_provider": "anthropic",
            "llm_model": self.llm_model,
            "total_responses_analyzed": total_analyzed,
            "num_clusters_found": sum(len(qa.get("themes", [])) for qa in question_analyses),
            "analysis_duration_ms": duration_ms
        }

    def analyze_conversation_windowed(
        self,
        questions: List[Question],
        responses: List[Response],
        start_time: datetime,
        end_time: datetime,
        min_cluster_size: int = 2
    ) -> Dict[str, Any]:
        """
        Analyze responses within a specific time window.

        This method filters responses by their submitted_at timestamp before
        running the standard analysis. Used for periodic analysis of continuous
        conversations.

        Args:
            questions: List of Question objects
            responses: List of all Response objects for the conversation
            start_time: Start of analysis window (UTC)
            end_time: End of analysis window (UTC)
            min_cluster_size: Minimum number of responses to form a cluster

        Returns:
            Analysis results dict with per-question analysis
        """
        # Ensure start_time and end_time are naive (UTC) for comparison
        # Database stores naive UTC datetimes
        if start_time.tzinfo is not None:
            start_time = start_time.replace(tzinfo=None)
        if end_time.tzinfo is not None:
            end_time = end_time.replace(tzinfo=None)

        # Filter responses by time window
        # Need to handle timezone-aware submitted_at from response objects
        def normalize_datetime(dt):
            """Convert timezone-aware datetime to naive UTC."""
            if dt is None:
                return None
            if dt.tzinfo is not None:
                return dt.replace(tzinfo=None)
            return dt

        windowed_responses = [
            r for r in responses
            if r.submitted_at and start_time <= normalize_datetime(r.submitted_at) <= end_time
        ]

        # Use existing analyze_conversation method with filtered responses
        return self.analyze_conversation(questions, windowed_responses, min_cluster_size)

    def _analyze_text_question(
        self,
        question: Question,
        responses: List[Response],
        min_cluster_size: int = 2
    ) -> Dict[str, Any]:
        """
        Analyze text question responses using embedding-based clustering and LLM summarization.

        Args:
            question: Question object
            responses: List of Response objects for this question
            min_cluster_size: Minimum number of responses to form a cluster

        Returns:
            Question analysis dict with themes
        """
        # Extract response texts
        response_texts = []
        for response in responses:
            if response.response_text and response.response_text.strip():
                response_texts.append(response.response_text)

        base_result = {
            "question_id": str(question.id),
            "question_text": question.question_text,
            "question_type": question.question_type,
            "question_image_url": question.question_image_url,
            "response_count": len(response_texts),
            "themes": [],
            "summary": None
        }

        if len(response_texts) < min_cluster_size:
            # Not enough responses for clustering, but still generate a summary
            if response_texts:
                summary = self._generate_simple_summary(response_texts)
                base_result["summary"] = summary
            return base_result

        # Generate embeddings
        embeddings = self._generate_embeddings(response_texts)

        # Cluster responses
        clusters = self._cluster_embeddings(embeddings, min_samples=min_cluster_size)

        # Analyze each cluster with LLM
        themes = self._analyze_clusters(response_texts, clusters)

        base_result["themes"] = themes
        
        # Generate a summary even when we have themes (for consistency)
        if response_texts:
            summary = self._generate_simple_summary(response_texts)
            base_result["summary"] = summary
        
        return base_result

    def _analyze_rating_question(
        self,
        question: Question,
        responses: List[Response]
    ) -> Dict[str, Any]:
        """
        Compute statistics for rating question responses.

        Args:
            question: Question object
            responses: List of Response objects for this question

        Returns:
            Question analysis dict with rating statistics
        """
        ratings = []
        for response in responses:
            if response.response_data and 'rating' in response.response_data:
                ratings.append(response.response_data['rating'])

        if not ratings:
            return {
                "question_id": str(question.id),
                "question_text": question.question_text,
                "question_type": question.question_type,
                "question_image_url": question.question_image_url,
                "response_count": 0,
                "rating_stats": None
            }

        # Compute statistics
        ratings_array = np.array(ratings)
        average = float(np.mean(ratings_array))
        min_val = int(np.min(ratings_array))
        max_val = int(np.max(ratings_array))

        # Compute distribution
        distribution = {}
        scale_min = question.options.get('min', 0) if question.options else 0
        scale_max = question.options.get('max', 10) if question.options else 10

        for i in range(scale_min, scale_max + 1):
            distribution[str(i)] = int(np.sum(ratings_array == i))

        return {
            "question_id": str(question.id),
            "question_text": question.question_text,
            "question_type": question.question_type,
            "question_image_url": question.question_image_url,
            "response_count": len(ratings),
            "rating_stats": {
                "average": round(average, 2),
                "min_value": min_val,
                "max_value": max_val,
                "distribution": distribution,
                "total_responses": len(ratings)
            }
        }

    def _analyze_poll_question(
        self,
        question: Question,
        responses: List[Response]
    ) -> Dict[str, Any]:
        """
        Compute statistics for poll question responses.

        Args:
            question: Question object
            responses: List of Response objects for this question

        Returns:
            Question analysis dict with poll statistics
        """
        # Get all choices from question options
        choices = question.options.get('choices', []) if question.options else []
        choice_counts = {choice['id']: 0 for choice in choices}
        choice_labels = {choice['id']: choice['label'] for choice in choices}

        # Count selections
        total_responses = 0
        for response in responses:
            if response.response_data and 'selected' in response.response_data:
                selected = response.response_data['selected']
                total_responses += 1

                # Handle both single and multiple selections
                if isinstance(selected, list):
                    for choice_id in selected:
                        if choice_id in choice_counts:
                            choice_counts[choice_id] += 1
                elif selected in choice_counts:
                    choice_counts[selected] += 1

        # Build choice results
        choice_results = []
        for choice in choices:
            count = choice_counts[choice['id']]
            percentage = (count / total_responses * 100) if total_responses > 0 else 0
            choice_results.append({
                "choice_id": choice['id'],
                "label": choice['label'],
                "count": count,
                "percentage": round(percentage, 1)
            })

        return {
            "question_id": str(question.id),
            "question_text": question.question_text,
            "question_type": question.question_type,
            "question_image_url": question.question_image_url,
            "response_count": total_responses,
            "poll_stats": {
                "total_responses": total_responses,
                "choices": choice_results
            }
        }

    def _generate_conversation_summary(self, question_analyses: List[Dict[str, Any]]) -> str:
        """
        Generate an overall summary for the entire conversation.

        Args:
            question_analyses: List of question analysis results

        Returns:
            Overall summary text
        """
        if not question_analyses:
            return "No responses to analyze"

        total_responses = sum(qa["response_count"] for qa in question_analyses)

        # Build summary prompt
        summaries = []
        for qa in question_analyses:
            q_type = qa["question_type"]
            q_text = qa["question_text"]
            count = qa["response_count"]

            if q_type == "rating" and qa.get("rating_stats"):
                avg = qa["rating_stats"]["average"]
                summaries.append(f"- \"{q_text}\": Average rating {avg}/10 ({count} responses)")
            elif q_type in ["single_choice", "multiple_choice"] and qa.get("poll_stats"):
                top_choice = max(qa["poll_stats"]["choices"], key=lambda x: x["count"]) if qa["poll_stats"]["choices"] else None
                if top_choice:
                    summaries.append(f"- \"{q_text}\": Most popular choice '{top_choice['label']}' ({top_choice['percentage']}%, {count} responses)")
            elif qa.get("themes"):
                theme_list = ", ".join([t["theme"] for t in qa["themes"][:3]])
                summaries.append(f"- \"{q_text}\": Key themes: {theme_list} ({count} responses)")
            else:
                summaries.append(f"- \"{q_text}\": {count} responses")

        prompt = f"""Summarize the key insights from this feedback analysis in 2-3 sentences.

Total responses across all questions: {total_responses}

Question summaries:
{chr(10).join(summaries)}

Provide a concise, actionable summary of what these responses reveal about the overall feedback.

IMPORTANT: Write in plain text only. Do not use any markdown formatting (no **bold**, no *italic*, no bullet points with -, no headers with #)."""

        try:
            message = self.anthropic_client.messages.create(
                model=self.llm_model,
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}]
            )
            return message.content[0].text.strip()
        except Exception as e:
            return f"Analyzed {total_responses} responses across {len(question_analyses)} questions."

    def analyze_responses(
        self,
        responses: List[Response],
        min_cluster_size: int = 2
    ) -> Dict[str, Any]:
        """
        DEPRECATED: Use analyze_conversation instead.

        Legacy method for analyzing all responses together.

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
            Theme data with name, summary, perspectives, and key points
        """
        prompt = f"""Analyze the following {len(cluster_texts)} responses and:
1. Identify the main theme they share (give it a short name with 1-6 words)
2. Provide a brief summary of what this theme encompasses
3. Break down the theme into natural perspectives or viewpoints (don't force sentiment - use whatever grouping makes sense)
4. Extract key points that appear across the responses (optional - only if there are clear, distinct points)

IMPORTANT: Do NOT reference specific response numbers in your summaries (don't say "Response 1 and 3" or similar). Instead, describe the overall patterns.

Responses:
{chr(10).join(f"- {text}" for text in cluster_texts)}

Return your analysis in this exact JSON format:
{{
  "theme": "Short, descriptive theme name",
  "summary": "Overall description of what this theme encompasses",
  "perspectives": [
    {{"name": "Perspective name", "summary": "What this perspective expresses", "count": X}},
    {{"name": "Another perspective", "summary": "What this perspective expresses", "count": Y}}
  ],
  "key_points": ["Key point 1", "Key point 2"]  // Optional - omit if not applicable
}}

The number of perspectives should match the natural groupings in the responses (could be 1-5 or more). Each response should be counted in exactly one perspective."""

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

            # Filter out empty perspectives
            if "perspectives" in result:
                result["perspectives"] = [p for p in result["perspectives"] if p.get("count", 0) > 0]

            return result
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return {
                "theme": "Miscellaneous Feedback",
                "summary": f"Collection of {len(cluster_texts)} related responses",
                "perspectives": [
                    {
                        "name": "General feedback",
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

Provide a concise, actionable summary of what these responses reveal.

IMPORTANT: Write in plain text only. Do not use any markdown formatting (no **bold**, no *italic*, no bullet points with -, no headers with #)."""

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

        prompt = f"""Summarize the main points from these {len(texts)} feedback responses in 2-3 sentences.

Do NOT reference specific response numbers. Instead, describe the overall patterns and common themes.

Responses:
{chr(10).join(f"- {text}" for text in sample_texts)}
{"..." if len(texts) > 10 else ""}

Provide a concise summary of the key feedback.

IMPORTANT: Write in plain text only. Do not use any markdown formatting (no **bold**, no *italic*, no bullet points with -, no headers with #)."""

        message = self.anthropic_client.messages.create(
            model=self.llm_model,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}]
        )

        return message.content[0].text.strip()

    def _generate_surprising_insights(
        self,
        questions: List[Question],
        responses: List[Response],
        question_analyses: List[Dict[str, Any]]
    ) -> Optional[List[Dict[str, str]]]:
        """
        Generate "What Surprised Us" insights highlighting unexpected themes, tensions, and minority views.

        Args:
            questions: List of Question objects
            responses: List of Response objects
            question_analyses: List of question analysis results

        Returns:
            List of surprising insights with title and description, or None if insufficient data
        """
        if not question_analyses or not responses:
            print(f"DEBUG: _generate_surprising_insights - insufficient data: question_analyses={len(question_analyses) if question_analyses else 0}, responses={len(responses) if responses else 0}")
            return None
        
        print(f"DEBUG: _generate_surprising_insights - starting generation with {len(question_analyses)} question analyses and {len(responses)} responses")

        # Group responses by question
        responses_by_question = {}
        for response in responses:
            qid = str(response.question_id)
            if qid not in responses_by_question:
                responses_by_question[qid] = []
            responses_by_question[qid].append(response)

        # Build context for the prompt
        analysis_context = []
        for qa in question_analyses:
            q_text = qa["question_text"]
            q_type = qa["question_type"]
            count = qa["response_count"]

            context_item = f"Question: \"{q_text}\" ({q_type}, {count} responses)\n"

            if q_type == "text":
                # Always include text questions, even if no themes were found
                qid = qa["question_id"]
                q_responses = responses_by_question.get(qid, [])
                
                if qa.get("themes"):
                    # Include theme information
                    themes_info = []
                    for theme in qa["themes"]:
                        theme_desc = f"  - {theme['theme']}: {theme['summary']} ({theme['frequency']} responses)"
                        if theme.get("perspectives"):
                            perspectives = ", ".join([p["name"] for p in theme["perspectives"]])
                            theme_desc += f" [Perspectives: {perspectives}]"
                        themes_info.append(theme_desc)
                    context_item += "  Themes identified:\n" + "\n".join(themes_info) + "\n"
                
                # Always include sample responses for text questions
                if q_responses:
                    text_responses = [r.response_text for r in q_responses if r.response_text and r.response_text.strip()]
                    if text_responses:
                        # Include all responses (or a larger sample) so LLM can see what was said
                        sample_size = min(10, len(text_responses))  # Increased from 5 to 10
                        sample_responses = text_responses[:sample_size]
                        if not qa.get("themes"):
                            # If no themes, make it clear these are the actual responses
                            context_item += "  Responses (no themes identified):\n"
                        else:
                            context_item += "  Sample responses:\n"
                        context_item += "\n".join([f"    - {r}" for r in sample_responses])
                        if len(text_responses) > sample_size:
                            context_item += f"\n    ... and {len(text_responses) - sample_size} more responses"
                elif not qa.get("themes"):
                    # No themes and no responses found (shouldn't happen, but handle it)
                    context_item += "  No themes identified and no responses found."
            elif q_type == "rating" and qa.get("rating_stats"):
                stats = qa["rating_stats"]
                context_item += f"  Average: {stats['average']}/10, Range: {stats['min_value']}-{stats['max_value']}"
            elif q_type in ["single_choice", "multiple_choice"] and qa.get("poll_stats"):
                stats = qa["poll_stats"]
                top_choice = max(stats["choices"], key=lambda x: x["count"]) if stats["choices"] else None
                if top_choice:
                    context_item += f"  Most popular: {top_choice['label']} ({top_choice['percentage']}%)"

            analysis_context.append(context_item)

        # Build prompt for surprising insights
        total_responses = len(responses)
        prompt = f"""You are analyzing feedback data to identify surprising, unexpected, or noteworthy insights.

Focus on:
1. Unexpected themes or patterns that emerge
2. Tensions or contradictions in the responses
3. Minority views that differ from the majority
4. Insights that challenge assumptions
5. Notable variations or outliers

Total responses analyzed: {total_responses}

Analysis context:
{chr(10).join(analysis_context)}

Your task: Generate 2-4 key surprising insights. Each insight must have:
- A concise, engaging title (3-8 words) that captures the surprise
- A detailed description (2-4 sentences) explaining the insight, why it's surprising, and what it means

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any markdown formatting, explanations, or text outside the JSON structure.

Return your response as a JSON object with this exact structure:
{{
  "insights": [
    {{
      "title": "Short, engaging title",
      "description": "Detailed explanation of the insight, why it's surprising, and what it means. This should be 2-4 sentences that help readers understand what was unexpected or noteworthy."
    }},
    {{
      "title": "Another insight title",
      "description": "Another detailed explanation..."
    }}
  ]
}}

IMPORTANT: 
- Return ONLY the JSON object, nothing else
- Do not wrap it in markdown code blocks
- Do not add any explanatory text before or after
- Ensure the JSON is valid and can be parsed directly

Focus on the most interesting and actionable insights. If there are no particularly surprising insights, you can still provide 1-2 thoughtful reflections on what stands out as noteworthy or different from what might have been expected."""

        try:
            message = self.anthropic_client.messages.create(
                model=self.llm_model,
                max_tokens=1200,
                messages=[{"role": "user", "content": prompt}]
            )
            
            # Extract JSON from response
            response_text = message.content[0].text
            print(f"DEBUG: _generate_surprising_insights - LLM response received, length: {len(response_text)}")
            print(f"DEBUG: _generate_surprising_insights - Response preview: {response_text[:200]}")
            
            # Try to parse JSON from the response
            import json
            import re
            try:
                # Try multiple strategies to extract JSON
                json_text = None
                
                # Strategy 1: Look for JSON in markdown code blocks
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    if json_end > json_start:
                        json_text = response_text[json_start:json_end].strip()
                elif "```" in response_text:
                    json_start = response_text.find("```") + 3
                    json_end = response_text.find("```", json_start)
                    if json_end > json_start:
                        json_text = response_text[json_start:json_end].strip()
                
                # Strategy 2: Look for JSON object pattern { ... }
                if not json_text:
                    # Try to find JSON object boundaries
                    json_match = re.search(r'\{[^{}]*"insights"[^{}]*\[.*?\]\s*\}', response_text, re.DOTALL)
                    if json_match:
                        json_text = json_match.group(0).strip()
                
                # Strategy 3: Try the entire response as JSON
                if not json_text:
                    json_text = response_text.strip()
                    # Remove any leading/trailing non-JSON text
                    json_text = re.sub(r'^[^{]*', '', json_text)  # Remove text before first {
                    json_text = re.sub(r'[^}]*$', '', json_text)  # Remove text after last }
                    json_text = json_text.strip()
                
                if not json_text:
                    print(f"DEBUG: _generate_surprising_insights - Could not extract JSON from response")
                    return None
                
                print(f"DEBUG: _generate_surprising_insights - Extracted JSON text length: {len(json_text)}")
                print(f"DEBUG: _generate_surprising_insights - JSON preview: {json_text[:200]}")
                
                result = json.loads(json_text)
                print(f"DEBUG: _generate_surprising_insights - JSON parsed successfully")
                
                # Extract insights array
                insights = result.get("insights", [])
                print(f"DEBUG: _generate_surprising_insights - Found {len(insights) if insights else 0} insights in response")
                
                # Validate and return
                if insights and isinstance(insights, list):
                    # Ensure each insight has title and description
                    validated_insights = []
                    for insight in insights:
                        if isinstance(insight, dict):
                            title = insight.get("title")
                            description = insight.get("description")
                            
                            if title and description:
                                title_str = str(title).strip()
                                desc_str = str(description).strip()
                                
                                if title_str and desc_str:
                                    validated_insights.append({
                                        "title": title_str,
                                        "description": desc_str
                                    })
                    
                    # Return the list (even if empty, let the schema handle None conversion)
                    print(f"DEBUG: _generate_surprising_insights - Returning {len(validated_insights)} validated insights")
                    return validated_insights if validated_insights else None
                print(f"DEBUG: _generate_surprising_insights - No insights found or not a list")
                return None
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON from surprising insights response: {str(e)}")
                print(f"Response text: {response_text[:500]}")
                import traceback
                traceback.print_exc()
                return None
        except Exception as e:
            # Return None on error rather than failing the entire analysis
            print(f"Error generating surprising insights: {str(e)}")
            import traceback
            traceback.print_exc()
            return None
