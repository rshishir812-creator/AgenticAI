# LangGraph Python — Agentic RAG

Python mirror of [`apps/studio/lib/agents/agentic-rag.ts`](../../apps/studio/lib/agents/agentic-rag.ts) — the exact same Self-RAG + Corrective RAG `StateGraph`, sharing the same Supabase `documents` table and `match_documents` RPC as the TypeScript agent. Because both stacks embed with `all-mpnet-base-v2` (768 dims), a query run through either agent retrieves the same chunks — a concrete demo of cross-stack interop over a shared data layer.

## Graph

```
query_rewrite -> retrieve -> grade_docs -> generate -> grade_answer -> END
                                  ^retry (bounded)         ^retry (bounded)
```

## Files

| File | Mirrors |
|---|---|
| `agentic_rag.py` | `apps/studio/lib/agents/agentic-rag.ts` |
| `model_router.py` | `apps/studio/lib/agents/model-router.ts` |
| `loop_detector.py` | `apps/studio/lib/agents/loop-detector.ts` |
| `embeddings.py` | `apps/studio/lib/embeddings.ts` (sentence-transformers instead of transformers.js — same model weights, same 768-dim output space) |
| `app.py` | `apps/studio/app/api/run/route.ts` (FastAPI + SSE instead of Next.js route) |

## Run

```bash
cd agents/langgraph-py
pip install -r requirements.txt
python app.py          # port 8010 (or $PORT)
```

Needs `GROQ_API_KEY`, `GROQ_BASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
in the environment (same values as the root `.env`).

## Wiring into the Studio

`apps/studio/app/api/run/route.ts` already proxies any `agentId` starting
with `langgraph-py:` to `process.env.PYTHON_AGENT_URL` (defaults to
`http://localhost:8010`). Set `PYTHON_AGENT_URL` in `.env.local` if running
this on a different port, then call the Studio's `/api/run` with
`{"agentId": "langgraph-py:agentic-rag", "input": "..."}` — same contract,
same AG-UI event shape as the TypeScript agent.

## Bugs inherited (already fixed) from the TypeScript version

Every LLM-loop bug found while debugging the TS graph was carried forward
into this implementation from the start rather than re-discovered:
retry-count bounded on both correction loops, no over-truncation of
document context before grading, JSON-mode prompts avoid the
`true|false`-placeholder pitfall gpt-oss models sometimes echo literally.
See `docs/RESUME.md` (commit `510ec27`) for the full writeup of each bug.

## Not yet built (future session)

- Deep research pattern (multi-step web research -> synthesis)
- GraphRAG-lite (entity extraction + graph traversal)
- Vercel Python function deployment config
