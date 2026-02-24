"""Service for extracting ideas from images using Claude's vision API."""

import base64
import json
import logging
import time
from pathlib import Path
from typing import Optional, List, Dict, Any

from anthropic import Anthropic

from app.core.config import settings
from app.services.llm_usage_service import log_llm_usage

logger = logging.getLogger(__name__)


class ImageIdeaService:
    """Uses Claude's vision to interpret images and extract idea text."""

    def __init__(self, model: str = "claude-sonnet-4-5-20250929"):
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.llm_model = model

    def _read_image_as_base64(self, image_url: str) -> tuple[str, str]:
        """Read an uploaded image from disk, return (base64_data, media_type)."""
        from app.routes.upload import UPLOAD_DIR

        # Extract filename from URL like "/api/uploads/abc123.png"
        filename = image_url.rsplit("/", 1)[-1]
        file_path = UPLOAD_DIR / filename

        if not file_path.resolve().is_relative_to(UPLOAD_DIR.resolve()):
            raise ValueError("Invalid image path")
        if not file_path.exists():
            raise FileNotFoundError(f"Image not found: {filename}")

        ext = file_path.suffix.lower()
        media_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".gif": "image/gif",
            ".webp": "image/webp",
        }
        media_type = media_types.get(ext, "image/jpeg")

        data = file_path.read_bytes()
        return base64.standard_b64encode(data).decode("utf-8"), media_type

    def _build_prompt(
        self,
        space_title: str,
        space_description: Optional[str],
        user_description: Optional[str],
    ) -> str:
        context_parts = []
        if space_description:
            context_parts.append(f'Space description: "{space_description}"')

        desc_clause = ""
        if user_description:
            desc_clause = f' with this note: "{user_description}"'

        context_block = ""
        if context_parts:
            context_block = "\n".join(context_parts) + "\n\n"

        return f"""You are helping someone capture ideas for a creative space called "{space_title}".
{context_block}The user shared this image{desc_clause}.

The image could be anything — a design reference, an aesthetic they like, a whiteboard sketch, a product they admire, a place, a mood, or something with text.

Your job: understand what the user finds interesting or worth capturing, and articulate it as one or more standalone ideas. Each idea should be a concise sentence or two.

If you can clearly interpret what they're capturing:
Return: {{"status": "extracted", "ideas": [{{"text": "..."}}]}}

If the image is ambiguous and you're unsure what specifically interests them:
Return: {{"status": "needs_clarification", "questions": ["..."]}}
Keep questions to 1-3, short and specific.

Return ONLY valid JSON, no other text."""

    def _build_clarification_prompt(
        self,
        space_title: str,
        space_description: Optional[str],
        user_description: Optional[str],
        questions: List[str],
        answers: List[str],
    ) -> str:
        context_parts = []
        if space_description:
            context_parts.append(f'Space description: "{space_description}"')

        desc_clause = ""
        if user_description:
            desc_clause = f' with this note: "{user_description}"'

        context_block = ""
        if context_parts:
            context_block = "\n".join(context_parts) + "\n\n"

        qa_pairs = "\n".join(
            f"Q: {q}\nA: {a}" for q, a in zip(questions, answers)
        )

        return f"""You are helping someone capture ideas for a creative space called "{space_title}".
{context_block}The user shared this image{desc_clause}.

You previously asked clarifying questions. Here are the user's answers:

{qa_pairs}

Now extract standalone ideas based on the image and the user's answers. Each idea should be a concise sentence or two.

Return: {{"status": "extracted", "ideas": [{{"text": "..."}}]}}

Return ONLY valid JSON, no other text."""

    def _parse_response(self, text: str) -> Dict[str, Any]:
        """Parse LLM JSON response, handling optional markdown code blocks."""
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        return json.loads(text)

    def extract(
        self,
        image_url: str,
        space_title: str,
        space_description: Optional[str] = None,
        user_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Analyze an image and return extracted ideas or clarifying questions.

        Returns dict with:
            status: "extracted" | "needs_clarification"
            ideas: list of {"text": "..."} if extracted
            questions: list of strings if needs_clarification
        """
        image_data, media_type = self._read_image_as_base64(image_url)
        prompt = self._build_prompt(space_title, space_description, user_description)

        t0 = time.time()
        response = self.anthropic_client.messages.create(
            model=self.llm_model,
            max_tokens=1500,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
        )
        latency = int((time.time() - t0) * 1000)
        log_llm_usage(
            operation_type="space_image_extraction",
            provider="anthropic",
            model=self.llm_model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            latency_ms=latency,
        )

        try:
            result = self._parse_response(response.content[0].text)
        except (json.JSONDecodeError, IndexError):
            logger.warning("Failed to parse image extraction response")
            return {"status": "extracted", "ideas": [], "questions": []}

        status = result.get("status", "extracted")
        if status == "needs_clarification":
            return {
                "status": "needs_clarification",
                "ideas": [],
                "questions": result.get("questions", [])[:3],
            }
        return {
            "status": "extracted",
            "ideas": result.get("ideas", []),
            "questions": [],
        }

    def _build_outcome_prompt(
        self,
        action_text: str,
        space_title: str,
        user_description: Optional[str] = None,
    ) -> str:
        desc_clause = ""
        if user_description:
            desc_clause = f' and added: "{user_description}"'

        return f"""The user is working in a space called "{space_title}".
They completed this action: "{action_text}"
They uploaded this image showing what they accomplished{desc_clause}.

Summarize the outcome in 1-2 concise sentences. Focus on what was done, what changed, or what was achieved. Write as a factual summary, not a question.

Return ONLY valid JSON: {{"outcome_text": "..."}}"""

    def interpret_action_outcome(
        self,
        image_url: str,
        action_text: str,
        space_title: str,
        user_description: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Analyze an image showing the outcome of a completed action.

        Returns dict with:
            outcome_text: string summary of what was accomplished
        """
        image_data, media_type = self._read_image_as_base64(image_url)
        prompt = self._build_outcome_prompt(action_text, space_title, user_description)

        t0 = time.time()
        response = self.anthropic_client.messages.create(
            model=self.llm_model,
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
        )
        latency = int((time.time() - t0) * 1000)
        log_llm_usage(
            operation_type="space_action_outcome_interpretation",
            provider="anthropic",
            model=self.llm_model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            latency_ms=latency,
        )

        try:
            result = self._parse_response(response.content[0].text)
            return {"outcome_text": result.get("outcome_text", "")}
        except (json.JSONDecodeError, IndexError):
            logger.warning("Failed to parse action outcome interpretation response")
            return {"outcome_text": ""}

    def extract_with_clarification(
        self,
        image_url: str,
        space_title: str,
        space_description: Optional[str] = None,
        user_description: Optional[str] = None,
        questions: Optional[List[str]] = None,
        answers: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Re-extract ideas after the user answered clarifying questions.

        Always returns status="extracted" with ideas list.
        """
        image_data, media_type = self._read_image_as_base64(image_url)
        prompt = self._build_clarification_prompt(
            space_title, space_description, user_description,
            questions or [], answers or [],
        )

        t0 = time.time()
        response = self.anthropic_client.messages.create(
            model=self.llm_model,
            max_tokens=1500,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        },
                    ],
                }
            ],
        )
        latency = int((time.time() - t0) * 1000)
        log_llm_usage(
            operation_type="space_image_extraction",
            provider="anthropic",
            model=self.llm_model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
            latency_ms=latency,
        )

        try:
            result = self._parse_response(response.content[0].text)
        except (json.JSONDecodeError, IndexError):
            logger.warning("Failed to parse image clarification response")
            return {"status": "extracted", "ideas": [], "questions": []}

        return {
            "status": "extracted",
            "ideas": result.get("ideas", []),
            "questions": [],
        }
