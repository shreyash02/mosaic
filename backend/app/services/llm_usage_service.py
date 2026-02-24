"""Lightweight helper for logging LLM API usage to the database."""

import logging
from typing import Optional
from uuid import UUID

logger = logging.getLogger(__name__)

# Pricing per 1M tokens (USD)
PRICING = {
    "claude-sonnet-4-5-20250929": {"input": 3.0, "output": 15.0},
    "claude-haiku-4-5-20251001": {"input": 1.0, "output": 5.0},
    "text-embedding-3-small": {"input": 0.02},
}


def _estimate_cost(model: str, input_tokens: Optional[int], output_tokens: Optional[int], total_tokens: Optional[int]) -> float:
    """Calculate estimated cost in USD from token counts and pricing table."""
    rates = PRICING.get(model, {})
    cost = 0.0
    if input_tokens and "input" in rates:
        cost += input_tokens * rates["input"] / 1_000_000
    if output_tokens and "output" in rates:
        cost += output_tokens * rates["output"] / 1_000_000
    # For embeddings that only report total_tokens
    if total_tokens and not input_tokens and "input" in rates:
        cost += total_tokens * rates["input"] / 1_000_000
    return cost


def log_llm_usage(
    operation_type: str,
    provider: str,
    model: str,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    total_tokens: Optional[int] = None,
    latency_ms: Optional[int] = None,
    status: str = "success",
    error_message: Optional[str] = None,
    entity_id: Optional[UUID] = None,
    user_id: Optional[UUID] = None,
) -> None:
    """
    Log a single LLM API call. Creates its own DB session. Errors logged, not raised.

    Services call this after each LLM request. It's fire-and-forget — failures
    in logging never break the calling service.
    """
    try:
        from app.core.database import SessionLocal
        from app.models.llm_usage_log import LLMUsageLog

        estimated_cost = _estimate_cost(model, input_tokens, output_tokens, total_tokens)

        db = SessionLocal()
        try:
            log_entry = LLMUsageLog(
                operation_type=operation_type,
                entity_id=entity_id,
                user_id=user_id,
                provider=provider,
                model=model,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=estimated_cost,
                latency_ms=latency_ms,
                status=status,
                error_message=error_message,
            )
            db.add(log_entry)
            db.commit()
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Failed to log LLM usage ({operation_type}): {e}")
