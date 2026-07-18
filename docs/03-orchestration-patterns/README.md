# Orchestration Patterns Catalog

Every major agentic orchestration pattern, cross-referenced against runnable
code already in this repo. Where a pattern is implemented, the link goes
straight to the source — run it via the Studio canvas or `curl` its
`/api/run` endpoint directly. Where it isn't implemented yet, that's stated
plainly rather than glossed over.

This catalog follows (and extends) Anthropic's ["Building Effective
Agents"](https://www.anthropic.com/research/building-effective-agents)
taxonomy, plus a few 2026-era additions.

## Implemented — run these today

| Pattern | Where | Stack |
|---|---|---|
| **Routing** | [`model-router.ts`](../../apps/studio/lib/agents/model-router.ts) / [`model_router.py`](../../agents/langgraph-py/model_router.py) | TS + Py |
| **Reflection / self-correction** | [`agentic-rag.ts`](../../apps/studio/lib/agents/agentic-rag.ts) — `grade_answer` node | TS + Py |
| **Corrective retrieval loop** | Same graph — `grade_docs → retrieve` bounded retry | TS + Py |
| **Prompt chaining** | Same graph — `query_rewrite → retrieve → generate` is a linear chain before the loops kick in | TS + Py |
| **Parallelization (fan-out/fan-in)** | [`agents/adk-py/workflow.py`](../../agents/adk-py/workflow.py) — `ParallelAgent` | Py (ADK) |
| **Orchestrator–workers + synthesis** | Same file — `SequentialAgent(ParallelAgent(...), synthesizer)` | Py (ADK) |

### Routing

Classifies task complexity 0.0–1.0 with a fast small model, then dispatches
to a small or large model tier. Runs on every LLM call in the agentic-RAG
graphs (`query_rewrite` and `generate` nodes) — as of the fix in this
session, every routing decision is now emitted as its own
`routing_decision` AG-UI event (`tier`, `model`, `reason`,
`complexityScore`), visible live in the Studio's trace panel. Previously
this was computed but silently discarded after picking the model.

```bash
# See it live: run the agentic-RAG graph and watch the trace panel —
# routing_decision events show up before each generate/query_rewrite step.
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{"agentId":"langgraph-ts:agentic-rag","input":"What is agentic RAG?"}'
```

### Reflection / self-correction (evaluator-optimizer, narrowly)

`grade_answer` grades the `generate` node's output for groundedness against
retrieved context; if `hallucinated`, the graph loops back to `generate`
(bounded by `retryCount`, capped at 2). This is a minimal evaluator-
optimizer loop — one fixed grading rubric, not a general-purpose
optimizer — see "Not yet implemented" below for the fuller pattern.

### Corrective retrieval loop (Corrective RAG)

`grade_docs` grades retrieved documents for relevance; if `irrelevant`, the
graph loops back to `retrieve` (also bounded by `retryCount`). Together with
reflection above, this is what "Self-RAG + Corrective RAG" means in this
repo's docs — two independent bounded feedback loops in one graph.

### Prompt chaining

The straight-line path `query_rewrite → retrieve → grade_docs → generate →
grade_answer` before either loop engages is itself a prompt chain: each
step's output feeds the next, with LLM calls at the query-rewrite and
generate steps.

### Parallelization (fan-out/fan-in) + orchestrator-workers

`agents/adk-py/workflow.py`'s `ParallelAgent` runs two `GroqAgent`
sub-agents (`technical_analyst`, `tradeoffs_analyst`) **concurrently**
against the same question, then a `SequentialAgent` runs a third
`synthesizer` agent after both complete, combining their outputs. Verified
live: both parallel sub-agents start at the identical timestamp in the
trace stream (see `docs/RESUME.md` for the verification transcript).

```bash
curl -X POST http://localhost:3000/api/run \
  -H "Content-Type: application/json" \
  -d '{"agentId":"adk-py:workflow","input":"Should I use MCP or a custom REST API?"}'
```

## Loop / budget protection (cross-cutting, not a pattern of its own)

`loop-detector.ts` / `loop_detector.py` — step budget, token budget, and
SHA-256 state-cycle hashing — wraps every node in the agentic-RAG graphs
(TS and Py) as of this session's fix. Previously the detector was
constructed but never actually invoked (dead code); the graph's only real
protection against infinite loops was LangGraph's own generic 25-step
recursion limit, which fires with a far less informative error than our
own budget-specific one. Now every node emits a `budget_check` event
(`stepsUsed`/`maxSteps`) visible in the trace panel, and the detector's
`step()`/`checkState()` calls will raise a `LoopDetectedError` with a
specific reason (`step_budget` / `token_budget` / `state_cycle`) before
LangGraph's generic limit ever gets the chance to.

## Not yet implemented

Honest list — these are real gaps, not "coming soon" filler:

- **ReAct** (interleaved reasoning + tool calls in a single loop, as
  opposed to our fixed-topology graphs) — no dedicated demo.
- **Plan-and-execute** (upfront multi-step plan, then execute sequentially
  with replanning on failure) — no dedicated demo.
- **General evaluator-optimizer** (arbitrary generate → critique → refine
  loop with a configurable rubric, vs. our fixed groundedness/relevance
  checks) — no dedicated demo.
- **Supervisor / hierarchical multi-agent** (a top-level agent dynamically
  delegates to named sub-agents based on the request, rather than a fixed
  graph topology) — no dedicated demo. Closest existing analog:
  `adk-py`'s workflow, but its two branches are fixed at build time, not
  chosen dynamically by a supervisor at run time.
- **Swarm / agent handoffs** (agents transfer control to each other
  peer-to-peer, OpenAI Swarm-style) — no dedicated demo.
- **Map-reduce** (fan out over a *variable-length* list of items — e.g. one
  sub-agent per retrieved document — then reduce) — no dedicated demo;
  `adk-py`'s parallelization is fan-out over a *fixed* set of two named
  sub-agents, not a map over a dynamic list.
- **Human-in-the-loop** (pause for approval/input mid-graph) — no dedicated
  demo. LangGraph's `interrupt()` and ADK's HITL confirmation workflows are
  both real, available APIs in the versions installed here; neither is
  wired into a running graph yet.
- **Durable/checkpointed agents with time-travel** — `supabase/migrations/004_checkpoints.sql`
  defines the schema LangGraph's `SupabaseSaver` would use, but no agent in
  this repo actually uses a checkpointer yet — every run is stateless
  end-to-end.
- **Deep-research pattern** (multi-step web research → synthesis, using
  `mcp-servers/py-research`'s arXiv/HN/Wikipedia tools) — the MCP server
  exists and its tools are verified working; no agent calls them yet.
- **GraphRAG-lite** (entity extraction + graph traversal) — not started.
- **Computer-use / browser agents** — not started (concept-only, per the
  original plan).

## Studio canvas integration

All patterns above that ARE implemented are callable via `/api/run` with
the right `agentId` (see the `curl` examples). None of them are wired into
the Studio canvas's `GraphSelector` dropdown as a selectable preset yet —
today the dropdown only lists the agentic-RAG graph. Adding presets for
`adk-py:workflow` and any future patterns is a small, mechanical follow-up
(new entries in `apps/studio/components/studio/GraphSelector.tsx` +
matching `DEMO_NODES`/`DEMO_EDGES` in `StudioCanvas.tsx`), not attempted in
this session.
