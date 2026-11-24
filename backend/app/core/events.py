import asyncio
import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any


class EventBus:
    """In-memory asyncio pub/sub bus for real-time operational SSE broadcasts."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        self._subscribers.add(queue)
        return queue

    def unsubscribe(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers.discard(queue)

    async def publish(
        self,
        event_type: str,
        *,
        title: str,
        detail: str,
        actor: str | None = None,
        from_code: str | None = None,
        to_code: str | None = None,
        product_name: str | None = None,
        quantity: int | None = None,
        kind: str = "system",
    ) -> None:
        payload: dict[str, Any] = {
            "id": f"evt-{int(datetime.now(UTC).timestamp() * 1000)}",
            "event_type": event_type,
            "kind": kind,
            "title": title,
            "detail": detail,
            "actor": actor,
            "from_code": from_code,
            "to_code": to_code,
            "product_name": product_name,
            "quantity": quantity,
            "timestamp": datetime.now(UTC).isoformat(),
        }
        stale: list[asyncio.Queue[dict[str, Any]]] = []
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(payload)
            except asyncio.QueueFull:
                stale.append(queue)
        for q in stale:
            self._subscribers.discard(q)

    async def stream(self, queue: asyncio.Queue[dict[str, Any]]) -> AsyncIterator[str]:
        try:
            yield f"data: {json.dumps({'event_type': 'connected', 'timestamp': datetime.now(UTC).isoformat()})}\n\n"
            while True:
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield f"data: {json.dumps(event)}\n\n"
                except TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            self.unsubscribe(queue)


event_bus = EventBus()
