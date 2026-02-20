"""Pydantic schemas for the admin LLM usage endpoint."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class LLMUsageSummary(BaseModel):
    total_calls: int
    total_cost: float
    total_input_tokens: int
    total_output_tokens: int
    avg_latency_ms: Optional[float]
    error_rate: float


class DailyCost(BaseModel):
    date: str
    cost: float
    calls: int


class OperationBreakdown(BaseModel):
    operation_type: str
    calls: int
    cost: float
    avg_latency_ms: Optional[float]


class ProviderBreakdown(BaseModel):
    provider: str
    calls: int
    cost: float


class ModelBreakdown(BaseModel):
    model: str
    calls: int
    cost: float


class RecentError(BaseModel):
    operation_type: str
    error_message: Optional[str]
    created_at: datetime


class AdminLLMUsageResponse(BaseModel):
    summary: LLMUsageSummary
    daily_costs: List[DailyCost]
    by_operation: List[OperationBreakdown]
    by_provider: List[ProviderBreakdown]
    by_model: List[ModelBreakdown]
    recent_errors: List[RecentError]
