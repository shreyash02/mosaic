"""Service for AI-powered question suggestions."""

from typing import List, Optional
from anthropic import Anthropic
from pydantic import BaseModel

from app.core.config import settings


class QuestionSuggestion(BaseModel):
    """A suggested question with rationale."""
    text: str
    question_type: str  # text, rating, single_choice, multiple_choice
    rationale: str
    options: Optional[dict] = None  # For rating/choice questions


class QuestionSuggestionResult(BaseModel):
    """Result of question suggestion generation."""
    suggestions: List[QuestionSuggestion]
    needs_more_context: bool = False
    context_hint: Optional[str] = None


class QuestionSuggestionService:
    """Service for generating AI-powered question suggestions."""

    def __init__(self):
        """Initialize the service with Anthropic client."""
        self.client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = "claude-sonnet-4-5-20250929"

    def suggest_questions(
        self,
        title: str,
        description: str,
        existing_questions: List[str],
        count: int = 5
    ) -> QuestionSuggestionResult:
        """
        Generate question suggestions based on conversation context.

        Args:
            title: Conversation title
            description: Conversation description
            existing_questions: List of already-added question texts
            count: Number of suggestions to generate (3-5)

        Returns:
            QuestionSuggestionResult with suggestions and context quality info
        """
        count = max(3, min(5, count))  # Clamp between 3-5

        # Build the prompt
        existing_qs_text = ""
        if existing_questions:
            existing_qs_text = f"""
The creator has already added these questions (do not suggest duplicates or very similar questions):
{chr(10).join(f'- {q}' for q in existing_questions)}
"""

        prompt = f"""You are helping someone create a feedback conversation. Based on the title and description, suggest {count} thoughtful questions they could ask.

Title: {title}
Description: {description}
{existing_qs_text}

First, assess if you have enough context to suggest specific, tailored questions. If the title/description is too vague or generic (e.g., just "Feedback" or "Survey"), you should indicate this.

Guidelines for suggestions:
- Suggest questions that would genuinely help gather useful feedback
- Vary the question types when appropriate:
  - "text" for open-ended questions needing detailed responses
  - "rating" for questions that can be answered on a 1-5 scale
  - "single_choice" only if there are clear mutually exclusive options
- Avoid generic questions like "Any other thoughts?" or "Is there anything else?"
- Keep questions concise and clear
- Match the tone/formality of the title and description
- For rating questions, the scale is always 1-5

Respond with a JSON object containing:
- "needs_more_context": boolean - true if the title/description is too vague for specific suggestions
- "context_hint": string or null - if needs_more_context is true, a brief suggestion for what info would help (e.g., "Try describing what kind of feedback you're looking for, or who the participants are.")
- "suggestions": array of {count} question objects, each with:
  - "text": the question text
  - "question_type": one of "text", "rating", "single_choice"
  - "rationale": a brief explanation (1 sentence) of why this question is valuable
  - "options": only for rating questions, include {{"scale_min": 1, "scale_max": 5, "scale_min_label": "label", "scale_max_label": "label"}}

Example response:
{{
  "needs_more_context": false,
  "context_hint": null,
  "suggestions": [
    {{
      "text": "What aspects of the project went particularly well?",
      "question_type": "text",
      "rationale": "Identifies successes worth replicating in future projects."
    }}
  ]
}}

Example when context is insufficient:
{{
  "needs_more_context": true,
  "context_hint": "Try describing what kind of feedback you're looking for, or who will be responding.",
  "suggestions": [
    {{
      "text": "What's working well?",
      "question_type": "text",
      "rationale": "A general question to identify positives."
    }}
  ]
}}

Respond ONLY with the JSON object, no other text."""

        response = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Parse the response
        response_text = response.content[0].text.strip()

        # Handle potential markdown code blocks
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            # Remove first and last lines (```json and ```)
            response_text = "\n".join(lines[1:-1])

        import json
        try:
            result_data = json.loads(response_text)
        except json.JSONDecodeError:
            # Fallback: return empty result on parse error
            return QuestionSuggestionResult(suggestions=[])

        # Extract context quality info
        needs_more_context = result_data.get("needs_more_context", False)
        context_hint = result_data.get("context_hint")

        # Convert to QuestionSuggestion objects
        suggestions = []
        for item in result_data.get("suggestions", []):
            try:
                suggestion = QuestionSuggestion(
                    text=item["text"],
                    question_type=item.get("question_type", "text"),
                    rationale=item.get("rationale", ""),
                    options=item.get("options")
                )
                suggestions.append(suggestion)
            except (KeyError, ValueError):
                continue

        return QuestionSuggestionResult(
            suggestions=suggestions[:count],
            needs_more_context=needs_more_context,
            context_hint=context_hint
        )


# Singleton instance
question_suggestion_service = QuestionSuggestionService()
