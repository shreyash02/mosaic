#!/usr/bin/env python3
"""
Generate test scenario JSON files for the analysis pipeline E2E test.

Uses Claude to create realistic conversation scenarios with diverse questions,
varied responses, and expected analysis ground truth.

Usage:
    python tests/e2e/generate_scenario.py --topic "Music Festival" --output tests/e2e/scenarios/music_festival.json
    python tests/e2e/generate_scenario.py --topic "Book Club" --responses 12
    python tests/e2e/generate_scenario.py --topic "Volunteer Program" --questions 8 --responses 10
"""

import argparse
import json
import sys
import uuid
from pathlib import Path


SCENARIO_SCHEMA = """{
  "name": "snake_case_name",
  "title": "Conversation Title",
  "description": "1-2 sentence description for participants",
  "questions": [
    {
      "question_text": "...",
      "question_type": "text|rating|single_choice|multiple_choice",
      "question_order": 0,
      "is_required": true|false,
      "options": null | {"min": 1, "max": 10} | {"choices": [{"id": "unique-id", "label": "Choice text"}, ...]}
    }
  ],
  "responses": [
    {
      "answers": {
        "<question_order>": {"response_text": "..."} | {"response_data": {"rating": N}} | {"response_data": {"selected": "choice-id"}} | {"response_data": {"selected": ["id1", "id2"]}}
      }
    }
  ],
  "expected": {
    "response_count": N,
    "rating_averages": {"<question_order>": avg_value},
    "single_choice_counts": {"<question_order>": {"Label": count, ...}},
    "multi_choice_counts": {"<question_order>": {"Label": count, ...}},
    "text_themes": {"<question_order>": ["Theme 1", "Theme 2", "Theme 3"]}
  }
}"""


def generate_scenario(topic: str, num_responses: int = 10, num_questions: int = 7) -> dict:
    """Generate a scenario using Claude."""
    try:
        from anthropic import Anthropic
    except ImportError:
        print("Error: anthropic package required. Install with: pip install anthropic")
        sys.exit(1)

    client = Anthropic()

    prompt = f"""Generate a realistic feedback/survey scenario for an E2E test of an analysis pipeline.

TOPIC: {topic}
NUMBER OF QUESTIONS: {num_questions} (must include a mix of all 4 types: text, rating, single_choice, multiple_choice)
NUMBER OF RESPONSES: {num_responses}

REQUIREMENTS:
1. Questions:
   - At least 2-3 text questions (these produce the richest analysis)
   - At least 1 rating question (scale 1-10)
   - At least 1 single_choice question (3-5 options)
   - At least 1 multiple_choice question (4-6 options)
   - Choice options MUST have unique string IDs (like "sc-option1", "mc-area1")
   - question_order starts at 0

2. Responses:
   - Text answers must be 1-3 sentences, substantive and realistic (not generic)
   - Text responses should form 2-4 identifiable thematic clusters per text question
   - Each cluster should have 2-5 responses
   - Ratings should vary (not all high or all low), range across at least 4 different values
   - Single choice answers should be unevenly distributed (some options more popular)
   - Multiple choice selections should vary (1-4 selections per respondent)
   - Optional questions (is_required: false) can have null answers for some respondents

3. Expected ground truth:
   - rating_averages: calculated averages for each rating question (keyed by question_order as string)
   - single_choice_counts: exact count per label for each single choice question
   - multi_choice_counts: exact count per label for each multiple choice question
   - text_themes: 2-4 theme descriptions per text question that the analysis should identify

4. The scenario should feel natural - like real feedback from real people with diverse perspectives.

OUTPUT FORMAT (JSON only, no markdown):
{SCENARIO_SCHEMA}

Return ONLY valid JSON. No explanation, no markdown code blocks."""

    message = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=8000,
        messages=[{"role": "user", "content": prompt}]
    )

    response_text = message.content[0].text.strip()

    # Strip markdown code blocks if present
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        # Remove first and last lines (```json and ```)
        lines = [l for l in lines if not l.strip().startswith("```")]
        response_text = "\n".join(lines)

    return json.loads(response_text)


def validate_scenario(scenario: dict) -> list[str]:
    """Validate a scenario structure. Returns list of errors."""
    errors = []

    for field in ["name", "title", "description", "questions", "responses", "expected"]:
        if field not in scenario:
            errors.append(f"Missing required field: {field}")

    if not errors:
        questions = scenario["questions"]
        responses = scenario["responses"]
        expected = scenario["expected"]

        # Check question types
        q_types = {q["question_type"] for q in questions}
        if "text" not in q_types:
            errors.append("Must have at least one text question")
        if "rating" not in q_types:
            errors.append("Must have at least one rating question")

        # Check response count
        if len(responses) != expected.get("response_count", -1):
            errors.append(f"Response count mismatch: {len(responses)} responses but expected.response_count = {expected.get('response_count')}")

        # Check choice IDs exist
        for q in questions:
            if q["question_type"] in ("single_choice", "multiple_choice"):
                choices = q.get("options", {}).get("choices", [])
                if not choices:
                    errors.append(f"Question '{q['question_text']}' has no choices")
                for c in choices:
                    if "id" not in c or "label" not in c:
                        errors.append(f"Choice missing id/label in question '{q['question_text']}'")

        # Verify rating averages
        for q_order_str, expected_avg in expected.get("rating_averages", {}).items():
            q_order = int(q_order_str)
            ratings = []
            for resp in responses:
                ans = resp.get("answers", {}).get(q_order_str)
                if ans and "response_data" in ans and "rating" in ans["response_data"]:
                    ratings.append(ans["response_data"]["rating"])
            if ratings:
                actual_avg = sum(ratings) / len(ratings)
                if abs(actual_avg - expected_avg) > 0.01:
                    errors.append(f"Rating average mismatch for q{q_order}: actual={actual_avg:.4f}, expected={expected_avg}")

    return errors


def main():
    parser = argparse.ArgumentParser(description="Generate analysis test scenarios")
    parser.add_argument("--topic", required=True, help="Topic for the scenario")
    parser.add_argument("--responses", type=int, default=10, help="Number of responses (default: 10)")
    parser.add_argument("--questions", type=int, default=7, help="Number of questions (default: 7)")
    parser.add_argument("--output", type=str, default=None, help="Output file path (default: scenarios/<topic_snake>.json)")
    parser.add_argument("--validate-only", type=str, default=None, help="Validate an existing scenario file")

    args = parser.parse_args()

    if args.validate_only:
        with open(args.validate_only) as f:
            scenario = json.load(f)
        errors = validate_scenario(scenario)
        if errors:
            print(f"Validation FAILED ({len(errors)} errors):")
            for e in errors:
                print(f"  - {e}")
            sys.exit(1)
        else:
            print("Validation PASSED")
            sys.exit(0)

    print(f"Generating scenario for: {args.topic}")
    print(f"  Questions: {args.questions}, Responses: {args.responses}")

    scenario = generate_scenario(args.topic, args.responses, args.questions)

    # Validate
    errors = validate_scenario(scenario)
    if errors:
        print(f"\nWarning: Generated scenario has {len(errors)} validation issues:")
        for e in errors:
            print(f"  - {e}")

    # Determine output path
    if args.output:
        output_path = Path(args.output)
    else:
        snake_name = args.topic.lower().replace(" ", "_").replace("-", "_")
        # Remove non-alphanumeric chars except underscores
        snake_name = "".join(c for c in snake_name if c.isalnum() or c == "_")
        output_path = Path(__file__).parent / "scenarios" / f"{snake_name}.json"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with open(output_path, "w") as f:
        json.dump(scenario, f, indent=2)

    print(f"\nScenario saved to: {output_path}")
    print(f"  Name: {scenario.get('name')}")
    print(f"  Title: {scenario.get('title')}")
    print(f"  Questions: {len(scenario.get('questions', []))}")
    print(f"  Responses: {len(scenario.get('responses', []))}")

    if not errors:
        print("  Validation: PASSED")


if __name__ == "__main__":
    main()
