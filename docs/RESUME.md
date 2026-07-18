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

## Phase 2 — core deliverables done, catalog/middleware work remains

Both Python agent stacks called for in the original plan now exist and are
live-verified: `agents/langgraph-py` (Self-RAG + Corrective RAG, mirrors the
TS agent) and `agents/adk-py` (fan-out/fan-in workflow, real ADK 2.5.0
primitives). Plus `mcp-servers/py-research`. What's NOT done — the full
orchestration-patterns catalog and visible routing/loop-detection
middleware — is large enough in scope to warrant its own planning pass, see
"Still not started" below.

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

### ✅ `agents/langgraph-py` — built and fully live-tested end-to-end
Python mirror of `apps/studio/lib/agents/agentic-rag.ts` — identical
Self-RAG + Corrective RAG `StateGraph`, same Supabase `documents` table and
`match_documents` RPC, same Groq models. Embeds with
`sentence-transformers/all-mpnet-base-v2` (same weights as the TS side's
ONNX/`Xenova` build, same 768-dim space) via `embeddings.py`, so a query run
through either stack's agent retrieves the exact same chunks.

Files: `agents/langgraph-py/{agentic_rag.py,model_router.py,loop_detector.py,embeddings.py,app.py,requirements.txt,Dockerfile,README.md}`.
Run: `cd agents/langgraph-py && pip install -r requirements.txt && python app.py`
(port 8010). `docker-compose.yml` has a `langgraph-py` service (python
profile). `apps/studio/app/api/run/route.ts`'s Python-proxy default port was
wrong (8000, should be 8010) — fixed.

Verified 3 ways:
1. Direct in-process call to `run_agentic_rag()` — 12 events, grounded answer.
2. Direct HTTP to the FastAPI `/api/run` SSE endpoint on :8010 — same 12
   events, correct AG-UI JSON shape.
3. Through the Studio's own `/api/run` proxy (`localhost:3000/api/run` with
   `agentId: "langgraph-py:agentic-rag"`) — 3 separate test questions, all
   completed cleanly, including one that correctly exercised the bounded
   corrective retry loop (0 docs retrieved twice, `retryCount` hit 2, graph
   ended cleanly instead of recursing).

One new bug found and fixed, specific to this Python port (did not reproduce
in the TS version during its own testing): gpt-oss models occasionally emit
malformed JSON in `response_format=json_object` mode even with a
well-formed, `true|false`-placeholder-free prompt — this is probabilistic
(passed on isolated per-node testing, then failed on a subsequent full-graph
run with the identical prompt), not deterministic. A bare `json.loads()` on
that response would crash the whole graph run. Fixed with `_graded_bool()` in
`agentic_rag.py`: retries once, then fails open (defaults to `True`) instead
of aborting. This is a good general lesson for the docs/production-patterns
content — JSON mode is not 100% reliable even with a correct prompt, so
grading/classification nodes should never let a JSON parse failure crash
the graph.

Both the Studio-side (TS) `run_started` and the proxied Python agent's own
`run_started` stream through the Studio's `/api/run` proxy — same duplicate-
event pattern noted and fixed for the in-process TS path, but here it's
crossing a real service boundary (Next.js route + external Python service),
so arguably each layer legitimately has its own "run started." Not fixed;
flagging as a design question for later, not a bug.

### ✅ `agents/adk-py` — built and fully live-tested end-to-end
Real Google ADK 2.5.0 workflow: `SequentialAgent` wrapping a `ParallelAgent`
(two sub-agents — `technical_analyst`, `tradeoffs_analyst` — analyze the
question **concurrently**) followed by a `synthesizer` step that combines
both. This is the ADK-native version of the "supervisor delegates to
workers, then synthesizes" pattern.

**Key decision:** ADK's native `LlmAgent` defaults to Gemini; reaching Groq
requires the `LiteLlm` wrapper, which needs the `google-adk[extensions]`
extra, which pulls in `litellm`, which **ships no prebuilt wheel and
requires a Rust/Cargo toolchain to build from source** on this environment.
Installing a Rust toolchain just for one Python package is a heavy,
environment-modifying action — deliberately avoided. Instead:
`agents/adk-py/groq_agent.py` defines `GroqAgent(BaseAgent)`, a custom ADK
agent that calls Groq directly via the raw `openai` SDK (same pattern as
`agents/langgraph-py/model_router.py`). This still exercises ADK's *real*
`BaseAgent`/`SequentialAgent`/`ParallelAgent` orchestration primitives — the
actual teaching point — without the LiteLLM/Rust dependency chain. This
tradeoff is documented in `agents/adk-py/README.md` and should NOT be
re-investigated as "unfinished work" — it's a deliberate, reasoned choice.

Files: `agents/adk-py/{groq_agent.py,workflow.py,app.py,requirements.txt,Dockerfile,README.md}`.
Run: `cd agents/adk-py && pip install -r requirements.txt && python app.py`
(port 8020). `docker-compose.yml` has an `adk-py` service (python profile).

Studio wiring: `apps/studio/app/api/run/route.ts`'s Python-proxy branch used
to route BOTH `langgraph-py:` and `adk-py:` agentIds to the same
`PYTHON_AGENT_URL` — wrong, since they're two independent services on
different ports. Split into `PYTHON_AGENT_URL` (8010, langgraph-py) and
`ADK_PY_AGENT_URL` (8020, adk-py), documented in `.env.example`. Confirmed
`npx next build` still compiles clean after the change.

Verified 3 ways, same as langgraph-py: direct `Runner.run_async()` call,
direct HTTP to the FastAPI SSE endpoint, and through the Studio's `/api/run`
proxy — all three show `technical_analyst` and `tradeoffs_analyst` starting
at the identical timestamp (genuine concurrency, not sequential-pretending-
to-be-parallel) followed by `synthesizer`.

Scope note: this workflow demo is pure reasoning, NOT retrieval-grounded —
unlike `agents/langgraph-py`, it doesn't query Supabase. That's intentional
(the fan-out/fan-in *pattern* was the point, not another RAG variant), but
worth knowing if a future session wants to add an ADK RAG demo too.

### Still not started
- Full orchestration-patterns catalog (routing, parallelization,
  supervisor+workers, ReAct, evaluator-optimizer, swarms, etc. as runnable
  graphs the Studio canvas can load). The Studio canvas already HAS a
  fan-out/fan-in example now (`agents/adk-py`'s workflow) but it's not wired
  into the canvas as a selectable graph preset — only callable via
  `agentId: "adk-py:workflow"` directly.
- Model routing / loop detection / redaction as VISIBLE middleware in the
  traces panel (the underlying `lib/agents/model-router.ts` /
  `model_router.py` and `loop-detector.ts` / `loop_detector.py` exist and
  work on both stacks now, but aren't surfaced as a dedicated lab/demo).
- `mcp-servers/ts-open-data` still hasn't been live-tested (queued since
  Phase 1, kept getting deprioritized across two full sessions now —
  genuinely the oldest unverified item in the repo, do this next).
- ADK Task API demo, A2A integration (ADK-Py → Embabel Java via
  `RemoteA2AAgent`), human-in-the-loop confirmation workflows — all
  mentioned in the original plan for `agents/adk-py`, none built yet.

### Immediate next step
Test `mcp-servers/ts-open-data` (weather/countries/forex TS MCP server,
port 3001) — do not defer this again, it's been queued since Phase 1.
After that, Phase 2's core deliverables (LangGraph-Py, ADK-Py, py-research
MCP server) are all done — the remaining Phase 2 items (patterns catalog,
visible routing/loop-detection middleware) are large enough to warrant an
explicit scoping conversation with the user rather than another
unilateral pick.

## Earlier: Phase 0 + Phase 1 (fully complete, see below for historical detail)

## Reference: full original plan
See `C:\Users\Shishir\.claude\plans\create-a-plan-to-valiant-parnas.md` for the
complete repo plan (Phase 0–5 roadmap, design decisions, repo structure).
