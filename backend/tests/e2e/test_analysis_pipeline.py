"""
End-to-end test for the Mosaic analysis pipeline.

Tests the complete workflow across multiple scenarios:
1. Create conversation with diverse question types
2. Submit varied responses with clear thematic clusters
3. Close conversation and trigger AI analysis
4. Wait for analysis completion
5. Score analysis quality (deterministic + LLM-based)
6. Output link for manual review

Run with:
    pytest tests/e2e/test_analysis_pipeline.py -v -s --tb=short
    pytest tests/e2e/test_analysis_pipeline.py -v -s -k "community_garden"
    pytest tests/e2e/test_analysis_pipeline.py -v -s --generate-scenario "Music Festival"
"""

import json
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
import pytest

from tests.conftest import APIClient, BASE_URL

pytestmark = [pytest.mark.e2e, pytest.mark.slow]

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
SCENARIOS_DIR = Path(__file__).parent / "scenarios"


# =============================================================================
# Pytest hooks for --generate-scenario flag
# =============================================================================

def pytest_addoption(parser):
    parser.addoption(
        "--generate-scenario",
        action="store",
        default=None,
        help="Generate an additional scenario on-the-fly for the given topic"
    )


# =============================================================================
# Scenario loading
# =============================================================================

def load_scenarios_from_dir() -> List[dict]:
    """Load all JSON scenario files from the scenarios directory."""
    scenarios = []
    if not SCENARIOS_DIR.exists():
        return scenarios

    for filepath in sorted(SCENARIOS_DIR.glob("*.json")):
        with open(filepath) as f:
            scenario = json.load(f)
        scenarios.append(scenario)

    return scenarios


def generate_scenario_on_the_fly(topic: str) -> Optional[dict]:
    """Generate a scenario via LLM. Returns None if generation fails."""
    try:
        from tests.e2e.generate_scenario import generate_scenario, validate_scenario
    except ImportError:
        return None

    try:
        scenario = generate_scenario(topic, num_responses=10, num_questions=7)
        errors = validate_scenario(scenario)
        if errors:
            print(f"\nWarning: Generated scenario has validation issues: {errors}")
        return scenario
    except Exception as e:
        print(f"\nFailed to generate scenario: {e}")
        return None


def get_scenarios(config) -> List[dict]:
    """Get all scenarios to test, including any on-the-fly generated ones."""
    scenarios = load_scenarios_from_dir()

    # Check for --generate-scenario flag
    generate_topic = config.getoption("--generate-scenario", default=None) if config else None
    if generate_topic:
        generated = generate_scenario_on_the_fly(generate_topic)
        if generated:
            scenarios.append(generated)

    return scenarios


def pytest_generate_tests(metafunc):
    """Parametrize tests with loaded scenarios."""
    if "scenario" in metafunc.fixturenames:
        scenarios = get_scenarios(metafunc.config)
        if not scenarios:
            pytest.skip("No scenarios found")
        metafunc.parametrize(
            "scenario",
            scenarios,
            ids=[s.get("name", f"scenario_{i}") for i, s in enumerate(scenarios)]
        )


# =============================================================================
# Helpers
# =============================================================================

def build_response_payload(
    questions_from_api: List[dict],
    answer_data: Dict[str, Any]
) -> dict:
    """Map scenario answer data to API submission format.

    Args:
        questions_from_api: Questions as returned by the conversation creation API
            (with server-assigned question IDs but client-sent choice IDs)
        answer_data: Dict keyed by question_order (as string) with response values
    """
    # Build order-to-question map
    q_by_order = {str(q["question_order"]): q for q in questions_from_api}

    responses_array = []
    for q_order_str, answer in answer_data.items():
        if answer is None:
            continue

        question = q_by_order.get(q_order_str)
        if not question:
            continue

        entry = {"question_id": question["id"]}

        if "response_text" in answer:
            entry["response_text"] = answer["response_text"]
        if "response_data" in answer:
            entry["response_data"] = answer["response_data"]

        responses_array.append(entry)

    return {"responses": responses_array, "reveal_consent": False}


def wait_for_analysis(
    client: APIClient,
    conversation_id: str,
    timeout: int = 120,
    interval: int = 5
) -> Optional[dict]:
    """Poll for analysis completion.

    Returns analysis data when ready, or None on timeout.
    """
    start = time.time()
    while time.time() - start < timeout:
        # Try to get analysis directly
        response = client.get(f"/api/conversations/{conversation_id}/analysis")
        if response.status_code == 200:
            data = response.json()
            # Verify it has actual content (not an empty/in-progress result)
            if data.get("overall_summary"):
                return data

        # Check conversation state for error detection
        conv_response = client.get(f"/api/conversations/{conversation_id}")
        if conv_response.status_code == 200:
            state = conv_response.json().get("state")
            if state == "analyzed":
                # State is analyzed, try fetching analysis one more time
                time.sleep(2)
                response = client.get(f"/api/conversations/{conversation_id}/analysis")
                if response.status_code == 200:
                    return response.json()
            elif state not in ("analyzing", "closed"):
                # Unexpected state - something went wrong
                print(f"\nUnexpected conversation state: {state}")
                return None

        time.sleep(interval)

    print(f"\nAnalysis did not complete within {timeout}s timeout")
    return None


# =============================================================================
# Scoring
# =============================================================================

def score_deterministic(
    analysis: dict,
    scenario: dict,
    questions_from_api: List[dict]
) -> Dict[str, bool]:
    """Run deterministic checks on analysis results.

    Returns dict of check_name -> passed (bool).
    """
    expected = scenario["expected"]
    checks = {}

    # Structural checks
    checks["has_overall_summary"] = bool(analysis.get("overall_summary"))
    checks["correct_question_count"] = (
        len(analysis.get("question_analyses", [])) == len(scenario["questions"])
    )
    checks["has_surprising_insights"] = bool(analysis.get("surprising_insights"))
    checks["has_embedding_provider"] = analysis.get("embedding_provider") == "openai"
    checks["has_llm_provider"] = analysis.get("llm_provider") in ("anthropic", "claude")
    checks["total_responses_positive"] = (analysis.get("total_responses_analyzed", 0) > 0)

    # Build question analysis lookup by question text (more reliable than ID)
    qa_by_order = {}
    q_order_map = {q["id"]: str(q["question_order"]) for q in questions_from_api}
    for qa in analysis.get("question_analyses", []):
        q_id = qa.get("question_id")
        if q_id in q_order_map:
            qa_by_order[q_order_map[q_id]] = qa

    # Rating average checks
    for q_order_str, expected_avg in expected.get("rating_averages", {}).items():
        qa = qa_by_order.get(q_order_str)
        if qa and qa.get("rating_stats"):
            actual_avg = qa["rating_stats"].get("average", 0)
            checks[f"rating_q{q_order_str}_avg_exact"] = abs(actual_avg - expected_avg) < 0.02
            checks[f"rating_q{q_order_str}_count"] = (
                qa["rating_stats"].get("total_responses", 0) == expected["response_count"]
            )
        else:
            checks[f"rating_q{q_order_str}_avg_exact"] = False
            checks[f"rating_q{q_order_str}_count"] = False

    # Single choice count checks
    for q_order_str, expected_counts in expected.get("single_choice_counts", {}).items():
        qa = qa_by_order.get(q_order_str)
        if qa and qa.get("poll_stats"):
            actual_map = {
                c["label"]: c["count"]
                for c in qa["poll_stats"].get("choices", [])
            }
            for label, expected_count in expected_counts.items():
                checks[f"single_q{q_order_str}_{label}_count"] = (
                    actual_map.get(label, -1) == expected_count
                )
        else:
            for label in expected_counts:
                checks[f"single_q{q_order_str}_{label}_count"] = False

    # Multiple choice count checks
    for q_order_str, expected_counts in expected.get("multi_choice_counts", {}).items():
        qa = qa_by_order.get(q_order_str)
        if qa and qa.get("poll_stats"):
            actual_map = {
                c["label"]: c["count"]
                for c in qa["poll_stats"].get("choices", [])
            }
            for label, expected_count in expected_counts.items():
                checks[f"multi_q{q_order_str}_{label}_count"] = (
                    actual_map.get(label, -1) == expected_count
                )
        else:
            for label in expected_counts:
                checks[f"multi_q{q_order_str}_{label}_count"] = False

    # Text questions should have themes or summary
    for q in scenario["questions"]:
        if q["question_type"] == "text":
            q_order_str = str(q["question_order"])
            qa = qa_by_order.get(q_order_str)
            has_analysis = False
            if qa:
                has_analysis = bool(qa.get("themes")) or bool(qa.get("summary"))
            checks[f"text_q{q_order_str}_has_analysis"] = has_analysis

    return checks


def score_qualitative(analysis: dict, scenario: dict) -> dict:
    """Use LLM to evaluate analysis quality.

    Returns dict with scores (0-10) per dimension plus comments.
    """
    try:
        from anthropic import Anthropic
        from app.core.config import settings
    except ImportError:
        return {"error": "anthropic package or app config not available"}

    try:
        client = Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    except Exception:
        # Fall back to env var
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            return {"error": "No Anthropic API key available"}
        client = Anthropic(api_key=api_key)

    expected = scenario["expected"]
    text_themes = expected.get("text_themes", {})

    # Build ground truth description
    ground_truth_parts = []
    ground_truth_parts.append(f"Topic: {scenario['title']}")
    ground_truth_parts.append(f"Total responses: {expected['response_count']}")

    for q_order_str, themes in text_themes.items():
        # Find question text
        q_text = next(
            (q["question_text"] for q in scenario["questions"]
             if str(q["question_order"]) == q_order_str),
            f"Question {q_order_str}"
        )
        ground_truth_parts.append(f"\nExpected themes for \"{q_text}\":")
        for theme in themes:
            ground_truth_parts.append(f"  - {theme}")

    ground_truth = "\n".join(ground_truth_parts)

    # Truncate analysis to avoid token limits
    analysis_str = json.dumps(analysis, indent=2, default=str)
    if len(analysis_str) > 15000:
        analysis_str = analysis_str[:15000] + "\n... (truncated)"

    prompt = f"""You are evaluating the quality of an AI-generated analysis of feedback responses.

GROUND TRUTH (what the analysis should reflect):
{ground_truth}

AI ANALYSIS OUTPUT:
{analysis_str}

Score each dimension from 0 to 10:
1. THEME_IDENTIFICATION: Did the analysis identify the major thematic clusters listed in the ground truth?
2. SUMMARY_QUALITY: Is the overall summary accurate, specific, and non-generic?
3. INSIGHT_DEPTH: Do the surprising insights reveal genuine patterns grounded in the data?
4. COHERENCE: Is the analysis internally consistent and well-structured?
5. COMPLETENESS: Are all questions adequately covered in the analysis?

Return ONLY valid JSON (no markdown):
{{"theme_identification": N, "summary_quality": N, "insight_depth": N, "coherence": N, "completeness": N, "comments": "1-2 sentence explanation"}}"""

    try:
        message = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()

        # Strip markdown code blocks if present
        if "```" in response_text:
            lines = response_text.split("\n")
            lines = [l for l in lines if not l.strip().startswith("```")]
            response_text = "\n".join(lines).strip()

        return json.loads(response_text)
    except Exception as e:
        return {"error": f"LLM evaluation failed: {e}"}


def print_scorecard(
    scenario_name: str,
    deterministic: Dict[str, bool],
    qualitative: dict,
    review_url: str
):
    """Print a formatted scorecard to stdout."""
    print(f"\n{'=' * 70}")
    print(f"  ANALYSIS PIPELINE SCORECARD: {scenario_name}")
    print(f"{'=' * 70}")

    # Deterministic checks
    print(f"\n  Deterministic Checks:")
    passed = sum(1 for v in deterministic.values() if v)
    total = len(deterministic)
    for name, check_passed in sorted(deterministic.items()):
        status = "PASS" if check_passed else "FAIL"
        print(f"    [{status}] {name}")
    print(f"\n    Result: {passed}/{total} passed")

    # Qualitative scores
    print(f"\n  Qualitative Scores (LLM-evaluated, 0-10):")
    if "error" not in qualitative:
        score_values = []
        for key, score in qualitative.items():
            if key != "comments" and isinstance(score, (int, float)):
                print(f"    {key}: {score}/10")
                score_values.append(score)
        if score_values:
            avg = sum(score_values) / len(score_values)
            print(f"\n    Average: {avg:.1f}/10")
        if qualitative.get("comments"):
            print(f"    Comments: {qualitative['comments']}")
    else:
        print(f"    Error: {qualitative.get('error')}")

    # Manual review link
    print(f"\n  Manual Review:")
    print(f"    URL: {review_url}")
    print(f"    Access: public_link (login as shreyash02@gmail.com)")
    print(f"{'=' * 70}\n")


# =============================================================================
# Test
# =============================================================================

class TestAnalysisPipeline:

    def test_analysis_quality(self, verified_authenticated_client: APIClient, scenario: dict):
        """Full analysis pipeline E2E test for a single scenario."""
        client = verified_authenticated_client
        scenario_name = scenario.get("name", "unknown")

        # --- Step 1: Create conversation ---
        conv_response = client.post("/api/conversations", json={
            "title": f"{scenario['title']} [E2E Test]",
            "description": scenario["description"],
            "anonymity_level": "fully_anonymous",
            "results_access": "public_link",
            "manual_close_enabled": True,
            "questions": scenario["questions"]
        })
        assert conv_response.status_code == 201, (
            f"Failed to create conversation: {conv_response.text}"
        )

        conv_data = conv_response.json()
        conversation_id = conv_data["id"]
        questions_from_api = conv_data.get("questions", [])
        review_url = f"{FRONTEND_URL}/analysis/{conversation_id}"

        print(f"\n  [{scenario_name}] Conversation created: {conversation_id}")

        # --- Step 2: Activate ---
        activate_response = client.post(
            f"/api/conversations/{conversation_id}/activate",
            json={}
        )
        assert activate_response.status_code == 200, (
            f"Failed to activate: {activate_response.text}"
        )

        # --- Step 3: Generate participant codes ---
        num_responses = len(scenario["responses"])
        codes_response = client.post(
            f"/api/conversations/{conversation_id}/participant-codes",
            json={"count": num_responses}
        )
        assert codes_response.status_code == 201, (
            f"Failed to generate participant codes: {codes_response.text}"
        )
        codes = codes_response.json().get("codes", [])
        assert len(codes) == num_responses, (
            f"Expected {num_responses} codes, got {len(codes)}"
        )

        # --- Step 4: Submit responses ---
        for i, response_data in enumerate(scenario["responses"]):
            payload = build_response_payload(questions_from_api, response_data["answers"])
            payload["participant_code"] = codes[i]

            submit_url = f"{BASE_URL}/api/conversations/{codes[i]}/responses"
            with httpx.Client() as http_client:
                response = http_client.post(
                    submit_url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
            assert response.status_code == 201, (
                f"Response {i} failed ({response.status_code}): {response.text}"
            )

        print(f"  [{scenario_name}] {num_responses} responses submitted")

        # --- Step 5: Close conversation ---
        close_response = client.post(f"/api/conversations/{conversation_id}/close")
        assert close_response.status_code == 200, (
            f"Failed to close: {close_response.text}"
        )

        # --- Step 6: Trigger analysis ---
        analyze_response = client.post(
            f"/api/conversations/{conversation_id}/analyze",
            json={}
        )

        if analyze_response.status_code == 403:
            detail = analyze_response.json().get("detail", "")
            if "not available" in str(detail).lower():
                pytest.skip("ai_analysis feature flag not enabled for this user/tier")
            if "LIMIT_REACHED" in str(detail):
                pytest.skip(f"Analysis usage limit reached: {detail}")

        assert analyze_response.status_code == 200, (
            f"Failed to trigger analysis: {analyze_response.text}"
        )

        print(f"  [{scenario_name}] Analysis triggered, waiting for completion...")

        # --- Step 7: Wait for analysis ---
        analysis = wait_for_analysis(client, conversation_id, timeout=180)
        assert analysis is not None, (
            f"Analysis did not complete within timeout. "
            f"Conversation ID: {conversation_id} - check server logs."
        )

        print(f"  [{scenario_name}] Analysis complete "
              f"({analysis.get('analysis_duration_ms', '?')}ms, "
              f"{analysis.get('total_responses_analyzed', '?')} responses)")

        # --- Step 8: Score ---
        deterministic_scores = score_deterministic(analysis, scenario, questions_from_api)
        qualitative_scores = score_qualitative(analysis, scenario)

        # --- Step 9: Print scorecard ---
        print_scorecard(scenario_name, deterministic_scores, qualitative_scores, review_url)

        # --- Step 10: Assert critical checks ---
        # Structural assertions (hard fail)
        assert deterministic_scores["has_overall_summary"], "Missing overall summary"
        assert deterministic_scores["correct_question_count"], "Wrong number of question analyses"
        assert deterministic_scores["total_responses_positive"], "No responses analyzed"

        # Rating accuracy (hard fail - these are mathematical facts)
        for key, passed in deterministic_scores.items():
            if key.startswith("rating_") and key.endswith("_avg_exact"):
                assert passed, f"Rating average mismatch: {key}"
            if key.startswith("rating_") and key.endswith("_count"):
                assert passed, f"Rating response count mismatch: {key}"

        # Poll accuracy (hard fail - these are exact counts)
        for key, passed in deterministic_scores.items():
            if "_count" in key and (key.startswith("single_") or key.startswith("multi_")):
                assert passed, f"Poll count mismatch: {key}"

        # Qualitative sanity check (soft - warn but don't fail unless very bad)
        if "error" not in qualitative_scores:
            score_values = [
                v for k, v in qualitative_scores.items()
                if k != "comments" and isinstance(v, (int, float))
            ]
            if score_values:
                avg = sum(score_values) / len(score_values)
                if avg < 3.0:
                    print(f"\n  WARNING: Very low qualitative score ({avg:.1f}/10) "
                          f"for {scenario_name}")
