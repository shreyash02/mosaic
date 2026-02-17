"""Journal analysis service for longitudinal personal journal insights."""

import json
import time
import logging
from datetime import datetime
from typing import Optional
from anthropic import Anthropic

from app.core.config import settings

logger = logging.getLogger(__name__)

MAX_ENTRIES_FOR_ANALYSIS = 50


class JournalAnalysisService:
    """Analyzes journal entries over time to extract themes, mood, and patterns."""

    def __init__(self):
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-sonnet-4-5-20250929"

    def analyze_journal(
        self,
        entries: list[dict],
        journal_title: str,
        journal_description: str | None = None,
        prompts: list[dict] | None = None,
    ) -> dict:
        """
        Analyze journal entries and return structured insights.

        Args:
            entries: List of entry dicts with entry_number, date, responses
            journal_title: Title of the journal
            journal_description: Optional description/context
            prompts: List of prompt dicts with text and type

        Returns:
            Dict with overall_summary, theme_timeline, mood_trajectory, patterns
        """
        start_time = time.time()

        # Cap entries to avoid exceeding context limits
        if len(entries) > MAX_ENTRIES_FOR_ANALYSIS:
            entries = entries[-MAX_ENTRIES_FOR_ANALYSIS:]

        formatted_entries = self._format_entries(entries)
        prompt_descriptions = self._format_prompts(prompts) if prompts else ""

        system_prompt = (
            "You are an insightful personal journal analyst. You help people understand "
            "patterns in their reflections over time. Be warm, thoughtful, and specific. "
            "Reference actual content from entries when describing themes and patterns. "
            "Always respond with valid JSON only — no markdown, no explanation outside the JSON."
        )

        date_range = ""
        if entries:
            date_range = f"from {entries[0]['date']} to {entries[-1]['date']}"

        user_prompt = f"""Analyze this personal journal and return structured insights as JSON.

Journal: "{journal_title}"
{f'Context: {journal_description}' if journal_description else ''}
{f'Prompts used: {prompt_descriptions}' if prompt_descriptions else ''}
Entries: {len(entries)} entries {date_range}

{formatted_entries}

Return a JSON object with exactly these fields:

{{
  "overall_summary": "A 2-3 paragraph reflective summary of the journal's arc. What has the person been working through? What progress have they made? What themes emerge?",

  "theme_timeline": [
    {{
      "theme": "Short theme name",
      "first_seen": "YYYY-MM-DD",
      "last_seen": "YYYY-MM-DD",
      "entry_count": 3,
      "trajectory": "growing|stable|declining|resolved",
      "summary": "Brief description of how this theme evolved"
    }}
  ],

  "mood_trajectory": {{
    "data_points": [
      {{
        "date": "YYYY-MM-DD",
        "sentiment_score": 0.5,
        "dominant_mood": "hopeful"
      }}
    ],
    "overall_trend": "improving|stable|declining",
    "summary": "Brief description of emotional arc"
  }},

  "patterns": [
    {{
      "pattern_type": "recurring_concern|positive_shift|correlation|cyclical",
      "title": "Short pattern title",
      "description": "Detailed description of the pattern",
      "confidence": 0.8
    }}
  ]
}}

Guidelines:
- theme_timeline: Identify 3-8 key themes. Use trajectory to show evolution.
- mood_trajectory: One data_point per entry. sentiment_score from -1.0 (very negative) to 1.0 (very positive). Use the entry content to infer mood.
- patterns: Identify 2-5 meaningful patterns. Be specific, reference entry content.
- For rating/choice prompts, incorporate the numeric or choice values into your analysis.
- Return ONLY the JSON object, nothing else."""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        result_text = response.content[0].text
        result = self._parse_json(result_text)

        duration_ms = int((time.time() - start_time) * 1000)

        return {
            "overall_summary": result.get("overall_summary", ""),
            "theme_timeline": result.get("theme_timeline", []),
            "mood_trajectory": result.get("mood_trajectory", {}),
            "patterns": result.get("patterns", []),
            "llm_provider": "anthropic",
            "llm_model": self.model,
            "analysis_duration_ms": duration_ms,
        }

    def _format_entries(self, entries: list[dict]) -> str:
        """Format entries into readable text for the LLM."""
        parts = []
        for entry in entries:
            header = f"--- Entry #{entry['entry_number']} ({entry['date']}) ---"
            response_lines = []
            for r in entry.get("responses", []):
                prompt_text = r.get("prompt_text", "")
                if r.get("type") == "rating" and r.get("rating_value") is not None:
                    response_lines.append(f"  {prompt_text}: {r['rating_value']}")
                elif r.get("type") == "single_choice" and r.get("choice_value"):
                    response_lines.append(f"  {prompt_text}: {r['choice_value']}")
                elif r.get("text"):
                    response_lines.append(f"  {prompt_text}:\n  {r['text']}")
            parts.append(header + "\n" + "\n".join(response_lines))
        return "\n\n".join(parts)

    def _format_prompts(self, prompts: list[dict]) -> str:
        """Format prompt definitions for context."""
        parts = []
        for p in prompts:
            ptype = p.get("type", "text")
            if ptype == "rating":
                parts.append(f"- {p['text']} (rating {p.get('rating_min', 1)}-{p.get('rating_max', 10)})")
            elif ptype == "single_choice":
                choices = p.get("choices", [])
                parts.append(f"- {p['text']} (choices: {', '.join(choices)})")
            else:
                parts.append(f"- {p['text']} (free text)")
        return "\n".join(parts)

    def _parse_json(self, text: str) -> dict:
        """Parse JSON from LLM response, handling markdown code blocks."""
        text = text.strip()
        # Strip markdown code blocks
        if text.startswith("```"):
            lines = text.split("\n")
            # Remove first line (```json) and last line (```)
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines)
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse journal analysis JSON: {e}\nText: {text[:500]}")
            return {}
