# Resume Plan — Agentic AI Lab

_Last updated: 2026-07-19. Read this first before continuing._

## ✅ Phase 1 is fully live-verified end-to-end

Everything below was broken or unverified in earlier passes and is now fixed
and confirmed working — via both curl and the actual Studio canvas UI in the
browser.

### Environment (already configured, do not re-ask for keys)
- `.env` (repo root) and `apps/studio/.env.local` both contain the user's real
  `GROQ_API_KEY` and Supabase credentials. Both are gitignored — never commit them.
- `.env.example` is sanitized with placeholders.
- Supabase project: `sjqebfcvrufafpfnvuhs`. All migrations 001–006 have been run
  (schema is on `vector(768)` throughout — HuggingFace embedding dims, not
  OpenAI's 1536).
- Embeddings: **HuggingFace `Xenova/all-mpnet-base-v2`** (768 dims, no API key)
  via `@huggingface/transformers`, singleton pipeline in `apps/studio/lib/embeddings.ts`.
  Model downloads once (~4-5 min) to
  `node_modules/.pnpm/@huggingface+transformers@4.2.0/.../transformers/.cache/`,
  then loads instantly on subsequent server starts within the same machine.
  Preload script: `apps/studio/scripts/preload-model.mjs`.
- Git history was rewritten once (leaked key in the first commit, squashed
  before ever reaching the remote) — repo is clean at
  https://github.com/rshishir812-creator/AgenticAI. Key was NOT rotated per
  explicit user instruction — treat as intentional, don't flag again.

### Live test results — all passing
1. ✅ `POST /api/chat` — Groq streaming, correct answers.
2. ✅ `POST /api/rag/ingest` — MPNet embed → Supabase `documents` (768-dim).
3. ✅ `POST /api/rag/query` — retrieval (`match_threshold: 0.2`) + Groq
   generation, grounded answers with citations.
4. ✅ `POST /api/run` with `agentId: "langgraph-ts:agentic-rag"` — full
   LangGraph StateGraph run confirmed via curl AND the Studio canvas UI
   (`/studio` → Run panel → trace panel shows all 13 AG-UI events:
   `run_started → query_rewrite → retrieve → grade_docs(relevant) → generate
   → grade_answer(grounded) → run_finished`).

### Bugs fixed this session (commit `510ec27`, see that message for full detail)
1. Duplicate `run_started` SSE event (route + runner both emitted one).
2. Groq base-URL doubling in `ChatGroq` (`groq-sdk` internally reads
   `GROQ_BASE_URL` and appends its own `/openai/v1/...` path on top — fixed by
   passing `baseUrl: "https://api.groq.com"` explicitly to `ChatGroq`).
3. Infinite graph recursion — `grade_docs → retrieve` corrective loop never
   incremented `retryCount` on irrelevant grades, only `grade_answer`'s loop
   did. Now both loops are bounded.
4. Over-truncation in grading prompts (`.slice(0,300)` / `.slice(0,200)`) was
   cutting off the actually-relevant sentence in multi-topic chunks before the
   grading LLM ever saw it. Removed — chunks are already capped at ~800 chars
   by ingestion, no extra truncation needed.
5. `gpt-oss-20b` JSON-mode grading prompts used literal `true|false` pipe
   syntax (`Return JSON: {"relevant": true|false}`) which the model sometimes
   echoed verbatim, producing invalid JSON and a 400 `json_validate_failed`.
   Reworded prompts to give one concrete JSON example + prose description.
   Also raised `model-router.ts`'s classifier `max_tokens` 60 → 300 (gpt-oss
   reasoning models were getting truncated mid-reasoning before emitting JSON).

### Known quirk (not a blocker)
- Cold dev-server starts can return a transient 404 on the first `/api/run`
  call while Turbopack compiles the route on demand — a throwaway warmup
  request before the real test avoids false negatives. Not worth fixing
  (standard Next.js dev-mode behavior, doesn't happen in production builds).

## Phase 2 — in progress

User asked to move to Phase 2. Scope was intentionally narrowed to the
highest-value slice given effort constraints — full scope (ADK-Py, full
orchestration-patterns catalog, routing/loop-detection/redaction as visible
trace middleware) is NOT done yet, see "Still not started" below.

### ✅ `mcp-servers/py-research` — built and live-tested
Python Streamable HTTP MCP server using the official `mcp` SDK's `FastMCP`
(`stateless_http=True`). Three tools:
- `wikipedia_search` — ✅ verified live (real API call, real response)
- `hackernews_search` — ✅ verified live (Algolia HN Search API, real response)
- `arxiv_search` — code verified correct (https fixed from a 301-redirecting
  http URL; XML-parsing logic validated against a canned sample response) but
  NOT re-verified against the live API — arXiv's own rate limiter
  (~1 req/3s) was still returning `Rate exceeded.` when the session paused,
  triggered by my own rapid test retries. This will clear on its own; just
  do ONE clean test next session, don't hammer it.

Files: `mcp-servers/py-research/{server.py,tools.py,requirements.txt,Dockerfile,README.md}`.
Run: `cd mcp-servers/py-research && pip install -r requirements.txt && python server.py`
(port 3002). `docker-compose.yml`'s `py-mcp` service now has a working
Dockerfile (was referenced but missing before).

Two non-obvious bugs hit and fixed while building this — documented in
`mcp-servers/py-research/README.md`'s "Teaching points" section:
1. `FastMCP.streamable_http_app()`'s session-manager lifespan doesn't
   propagate when you `Mount()` it inside a different outer Starlette app
   (needed to add `/health` + agent-card routes alongside `/mcp`) — must wire
   `lifespan=lambda _app: mcp.session_manager.run()` explicitly on the outer
   app or every request 500s with `RuntimeError: Task group is not initialized`.
2. Wikipedia's API 403s without a descriptive `User-Agent` header.

### Still not started
- `agents/langgraph-py` — Python LangGraph agentic-RAG equivalent of the TS
  one, FastAPI `/api/run` endpoint, deployed as Vercel Python function. Stub
  README only, no code yet.
- `agents/adk-py` — Google ADK 2.0 Python Workflow Runtime demo. Stub README
  only, no code yet.
- Full orchestration-patterns catalog (routing, parallelization,
  supervisor+workers, ReAct, evaluator-optimizer, swarms, etc. as runnable
  graphs the Studio canvas can load).
- Model routing / loop detection / redaction as VISIBLE middleware in the
  traces panel (the underlying `lib/agents/model-router.ts` and
  `loop-detector.ts` exist and work, but aren't surfaced as a dedicated lab/demo).

### Immediate next step
Finish `agents/langgraph-py` next — it's the natural continuation (mirrors
`apps/studio/lib/agents/agentic-rag.ts`, same Supabase tables, same
`match_documents` RPC, same Groq models) and is what makes the `/api/run`
route's existing Python-proxy branch (`agentId?.startsWith("langgraph-py:")`
in `apps/studio/app/api/run/route.ts`) actually work end-to-end for the first
time. After that: `mcp-servers/ts-open-data` still hasn't been live-tested
either (was queued before the Phase-2 pivot, still genuinely unverified).

## Earlier: Phase 0 + Phase 1 (fully complete, see below for historical detail)

## Reference: full original plan
See `C:\Users\Shishir\.claude\plans\create-a-plan-to-valiant-parnas.md` for the
complete repo plan (Phase 0–5 roadmap, design decisions, repo structure).
