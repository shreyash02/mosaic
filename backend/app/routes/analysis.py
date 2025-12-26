"""Analysis routes."""

from fastapi import APIRouter

router = APIRouter()


@router.post("/conversations/{conversation_id}/analyze")
async def trigger_analysis():
    """Trigger LLM analysis for a conversation."""
    # TODO: Implement
    pass


@router.get("/conversations/{conversation_id}/analysis")
async def get_analysis():
    """Get analysis results for a conversation."""
    # TODO: Implement
    pass
