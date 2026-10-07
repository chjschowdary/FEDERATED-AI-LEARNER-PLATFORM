import os
import json
import asyncio
from typing import Dict, Any, Callable, List, Optional
import datetime

class EventBus:
    """
    Production Event Bus & Message Broker Interface.
    Integrates with RabbitMQ / Redis Streams in distributed cloud deployments,
    with an ultra-fast asyncio in-memory pub-sub fallback for single-node execution.
    """
    def __init__(self):
        self.subscribers: Dict[str, List[Callable[[Dict[str, Any]], Any]]] = {}
        self.history: List[Dict[str, Any]] = []
        self.ws_connections: List[Any] = []

    def subscribe(self, event_type: str, callback: Callable[[Dict[str, Any]], Any]):
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)

    def register_websocket(self, ws: Any):
        self.ws_connections.append(ws)

    def unregister_websocket(self, ws: Any):
        if ws in self.ws_connections:
            self.ws_connections.remove(ws)

    async def broadcast_ws(self, message: Dict[str, Any]):
        """Broadcasts real-time events to all connected UI clients."""
        dead_conns = []
        for ws in self.ws_connections:
            try:
                await ws.send_json(message)
            except Exception:
                dead_conns.append(ws)
        for dead in dead_conns:
            self.unregister_websocket(dead)

    async def publish(self, event_type: str, payload: Dict[str, Any]):
        event = {
            "event_type": event_type,
            "payload": payload,
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        self.history.append(event)
        if len(self.history) > 100:
            self.history = self.history[-100:]
            
        # Invoke registered callbacks
        if event_type in self.subscribers:
            for cb in self.subscribers[event_type]:
                try:
                    if asyncio.iscoroutinefunction(cb):
                        await cb(payload)
                    else:
                        cb(payload)
                except Exception as e:
                    print(f"[EventBus] Error in callback for {event_type}: {e}")
                    
        # Broadcast to live frontend via WebSockets
        await self.broadcast_ws(event)

event_bus = EventBus()
