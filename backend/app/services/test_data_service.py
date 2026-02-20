"""Service for generating test data for conversations."""

import logging
import random
import time
import traceback
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from anthropic import Anthropic
from app.services.llm_usage_service import log_llm_usage

from app.core.config import settings
from app.models.question import Question

logger = logging.getLogger(__name__)


class TestDataService:
    """Service for generating realistic test responses for conversations."""

    def __init__(self, model: str = "claude-sonnet-4-5-20250929"):
        """Initialize the test data service with Anthropic client."""
        self.anthropic_client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.llm_model = model

    def generate_test_responses(
        self,
        questions: List[Question],
        num_respondents: int,
        start_time: datetime,
        end_time: datetime,
        conversation_title: str,
        conversation_description: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Generate test responses for a conversation.

        Args:
            questions: List of Question objects
            num_respondents: Number of unique respondents to simulate
            start_time: Start of the time range for responses
            end_time: End of the time range for responses
            conversation_title: Title of the conversation for context
            conversation_description: Optional description for additional context

        Returns:
            List of response dicts ready to be inserted into the database
        """
        logger.info(f"Generating test responses: {num_respondents} respondents, {len(questions)} questions")
        logger.info(f"Time range: {start_time} to {end_time}")
        responses = []

        # Generate random timestamps spread across the time range
        time_diff = (end_time - start_time).total_seconds()

        # Generate text responses using LLM for all text questions at once
        text_questions = [q for q in questions if q.question_type == 'text']
        text_responses_map = {}

        if text_questions:
            logger.info(f"Generating LLM responses for {len(text_questions)} text questions")
            text_responses_map = self._generate_text_responses_batch(
                text_questions,
                num_respondents,
                conversation_title,
                conversation_description
            )
            logger.info(f"Generated text responses for {len(text_responses_map)} questions")

        for respondent_idx in range(num_respondents):
            # Generate a random timestamp for this respondent
            random_offset = random.uniform(0, time_diff)
            submitted_at = start_time + timedelta(seconds=random_offset)

            # Generate a unique participant code
            participant_code = f"test_{uuid.uuid4().hex[:8]}"

            for question in questions:
                response_data = self._generate_response_for_question(
                    question,
                    respondent_idx,
                    text_responses_map
                )

                responses.append({
                    "question_id": str(question.id),
                    "conversation_id": str(question.conversation_id),
                    "response_text": response_data.get("response_text"),
                    "response_data": response_data.get("response_data"),
                    "participant_code_used": participant_code,
                    "anonymity_level": "fully_anonymous",
                    "reveal_consent": False,
                    "status": "submitted",
                    "submitted_at": submitted_at,
                    "is_test_data": True,
                })

        return responses

    def _generate_response_for_question(
        self,
        question: Question,
        respondent_idx: int,
        text_responses_map: Dict[str, List[str]]
    ) -> Dict[str, Any]:
        """Generate a response for a specific question type."""

        if question.question_type == 'text':
            # Use pre-generated text responses
            question_id = str(question.id)
            if question_id in text_responses_map:
                responses_list = text_responses_map[question_id]
                # Cycle through responses if we have more respondents than responses
                response_text = responses_list[respondent_idx % len(responses_list)]
                return {"response_text": response_text}
            return {"response_text": "No response generated"}

        elif question.question_type == 'rating':
            # Generate random rating
            options = question.options or {}
            min_val = options.get('min', 1)
            max_val = options.get('max', 10)
            # Slightly bias towards middle-high values for realism
            rating = self._generate_weighted_rating(min_val, max_val)
            return {"response_data": {"rating": rating}}

        elif question.question_type == 'single_choice':
            # Pick a random choice
            options = question.options or {}
            choices = options.get('choices', [])
            if choices:
                # Weight towards earlier choices slightly for realism
                weights = [1.0 / (i + 1) for i in range(len(choices))]
                total = sum(weights)
                weights = [w / total for w in weights]
                selected = random.choices(choices, weights=weights, k=1)[0]
                return {"response_data": {"selected_choice_id": selected.get('id')}}
            return {"response_data": {"selected_choice_id": None}}

        elif question.question_type == 'multiple_choice':
            # Pick random number of choices
            options = question.options or {}
            choices = options.get('choices', [])
            max_selections = options.get('max_selections', len(choices))

            if choices:
                # Random number of selections (at least 1)
                num_selections = random.randint(1, min(max_selections, len(choices)))
                selected = random.sample(choices, num_selections)
                return {"response_data": {"selected_choice_ids": [c.get('id') for c in selected]}}
            return {"response_data": {"selected_choice_ids": []}}

        return {"response_text": "Unknown question type"}

    def _generate_weighted_rating(self, min_val: int, max_val: int) -> int:
        """Generate a rating with slight bias towards middle-high values."""
        # Use a normal distribution centered slightly above middle
        mean = (min_val + max_val) / 2 + (max_val - min_val) * 0.1
        std_dev = (max_val - min_val) / 4
        rating = int(round(random.gauss(mean, std_dev)))
        return max(min_val, min(max_val, rating))

    def _generate_text_responses_batch(
        self,
        questions: List[Question],
        num_respondents: int,
        conversation_title: str,
        conversation_description: Optional[str]
    ) -> Dict[str, List[str]]:
        """
        Generate text responses for multiple questions using LLM.

        Returns a dict mapping question_id to list of response texts.
        """
        result = {}

        # Build the prompt
        questions_text = "\n".join([
            f"Question {i+1} (ID: {q.id}): {q.question_text}"
            for i, q in enumerate(questions)
        ])

        context = f"Conversation: {conversation_title}"
        if conversation_description:
            context += f"\nDescription: {conversation_description}"

        prompt = f"""You are generating realistic test responses for a survey/feedback conversation.

{context}

Questions:
{questions_text}

Generate {num_respondents} unique, realistic responses for EACH question. The responses should:
1. Be varied in perspective, length, and tone (some positive, some negative, some neutral)
2. Be realistic and relevant to the question
3. Range from brief (1-2 sentences) to more detailed (3-5 sentences)
4. Represent diverse viewpoints that real respondents might have

Output format - use this EXACT structure for each question.
IMPORTANT: Use the exact ID value shown in parentheses above (e.g., if a question shows "ID: abc-123", use "abc-123" as the question_id below).

===QUESTION_ID:paste_the_exact_id_here===
RESPONSE_1: [response text]
RESPONSE_2: [response text]
...and so on for all {num_respondents} responses

Example: If Question 1 has ID "550e8400-e29b-41d4-a716-446655440000", you would write:
===QUESTION_ID:550e8400-e29b-41d4-a716-446655440000===
RESPONSE_1: I think the product is great...
RESPONSE_2: There are some issues with...

Now generate responses for ALL questions listed above:"""

        try:
            t0 = time.time()
            response = self.anthropic_client.messages.create(
                model=self.llm_model,
                max_tokens=4000,
                messages=[{"role": "user", "content": prompt}]
            )
            latency = int((time.time() - t0) * 1000)
            log_llm_usage(
                operation_type="test_data_generation", provider="anthropic", model=self.llm_model,
                input_tokens=response.usage.input_tokens, output_tokens=response.usage.output_tokens,
                latency_ms=latency,
            )

            # Parse the response
            content = response.content[0].text
            result = self._parse_llm_responses(content, questions, num_respondents)

        except Exception as e:
            # Fallback to generic responses if LLM fails
            logger.error(f"LLM generation failed: {e}")
            logger.error(f"Full traceback:\n{traceback.format_exc()}")
            for q in questions:
                result[str(q.id)] = [
                    f"Test response {i+1} for: {q.question_text[:50]}"
                    for i in range(num_respondents)
                ]

        return result

    def _parse_llm_responses(
        self,
        content: str,
        questions: List[Question],
        num_respondents: int
    ) -> Dict[str, List[str]]:
        """Parse LLM output into structured responses."""
        result = {}

        # Initialize with empty lists
        for q in questions:
            result[str(q.id)] = []

        # Parse the content
        current_question_id = None

        for line in content.split('\n'):
            line = line.strip()

            # Check for question marker
            if line.startswith('===QUESTION_ID:'):
                try:
                    # Extract question ID
                    question_id = line.replace('===QUESTION_ID:', '').replace('===', '').strip()
                    if question_id in result:
                        current_question_id = question_id
                except Exception:
                    continue

            # Check for response line
            elif line.startswith('RESPONSE_') and current_question_id:
                # Extract response text after the colon
                if ':' in line:
                    response_text = line.split(':', 1)[1].strip()
                    if response_text:
                        result[current_question_id].append(response_text)

        # Ensure we have enough responses for each question
        for q in questions:
            qid = str(q.id)
            while len(result[qid]) < num_respondents:
                # Duplicate existing responses or add placeholder
                if result[qid]:
                    result[qid].append(random.choice(result[qid]))
                else:
                    result[qid].append(f"Test response for: {q.question_text[:50]}")

        return result
