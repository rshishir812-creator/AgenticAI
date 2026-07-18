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

## ✅ Phase 2 — complete (user explicitly requested completion, 2026-07-19)

All four Phase 2 deliverables from the original plan are done and
live-verified: `agents/langgraph-py`, `agents/adk-py`, `mcp-servers/py-research`,
and (in the final push) the orchestration-patterns catalog +
routing/loop-detection made visible in the trace panel. See "Still not
started" below for what's honestly out of scope even after this — a few
patterns (ReAct, plan-and-execute, supervisor, swarm, map-reduce, HITL,
durable checkpointing) were never implemented and are recorded as real
gaps, not glossed over.

### ✅ Orchestration-patterns catalog — `docs/03-orchestration-patterns/README.md`
Cross-references every pattern already runnable in this repo (routing,
reflection, corrective retrieval, prompt chaining, parallelization,
orchestrator-workers) against its actual source file, with `curl` examples
to run each live. Explicitly lists what's NOT implemented (ReAct,
plan-and-execute, general evaluator-optimizer, supervisor/hierarchical,
swarm, map-reduce, HITL, durable checkpointing, deep-research, GraphRAG-lite,
computer-use) rather than padding the catalog with unbuilt "coming soon"
entries. This is documentation-centric by design — the original plan's own
wording was "one doc per pattern, links to runnable code in ≥1 stack," not
"implement every pattern as new code," and building out a dozen more full
agent implementations was not a reasonable scope for one session.

### ✅ Routing/loop-detection made visible (was dead code)
Found while writing the catalog and cross-checking claims against actual
code: `LoopDetector` was being constructed in both `agentic-rag.ts` and
`agentic_rag.py` but its `step()`/`checkState()` methods were **never
called** — completely dead code. The graph's only real protection against
infinite loops was LangGraph's own generic 25-step recursion limit. Also,
`routeRequest()`'s/`route_request()`'s routing decision (tier, model,
reason, complexity score) was computed and used to pick a model but never
emitted as an event — invisible to the trace panel.

Fixed on both stacks (TS: `apps/studio/lib/agents/agentic-rag.ts` +
`loop-detector.ts`; Python: `agents/langgraph-py/agentic_rag.py`):
- Every node is now wrapped so `detector.step()` and `detector.checkState()`
  actually run after each node, emitting a `budget_check` event
  (`stepsUsed`/`maxSteps`) — real, working budget enforcement with a
  specific error reason (`step_budget`/`token_budget`/`state_cycle`)
  instead of relying solely on LangGraph's generic limit.
- Every `routeRequest()`/`route_request()` call now emits a
  `routing_decision` event (`tier`, `model`, `reason`, `complexityScore`).

Verified live 3 ways: curl against the TS agent, curl against the Python
agent, and in the actual Studio canvas browser UI — navigated to `/studio`,
ran the agentic-RAG graph, confirmed the trace panel auto-switched and
showed 20 events including multiple `routing_decision` and `budget_check`
entries, rendered correctly by the existing generic event renderer (no UI
code changes needed — `TracePanel.tsx` already renders any event generically
by type/nodeName/outputPreview). `npx tsc --noEmit` and `npx next build`
both pass clean after the TS changes.

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

### ✅ `mcp-servers/ts-open-data` — finally live-tested (queued since Phase 1)
Two real bugs found on its first-ever live test:
1. **Stateless-transport reuse bug.** `StreamableHTTPServerTransport`
   defaults to stateless mode (no `sessionIdGenerator` passed), and per the
   SDK's own docs a stateless transport "cannot be reused across requests —
   create a new transport per request." The server was creating ONE
   transport at module load and reusing it for every HTTP request: the
   first tool call succeeds, every call after that 500s. The SDK's
   `@hono/node-server` adapter catches the thrown error internally before
   it surfaces as a promise rejection, so it never showed up in logs — took
   directly reading the SDK's dist source to find. Fixed: `server.ts` now
   builds a fresh `McpServer` + transport pair per request.
2. **REST Countries v3.1 API is dead.** The whole free tier was retired —
   `restcountries.com/v3.1` redirects to a deprecation notice,
   `api.restcountries.com` requires a paid key. Switched to the
   `mledoze/countries` static dataset (same data REST Countries was
   originally built from) via jsdelivr CDN — no key, same shape for most
   fields. Dropped `population`/`timezones` (not in this dataset) rather
   than fake them.

Verified: 4 consecutive tool calls (weather, country_info, exchange_rates,
tools/list) all return 200 with correct data on the same warm process — the
exact rapid-succession pattern that reproduced bug #1.

### Still not started (real gaps, recorded honestly — see docs/03-orchestration-patterns/README.md)
- ReAct, plan-and-execute, general evaluator-optimizer, supervisor/
  hierarchical multi-agent, swarm/handoffs, map-reduce over dynamic lists,
  human-in-the-loop, durable/checkpointed agents, deep-research pattern
  (MCP tools exist, no agent calls them yet), GraphRAG-lite, computer-use —
  none of these have a dedicated runnable demo. Full list with reasoning
  in the catalog doc.
- ADK Task API demo, A2A integration (ADK-Py → Embabel Java via
  `RemoteA2AAgent`), human-in-the-loop confirmation workflows — all
  mentioned in the original plan for `agents/adk-py`, none built yet.
- Redaction middleware (PII scrubbing on tool inputs/outputs before
  logging) — mentioned in the original plan's production track, not
  started at all (unlike routing/loop-detection, there's no
  `redaction.ts`/`.py` file yet to even wire up).
- None of the implemented patterns are wired into the Studio canvas's
  `GraphSelector` dropdown as a selectable preset — only callable via
  `agentId` directly. Small, mechanical follow-up, not attempted.
- Phase 3 (Java/Embabel), Phase 4 (AG-UI/A2UI/AP2/x402/WebMCP deep-dives),
  Phase 5 (evals, memory, guardrails, cost dashboard) — untouched, per the
  original phase roadmap.

### Immediate next step
Phase 2 is done. Next natural step per the original roadmap is Phase 3
(Java + Embabel GOAP + ADK-Java + interop), or picking off individual
Phase 2 gaps above (redaction middleware is probably the highest-value
single item, since routing/loop-detection are now real and redaction is
the missing third leg of the "production patterns" trio) — needs a decision
from the user rather than another unilateral pick, given how much scope
either direction represents.

## Earlier: Phase 0 + Phase 1 (fully complete, see below for historical detail)

## Reference: full original plan
See `C:\Users\Shishir\.claude\plans\create-a-plan-to-valiant-parnas.md` for the
complete repo plan (Phase 0–5 roadmap, design decisions, repo structure).
