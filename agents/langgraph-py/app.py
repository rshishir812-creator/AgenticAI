"""
FastAPI wrapper — exposes the Python agentic-RAG agent over the same
AG-UI SSE event-stream contract as apps/studio/app/api/run/route.ts, so
the Studio's existing Python-proxy branch
(agentId?.startsWith("langgraph-py:") in api/run/route.ts) can call this
service directly.

Run:
    uvicorn app:app --port 8010
"""
import json
import queue
import threading
import time

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from agentic_rag import run_agentic_rag

app = FastAPI(title="langgraph-py")


class RunRequest(BaseModel):
    agentId: str
    input: str
    config: dict = {}


@app.get("/health")
async def health():
    return {"status": "ok", "server": "langgraph-py", "version": "0.1.0"}


@app.get("/.well-known/agent-card.json")
async def agent_card():
    return {
        "id": "langgraph-py-agentic-rag",
        "name": "LangGraph Python — Agentic RAG",
        "description": "Self-RAG + Corrective RAG StateGraph, Python/LangGraph implementation",
        "version": "0.1.0",
        "capabilities": {"a2a": {"taskLifecycle": True}},
    }


@app.post("/api/run")
async def run(req: RunRequest):
    if not req.agentId.startswith("langgraph-py:"):
        def bad_agent():
            yield f"data: {json.dumps({'type': 'error', 'code': 'UNKNOWN_AGENT', 'message': f'Unknown agentId: {req.agentId}'})}\n\n"
        return StreamingResponse(bad_agent(), media_type="text/event-stream")

    event_q: queue.Queue = queue.Queue()
    SENTINEL = object()

    def on_event(event: dict):
        event_q.put(event)

    def worker():
        try:
            run_agentic_rag(req.input, on_event, max_steps=req.config.get("maxSteps", 15), max_tokens=req.config.get("maxTokens", 30_000))
        except Exception:
            pass  # error event already emitted by run_agentic_rag
        finally:
            event_q.put(SENTINEL)

    threading.Thread(target=worker, daemon=True).start()

    def stream():
        while True:
            item = event_q.get()
            if item is SENTINEL:
                break
            yield f"data: {json.dumps(item)}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


if __name__ == "__main__":
    import os
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8010)))
