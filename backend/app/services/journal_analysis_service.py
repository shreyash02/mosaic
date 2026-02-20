"""Journal analysis service for longitudinal personal journal insights."""

import json
import time
import logging
from datetime import datetime
from typing import Optional
from anthropic import Anthropic

from app.core.config import settings
from app.services.llm_usage_service import log_llm_usage

logger = logging.getLogger(__name__)

MAX_ENTRIES_FOR_ANALYSIS = 50


class JournalAnalysisService:
    """Analyzes journal entries over time to extract themes, mood, and patterns."""

    def __init__(self, model: str = "claude-sonnet-4-5-20250929"):
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = model

    def analyze_journal(
        self,
        entries: list[dict],
        journal_title: str,
        journal_description: str | None = None,
        prompts: list[dict] | None = None,
        prior_context: dict | None = None,
    ) -> dict:
        """
        Analyze journal entries and return structured insights.

        Args:
            entries: List of entry dicts with entry_number, date, responses
            journal_title: Title of the journal
            journal_description: Optional description/context
            prompts: List of prompt dicts with text and type
            prior_context: Previous analysis context for windowed mode

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
            "IMPORTANT: Write in second person — address the journal owner as 'you' since they are the reader. "
            "Always respond with valid JSON only — no markdown, no explanation outside the JSON."
        )

        date_range = ""
        if entries:
            date_range = f"from {entries[0]['date']} to {entries[-1]['date']}"

        # Build prior context section for windowed analysis
        prior_section = ""
        if prior_context:
            theme_lines = []
            for t in prior_context.get("theme_timeline", []):
                if isinstance(t, dict):
                    trajectory = t.get("trajectory", "stable")
                    summary = t.get("summary", "")
                    theme_lines.append(f"- {t.get('theme', '')} ({trajectory}): {summary}")
            pattern_lines = []
            for p in prior_context.get("patterns", []):
                if isinstance(p, dict):
                    pattern_lines.append(f"- {p.get('title', '')}: {p.get('description', '')}")

            prior_section = f"""
## Previous Analysis Context
Your previous analysis covered {prior_context.get('total_entries_analyzed', 0)} entries from {prior_context.get('date_range_start', '?')} to {prior_context.get('date_range_end', '?')}:

### Summary
{prior_context.get('overall_summary', '')}

### Themes Tracked
{chr(10).join(theme_lines) if theme_lines else '(none)'}

### Patterns Identified
{chr(10).join(pattern_lines) if pattern_lines else '(none)'}

## New Entries
The following {len(entries)} new entries were written since your last analysis.
- Update theme trajectories based on new evidence
- Identify NEW themes that emerged
- Track mood for the new entries only
- Note pattern shifts: what changed, persisted, or resolved
"""

        user_prompt = f"""Analyze this personal journal and return structured insights as JSON.

Journal: "{journal_title}"
{f'Context: {journal_description}' if journal_description else ''}
{f'Prompts used: {prompt_descriptions}' if prompt_descriptions else ''}
Entries: {len(entries)} entries {date_range}
{prior_section}
{formatted_entries}

Return a JSON object with exactly these fields:

{{
  "overall_summary": "A 2-3 paragraph reflective summary of the journal's arc, written in second person ('you'). What have you been working through? What progress have you made? What themes emerge?",

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

        t0 = time.time()
        response = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        latency = int((time.time() - t0) * 1000)
        log_llm_usage(
            operation_type="journal_analysis", provider="anthropic", model=self.model,
            input_tokens=response.usage.input_tokens, output_tokens=response.usage.output_tokens,
            latency_ms=latency,
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

    def analyze_entry(
        self,
        entry: dict,
        journal_title: str,
        journal_description: str | None = None,
        prompts: list[dict] | None = None,
        recent_entries: list[dict] | None = None,
    ) -> dict:
        """
        Analyze a single journal entry and return structured insights.

        Args:
            entry: Dict with entry_number, date, responses
            journal_title: Title of the journal
            journal_description: Optional description/context
            prompts: List of prompt dicts with text and type
            recent_entries: Last 3-5 entries for connection detection

        Returns:
            Dict with themes, mood_score, mood_label, key_takeaway, connections, suggested_followups
        """
        start_time = time.time()

        formatted_entry = self._format_entries([entry])
        prompt_descriptions = self._format_prompts(prompts) if prompts else ""

        recent_context = ""
        if recent_entries:
            recent_context = (
                "\n\n## Recent Previous Entries (for context/connections)\n"
                + self._format_entries(recent_entries)
            )

        system_prompt = (
            "You are an insightful personal journal analyst. You provide immediate "
            "feedback on individual journal entries — identifying themes, mood, key "
            "takeaways, and connections to previous entries. Be warm, specific, and concise. "
            "IMPORTANT: Write in second person — address the journal owner as 'you' since they are the reader. "
            "Always respond with valid JSON only — no markdown, no explanation outside the JSON."
        )

        user_prompt = f"""Analyze this single journal entry and return structured insights as JSON.

Journal: "{journal_title}"
{f'Context: {journal_description}' if journal_description else ''}
{f'Prompts used: {prompt_descriptions}' if prompt_descriptions else ''}

## Current Entry
{formatted_entry}
{recent_context}

Return a JSON object with exactly these fields:

{{
  "themes": ["theme1", "theme2"],
  "mood_score": 0.5,
  "mood_label": "cautiously optimistic",
  "key_takeaway": "A 1-2 sentence summary of the core insight or reflection in this entry.",
  "connections": "How this entry relates to or builds on previous entries. Empty string if this is the first entry or no connections exist.",
  "suggested_followups": ["A follow-up question to explore...", "Another prompt to dig deeper..."]
}}

Guidelines:
- themes: 1-5 short theme labels relevant to THIS entry
- mood_score: -1.0 (very negative) to 1.0 (very positive), reflecting the emotional tone
- mood_label: 1-3 word description of the dominant mood
- key_takeaway: The single most important insight or reflection. Keep it concise.
- connections: Only if previous entries are provided. Note patterns, shifts, or continuations.
- suggested_followups: 1-3 thought-provoking follow-up questions for future reflection
- Return ONLY the JSON object, nothing else."""

        t0 = time.time()
        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        latency = int((time.time() - t0) * 1000)
        log_llm_usage(
            operation_type="journal_entry_analysis", provider="anthropic", model=self.model,
            input_tokens=response.usage.input_tokens, output_tokens=response.usage.output_tokens,
            latency_ms=latency,
        )

        result_text = response.content[0].text
        result = self._parse_json(result_text)

        duration_ms = int((time.time() - start_time) * 1000)

        return {
            "themes": result.get("themes", []),
            "mood_score": result.get("mood_score", 0.0),
            "mood_label": result.get("mood_label", ""),
            "key_takeaway": result.get("key_takeaway", ""),
            "connections": result.get("connections", ""),
            "suggested_followups": result.get("suggested_followups", []),
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
                elif r.get("type") == "checkbox" and r.get("choice_values"):
                    checked = ", ".join(r["choice_values"])
                    response_lines.append(f"  {prompt_text}: [{checked}]")
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
            elif ptype == "checkbox":
                choices = p.get("choices", [])
                parts.append(f"- {p['text']} (checklist: {', '.join(choices)})")
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
