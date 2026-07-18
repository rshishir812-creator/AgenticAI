"""
FastAPI wrapper — runs the ADK 2.0 workflow demo (workflow.py) through
google.adk.runners.Runner + InMemorySessionService, mapping ADK Events to
the same AG-UI SSE event shape used by agents/langgraph-py/app.py and
apps/studio/lib/agents/agentic-rag.ts, so the Studio's existing
agentId?.startsWith("adk-py:") proxy branch in
apps/studio/app/api/run/route.ts can call this service directly.

Run:
    python app.py     # port 8020 (or $PORT)
"""
import json
import os
import time
import uuid

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from pydantic import BaseModel

from workflow import build_workflow

app = FastAPI(title="adk-py")

APP_NAME = "adk-py-workflow-demo"
_session_service = InMemorySessionService()
_agent = build_workflow()
_runner = Runner(agent=_agent, app_name=APP_NAME, session_service=_session_service)


class RunRequest(BaseModel):
    agentId: str
    input: str
    config: dict = {}


def _ts() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


@app.get("/health")
async def health():
    return {"status": "ok", "server": "adk-py", "version": "0.1.0"}


@app.get("/.well-known/agent-card.json")
async def agent_card():
    return {
        "id": "adk-py-workflow-demo",
        "name": "ADK Python — Fan-out/Fan-in Workflow Demo",
        "description": "SequentialAgent wrapping a ParallelAgent (technical + tradeoffs analysis) then a synthesis step — Google ADK 2.0 Workflow Runtime demo",
        "version": "0.1.0",
        "capabilities": {"a2a": {"taskLifecycle": True}},
    }


@app.post("/api/run")
async def run(req: RunRequest):
    if not req.agentId.startswith("adk-py:"):
        async def bad_agent():
            yield f"data: {json.dumps({'type': 'error', 'code': 'UNKNOWN_AGENT', 'message': f'Unknown agentId: {req.agentId}'})}\n\n"
        return StreamingResponse(bad_agent(), media_type="text/event-stream")

    async def stream():
        run_id = str(uuid.uuid4())
        user_id = req.config.get("userId", "studio-user")
        session_id = req.config.get("threadId") or str(uuid.uuid4())

        yield f"data: {json.dumps({'type': 'run_started', 'runId': run_id, 'agentId': req.agentId, 'input': req.input, 'timestamp': _ts()})}\n\n"

        await _session_service.create_session(app_name=APP_NAME, user_id=user_id, session_id=session_id)

        try:
            async for event in _runner.run_async(
                user_id=user_id,
                session_id=session_id,
                new_message=types.Content(role="user", parts=[types.Part(text=req.input)]),
            ):
                node_name = event.author or "workflow"
                text = ""
                if event.content and event.content.parts:
                    text = "".join(p.text or "" for p in event.content.parts)

                yield f"data: {json.dumps({'type': 'step_started', 'runId': run_id, 'stepId': event.id, 'nodeName': node_name, 'timestamp': _ts()})}\n\n"
                yield f"data: {json.dumps({'type': 'step_finished', 'runId': run_id, 'stepId': event.id, 'nodeName': node_name, 'outputPreview': text[:100], 'timestamp': _ts()})}\n\n"

            yield f"data: {json.dumps({'type': 'run_finished', 'runId': run_id, 'status': 'success', 'durationMs': 0, 'timestamp': _ts()})}\n\n"
        except Exception as err:
            yield f"data: {json.dumps({'type': 'error', 'runId': run_id, 'code': 'AGENT_ERROR', 'message': str(err), 'timestamp': _ts()})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 8020)))
