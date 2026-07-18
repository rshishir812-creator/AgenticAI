# Google ADK 2.0 Python — Fan-out/Fan-in Workflow Demo

A real, runnable [Google ADK](https://google.github.io/adk-docs/) 2.5.0 workflow: a `SequentialAgent` wrapping a `ParallelAgent` (two sub-agents analyzing the question concurrently from different angles) followed by a synthesis step — the ADK-native equivalent of the "supervisor delegates to workers, then synthesizes" pattern already demoed in the TS/Py agentic-RAG graphs.

```
                    ┌─→ technical_analyst  ─┐
user question ──────┤                       ├──→ synthesizer ──→ final answer
                    └─→ tradeoffs_analyst  ─┘
     (ParallelAgent — both run concurrently)      (SequentialAgent, after)
```

## Why Groq instead of Gemini (ADK's default)

ADK's native `LlmAgent` defaults to Gemini. Reaching a non-Gemini provider
like Groq requires the `google.adk.models.lite_llm.LiteLlm` wrapper, which
needs the `google-adk[extensions]` install extra. That extra pulls in
`litellm`, which as of this writing ships **no prebuilt wheel** and requires
a Rust/Cargo toolchain to build from source — a heavy, environment-modifying
install this repo deliberately avoids forcing on learners.

Instead, `groq_agent.py` defines `GroqAgent`, a custom `BaseAgent` subclass
that calls Groq directly via the raw `openai` SDK (same pattern already
proven in `agents/langgraph-py/model_router.py`). This still exercises ADK's
*real* orchestration primitives (`BaseAgent`, `SequentialAgent`,
`ParallelAgent`) — the actual teaching point — without the LiteLLM/Rust
dependency chain.

## Files

| File | Purpose |
|---|---|
| `groq_agent.py` | `GroqAgent(BaseAgent)` — calls Groq, reads/writes pipeline data via `ctx.session.state` |
| `workflow.py` | `build_workflow()` — the `SequentialAgent(ParallelAgent(...), synthesizer)` composition |
| `app.py` | FastAPI + SSE `/api/run`, using `Runner` + `InMemorySessionService` to execute the agent tree, mapping ADK `Event`s to the same AG-UI event shape the Studio canvas already consumes |

## Run

```bash
cd agents/adk-py
pip install -r requirements.txt
python app.py          # port 8020 (or $PORT)
```

Needs `GROQ_API_KEY`, `GROQ_BASE_URL`, `GROQ_MODEL_LARGE` in the environment.

## Wiring into the Studio

`apps/studio/app/api/run/route.ts` proxies `agentId` starting with
`adk-py:` to `process.env.ADK_PY_AGENT_URL` (defaults to
`http://localhost:8020`) — a separate env var from `PYTHON_AGENT_URL`
(`agents/langgraph-py`, port 8010), since these are two independent Python
services. Call the Studio's `/api/run` with
`{"agentId": "adk-py:workflow", "input": "..."}`.

## Verified live

Tested three ways: direct `Runner.run_async()` call, direct HTTP to the
FastAPI SSE endpoint, and through the Studio's `/api/run` proxy — all three
show the `ParallelAgent`'s two sub-agents starting at the same timestamp
(genuine concurrency) followed by the synthesizer.

## Not yet built (future session)

- Task API demo (structured agent-to-agent delegation)
- A2A integration (ADK Python → Embabel Java via `RemoteA2AAgent`)
- Human-in-the-loop confirmation workflows
- Retrieval-grounded workflow (this demo is pure reasoning, not RAG — unlike
  `agents/langgraph-py`, it doesn't query Supabase)
- Vercel Python function deployment config
