"""SSE (Server-Sent Events) connection manager service."""

import asyncio
import json
import logging
from typing import Dict, Set, Any
from uuid import UUID

logger = logging.getLogger(__name__)


class SSEService:
    """Service for managing SSE connections and broadcasting messages to users."""

    def __init__(self):
        # In-memory mapping of user_id -> Set[asyncio.Queue]
        # Supports multiple tabs/connections per user
        self._connections: Dict[UUID, Set[asyncio.Queue]] = {}
        self._lock = asyncio.Lock()
        self._loop: asyncio.AbstractEventLoop | None = None

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        """Store the main event loop so sync threads can schedule coroutines."""
        self._loop = loop

    def send_to_user_sync(self, user_id: UUID, event_type: str, data: Any) -> None:
        """Best-effort sync bridge to send_to_user() from a background thread."""
        if self._loop is None:
            logger.warning("SSE loop not set, cannot send sync event")
            return
        try:
            asyncio.run_coroutine_threadsafe(
                self.send_to_user(user_id, event_type, data),
                self._loop,
            )
        except Exception as e:
            logger.warning(f"Failed to send SSE event (sync bridge): {e}")

    async def connect(self, user_id: UUID) -> asyncio.Queue:
        """
        Register a new SSE connection for a user.
        Returns an asyncio.Queue that will receive messages.
        """
        queue: asyncio.Queue = asyncio.Queue()

        async with self._lock:
            if user_id not in self._connections:
                self._connections[user_id] = set()
            self._connections[user_id].add(queue)
            connection_count = len(self._connections[user_id])

        logger.info(f"SSE connection established for user {user_id} (total connections: {connection_count})")
        return queue

    async def disconnect(self, user_id: UUID, queue: asyncio.Queue) -> None:
        """Remove an SSE connection for a user."""
        async with self._lock:
            if user_id in self._connections:
                self._connections[user_id].discard(queue)
                if not self._connections[user_id]:
                    del self._connections[user_id]
                    logger.info(f"SSE: All connections closed for user {user_id}")
                else:
                    logger.info(f"SSE connection closed for user {user_id} (remaining: {len(self._connections[user_id])})")

    async def send_to_user(self, user_id: UUID, event_type: str, data: Any) -> int:
        """
        Send a message to all connections for a user.
        Returns the number of connections that received the message.
        """
        message = {
            "event": event_type,
            "data": data
        }

        sent_count = 0
        async with self._lock:
            queues = self._connections.get(user_id, set()).copy()

        for queue in queues:
            try:
                await queue.put(message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send SSE message to user {user_id}: {e}")

        if sent_count > 0:
            logger.debug(f"SSE message sent to {sent_count} connections for user {user_id}")

        return sent_count

    def is_connected(self, user_id: UUID) -> bool:
        """Check if a user has any active SSE connections."""
        return user_id in self._connections and len(self._connections[user_id]) > 0

    def get_connection_count(self, user_id: UUID) -> int:
        """Get the number of active connections for a user."""
        return len(self._connections.get(user_id, set()))

    def get_total_connections(self) -> int:
        """Get the total number of active SSE connections across all users."""
        return sum(len(queues) for queues in self._connections.values())

    def format_sse_message(self, event: str, data: Any) -> str:
        """Format a message in SSE format."""
        json_data = json.dumps(data) if not isinstance(data, str) else data
        return f"event: {event}\ndata: {json_data}\n\n"


# Singleton instance
sse_service = SSEService()
