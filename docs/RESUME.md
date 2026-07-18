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

## Immediate next steps

1. Test `mcp-servers/ts-open-data` — start it
   (`pnpm --filter ts-open-data dev`, port 3001), confirm `/health` and
   `/.well-known/agent-card.json` respond, and at least one tool call
   round-trips (e.g. weather for a city). This has NOT been tested yet this
   session or prior ones — genuinely unverified.
2. Optional cleanup: delete the orphan `documents` row with `source = 'test'`
   and no embedding (`DELETE FROM documents WHERE source = 'test';` in
   Supabase SQL editor) — harmless leftover from schema-mismatch debugging.
3. Once MCP server is verified, decide with the user whether to start
   **Phase 2**: Python agents (LangGraph-Py + Google ADK 2.0 on Vercel
   functions), the full orchestration-patterns catalog, `mcp-servers/py-research`.
4. Push this session's commits (`510ec27` and any after) to
   `origin/main` — check `git status`/`git log origin/main..HEAD` first,
   these have likely NOT been pushed yet as of session pause.

## Reference: full original plan
See `C:\Users\Shishir\.claude\plans\create-a-plan-to-valiant-parnas.md` for the
complete repo plan (Phase 0–5 roadmap, design decisions, repo structure).
