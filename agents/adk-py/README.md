# Google ADK 2.0 Python Agents

> **Phase 2** — Planned for the next implementation session.

## What will be here

- ADK 2.0 **Workflow Runtime** demo (graph-based execution engine)
- **Task API** demo (structured agent-to-agent delegation)
- A2A integration (ADK Python → Embabel Java)
- Human-in-the-Loop confirmation workflows
- Vercel Python functions deployment

## Tech stack

```
google-adk 2.x
FastAPI
openai (→ Groq)
supabase-py
```

## Key ADK 2.0 concepts covered

- `WorkflowRuntime` — graph-based execution replacing hierarchical executor
- `TaskAgent` — agents used as workflow nodes
- Fan-out/fan-in, loops, retry, dynamic nodes
- Event compaction (long-running context management)
- `adk web` local development UI
- `RemoteA2AAgent` — call Embabel Java agent via A2A v1.0

## Quickstart (Phase 2)

```bash
cd agents/adk-py
pip install google-adk fastapi uvicorn
adk web    # local ADK UI on http://localhost:8080
```
