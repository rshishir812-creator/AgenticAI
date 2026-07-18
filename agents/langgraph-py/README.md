# LangGraph Python Agents

> **Phase 2** — Planned for the next implementation session.

## What will be here

- Agentic RAG equivalent of `agents/langgraph-ts/src/agentic-rag.ts` — in Python
- Deep research pattern (multi-step web research → synthesis)
- GraphRAG-lite (entity extraction + graph traversal)
- Deployed as Vercel Python functions

## Tech stack

```
LangGraph 1.x (Python)
FastAPI (for the /api/run endpoint)
openai (pointed at Groq)
supabase-py (checkpoints + traces + memory)
```

## Quickstart (Phase 2)

```bash
cd agents/langgraph-py
pip install -r requirements.txt
uvicorn app:app --port 8010
```
