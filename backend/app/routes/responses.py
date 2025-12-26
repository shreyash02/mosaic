"""Response submission routes."""

from fastapi import APIRouter

router = APIRouter()


@router.post("/conversations/{invite_code}/responses")
async def submit_response():
    """Submit a response to a conversation."""
    # TODO: Implement
    pass


@router.get("/conversations/{conversation_id}/responses")
async def get_responses():
    """Get all responses for a conversation (owner only)."""
    # TODO: Implement
    pass
