"""Service for generating AI-suggested actions from analysis results."""

import json
import logging
import re
import time
from typing import List, Dict, Any, Optional

from anthropic import Anthropic

from app.core.config import settings
from app.services.llm_usage_service import log_llm_usage

logger = logging.getLogger(__name__)


class SuggestedActionService:
    """Generates suggested actions from analysis data using an LLM."""

    MIN_RESPONSES_FOR_AUTO = 5
    THEME_FREQUENCY_THRESHOLD = 0.30  # 30% of responses
    LOW_RATING_THRESHOLD_10 = 4.0  # on a 1-10 scale
    LOW_RATING_THRESHOLD_5 = 2.0  # on a 1-5 scale

    def __init__(self):
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.llm_model = "claude-sonnet-4-5-20250929"

    @staticmethod
    def should_auto_suggest(
        question_analyses: List[Dict[str, Any]],
        surprising_insights: Optional[List[Dict[str, Any]]],
        total_responses: int,
    ) -> bool:
        """
        Evaluate whether analysis results warrant auto-generating suggested actions.

        Returns True when confidence is high enough:
        - At least 5 responses (too few = unreliable signal)
        - AND at least one of:
          - A text theme covers >= 30% of responses for that question
          - A rating question has a low average (<=4.0 on 1-10 or <=2.0 on 1-5)
          - Surprising insights were generated (indicates non-obvious patterns)
        """
        if total_responses < SuggestedActionService.MIN_RESPONSES_FOR_AUTO:
            return False

        # Check for surprising insights
        if surprising_insights and len(surprising_insights) > 0:
            return True

        for qa in (question_analyses or []):
            q_type = qa.get("question_type", "text")
            response_count = qa.get("response_count", 0)

            # Check text themes for high-frequency patterns
            if q_type == "text" and response_count > 0:
                for theme in (qa.get("themes") or []):
                    frequency = theme.get("frequency", 0)
                    if frequency / response_count >= SuggestedActionService.THEME_FREQUENCY_THRESHOLD:
                        return True

            # Check for low ratings
            if q_type == "rating" and qa.get("rating_stats"):
                stats = qa["rating_stats"]
                avg = stats.get("average")
                if avg is not None:
                    scale_max = stats.get("scale_max", stats.get("max_value", 10))
                    if scale_max <= 5:
                        if avg <= SuggestedActionService.LOW_RATING_THRESHOLD_5:
                            return True
                    else:
                        if avg <= SuggestedActionService.LOW_RATING_THRESHOLD_10:
                            return True

        return False

    def generate_actions(
        self,
        conversation_title: str,
        conversation_description: Optional[str],
        overall_summary: str,
        question_analyses: List[Dict[str, Any]],
        surprising_insights: Optional[List[Dict[str, str]]],
        context_notes: Optional[str] = None,
        total_responses: int = 0,
    ) -> List[Dict[str, Any]]:
        """
        Generate 3-5 suggested actions based on analysis results.

        Returns a list of action dicts with: title, description, action_type,
        priority, sentiment, response_percentage, related_cluster_ids.
        """
        analysis_context = self._build_analysis_context(
            question_analyses, surprising_insights, total_responses
        )

        context_section = ""
        if context_notes:
            context_section = f"""CREATOR-PROVIDED CONTEXT:
{context_notes}

Use this context to make actions more specific and relevant to the situation.

"""

        description_line = ""
        if conversation_description:
            description_line = f"\nDescription: {conversation_description}"

        prompt = f"""You are analyzing feedback results to suggest concrete, actionable next steps for the person who collected this feedback.

Conversation: "{conversation_title}"{description_line}
{context_section}Overall Summary:
{overall_summary}

Total responses analyzed: {total_responses}

{analysis_context}

First, infer the context from the conversation title and description. This could be a workplace team, apartment community, classroom, friend group, event, club, suggestion box, or any other context. Adapt your language and suggestions to match — do NOT assume a corporate/workplace setting unless the title/description clearly indicates one.

Generate 3-5 suggested actions. For each action provide:

- title: Clear, concise action (5-15 words, starts with a verb)
- description: What to do and why, referencing specific findings (2-4 sentences)
- action_type: One of:
  - "investigate" — dig deeper, gather more info
  - "communicate" — share findings, start a discussion
  - "change" — make a concrete change based on feedback
  - "celebrate" — recognize something positive
  - "monitor" — watch a trend over time
- priority: "high" (major theme, many people, negative sentiment), "medium", or "low" (nice-to-have)
- sentiment: "positive", "negative", "neutral", or "mixed" — the sentiment of the underlying feedback
- response_percentage: Approximate % of responses this action relates to (0-100)

Guidelines:
- Make suggestions specific and actionable — "Schedule a discussion about X" not "Consider improving communication"
- Include at least one positive/celebrate action if the feedback warrants it
- Frame as suggestions, not commands — "Consider..." or "You might want to..."
- Focus on themes mentioned by many people or with strong sentiment

Return ONLY a valid JSON object:
{{"actions": [{{"title": "...", "description": "...", "action_type": "...", "priority": "...", "sentiment": "...", "response_percentage": N}}]}}"""

        try:
            t0 = time.time()
            message = self.anthropic_client.messages.create(
                model=self.llm_model,
                max_tokens=1500,
                messages=[{"role": "user", "content": prompt}],
            )
            latency = int((time.time() - t0) * 1000)
            log_llm_usage(
                operation_type="suggested_actions", provider="anthropic", model=self.llm_model,
                input_tokens=message.usage.input_tokens, output_tokens=message.usage.output_tokens,
                latency_ms=latency,
            )
            response_text = message.content[0].text
            return self._parse_actions_response(response_text)
        except Exception as e:
            logger.error(f"Failed to generate suggested actions: {e}", exc_info=True)
            return []

    def _build_analysis_context(
        self,
        question_analyses: List[Dict[str, Any]],
        surprising_insights: Optional[List[Dict[str, str]]],
        total_responses: int,
    ) -> str:
        """Format analysis data into a readable context string for the LLM prompt."""
        parts = []

        if question_analyses:
            parts.append("QUESTION-BY-QUESTION ANALYSIS:")
            for qa in question_analyses:
                q_text = qa.get("question_text", "Unknown")
                q_type = qa.get("question_type", "text")
                count = qa.get("response_count", 0)

                entry = f'\n  Question: "{q_text}" ({q_type}, {count} responses)'

                if q_type == "text" and qa.get("themes"):
                    for theme in qa["themes"]:
                        name = theme.get("theme", "Unknown")
                        freq = theme.get("frequency", 0)
                        summary = theme.get("summary", "")
                        pct = round(freq / count * 100) if count > 0 else 0
                        entry += f"\n    - {name} ({freq} responses, ~{pct}%): {summary}"

                if q_type == "rating" and qa.get("rating_stats"):
                    stats = qa["rating_stats"]
                    entry += f"\n    Average rating: {stats.get('average', 'N/A')}"

                if q_type in ("single_choice", "multiple_choice") and qa.get("poll_stats"):
                    choices = qa["poll_stats"].get("choices", [])
                    if choices:
                        top = sorted(choices, key=lambda c: c.get("count", 0), reverse=True)[:3]
                        for c in top:
                            entry += f"\n    - {c.get('label', '?')}: {c.get('percentage', 0):.0f}%"

                parts.append(entry)

        if surprising_insights:
            parts.append("\nSURPRISING INSIGHTS:")
            for insight in surprising_insights:
                title = insight.get("title", "")
                desc = insight.get("description", "")
                parts.append(f"  - {title}: {desc}")

        return "\n".join(parts) if parts else "No detailed analysis available."

    def _parse_actions_response(self, response_text: str) -> List[Dict[str, Any]]:
        """Parse LLM response into validated action dicts."""
        json_text = None

        # Strategy 1: JSON in markdown code blocks
        if "```json" in response_text:
            start = response_text.find("```json") + 7
            end = response_text.find("```", start)
            if end > start:
                json_text = response_text[start:end].strip()
        elif "```" in response_text:
            start = response_text.find("```") + 3
            end = response_text.find("```", start)
            if end > start:
                json_text = response_text[start:end].strip()

        # Strategy 2: Find JSON object with "actions" key
        if not json_text:
            match = re.search(r'\{[^{}]*"actions"\s*:\s*\[.*?\]\s*\}', response_text, re.DOTALL)
            if match:
                json_text = match.group(0).strip()

        # Strategy 3: Strip non-JSON text from boundaries
        if not json_text:
            json_text = response_text.strip()
            json_text = re.sub(r'^[^{]*', '', json_text)
            json_text = re.sub(r'[^}]*$', '', json_text)
            json_text = json_text.strip()

        if not json_text:
            logger.error("Could not extract JSON from suggested actions response")
            return []

        try:
            result = json.loads(json_text)
            actions = result.get("actions", [])
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse suggested actions JSON: {e}")
            logger.debug(f"Response text: {response_text[:500]}")
            return []

        valid_types = {"investigate", "communicate", "change", "celebrate", "monitor"}
        valid_priorities = {"high", "medium", "low"}
        valid_sentiments = {"positive", "negative", "neutral", "mixed"}

        validated = []
        for action in actions:
            if not isinstance(action, dict):
                continue

            title = str(action.get("title", "")).strip()
            description = str(action.get("description", "")).strip()
            if not title or not description:
                continue

            action_type = str(action.get("action_type", "")).strip().lower()
            if action_type not in valid_types:
                action_type = "investigate"

            priority = str(action.get("priority", "")).strip().lower()
            if priority not in valid_priorities:
                priority = "medium"

            sentiment = str(action.get("sentiment", "")).strip().lower()
            if sentiment not in valid_sentiments:
                sentiment = "neutral"

            response_pct = action.get("response_percentage")
            if response_pct is not None:
                try:
                    response_pct = max(0.0, min(100.0, float(response_pct)))
                except (ValueError, TypeError):
                    response_pct = None

            validated.append({
                "title": title,
                "description": description,
                "action_type": action_type,
                "priority": priority,
                "sentiment": sentiment,
                "response_percentage": response_pct,
                "related_cluster_ids": [],
            })

        return validated
