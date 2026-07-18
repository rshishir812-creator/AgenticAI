# Resume Plan — Agentic AI Lab

_Last session paused: 2026-07-19 (mid Phase-1 live end-to-end testing). Read this first before continuing._

## 🚨 BLOCKING — do this FIRST, before anything else

**Local commits are NOT pushed to GitHub.** `git push origin main` was rejected
by GitHub secret-scanning push protection:

```
remote: - GITHUB PUSH PROTECTION
remote:   Groq API Key — commit 400e6591c6fdd1bf2a474b99eb4b593b4107ca7c, path .env.example:2
```

Root cause: the very first commit (`400e659`, "feat: Phase 0+1...") accidentally
included the user's real Groq API key in `.env.example` (user had pasted their
real key into that file before asking Claude to build the repo). A later commit
(`e8aceae`) sanitized the file back to placeholders, but **the secret is still
present in git history** at the earlier commit, which is what GitHub's scanner
flags — sanitizing the current file isn't enough.

4 local commits are queued and unpushed: `400e659`, `e8aceae`, `346384e`, `5133932`.

### Recommended fix (needs user sign-off — do not do silently)
1. **Rotate the Groq API key first** — treat it as compromised since it was
   committed to git (even though not yet pushed publicly, it's in local repo
   history and was pasted into a chat transcript). Get a new key from
   https://console.groq.com/keys, update `.env` and `apps/studio/.env.local`
   with the new key.
2. **Then rewrite git history to scrub the old key** before pushing. Options,
   ask the user which they prefer:
   - (a) Simplest: since nothing is pushed yet, `git reset --soft` back before
     `400e659`, then re-commit everything as a single clean commit (loses the
     4-commit granularity but is simplest and safest).
   - (b) `git filter-repo` or `git filter-branch` to scrub the secret from
     `400e659` specifically while preserving commit history — more complex,
     more risk of mistakes.
   - (c) Use the GitHub-provided "allow this secret" unblock URL from the push
     error (only if the user is fine with the old exposed key existing in
     public history forever — NOT recommended since it defeats the purpose of
     rotating).
   Given this is a fresh local-only repo with no other collaborators and
   nothing pushed yet, **option (a) is almost certainly the right call** —
   confirm with the user, then execute.
3. Re-verify `.env.example` has zero real secrets (grep for `gsk_`, `eyJ`, real
   URLs) before the new push.
4. `git push origin main`.

Everything below this point assumes the push is unblocked and describes the
Phase 1 feature-level work in progress.

## Where things stand

Phase 0 + Phase 1 are implemented and committed. We are now **live-testing the
end-to-end pipeline** (chat → RAG ingest/query → agentic-RAG LangGraph run)
against the user's real Groq + Supabase credentials before moving to Phase 2.

### Environment (already configured, do not re-ask for keys)
- `.env` (repo root) and `apps/studio/.env.local` both contain the user's real
  `GROQ_API_KEY` and Supabase credentials. Both are gitignored — never commit them.
- `.env.example` is sanitized with placeholders — keep it that way.
- Supabase project: `sjqebfcvrufafpfnvuhs` — migrations 001–005 were run by the
  user via the Supabase SQL editor (combined file: `supabase/run-all-migrations.sql`),
  **then migration 006 (`supabase/migrations/006_resize_embeddings_768.sql`) was
  also run** to resize `vector(1536)` → `vector(768)` after switching to
  HuggingFace embeddings. Confirmed done by user.
- Embeddings: switched from OpenAI to **HuggingFace `Xenova/all-mpnet-base-v2`**
  (768 dims, no API key) via `@huggingface/transformers`. Model is downloaded
  and cached at `node_modules/.pnpm/@huggingface+transformers@4.2.0/node_modules/@huggingface/transformers/.cache/`
  (took ~267s first time; instant on subsequent loads within the same process).
  Preload script: `apps/studio/scripts/preload-model.mjs`.

## Test results so far (this session)

1. ✅ `POST /api/chat` — Groq streaming works, returns correct answers.
2. ✅ `POST /api/rag/ingest` — embeds with MPNet (768 dims), stores in Supabase
   `documents` table. Confirmed 200 response, `chunksEmbedded: 1`.
3. ✅ `POST /api/rag/query` — retrieval + Groq generation works end-to-end.
   Had to lower `match_threshold` from 0.5 → **0.2** in
   `apps/studio/app/api/rag/query/route.ts` because MPNet cosine similarities
   run lower than OpenAI's embedding space for semantically-related-but-not-identical
   text. **This fix is applied but NOT YET COMMITTED.**
4. ❌ `POST /api/run` with `agentId: "langgraph-ts:agentic-rag"` — **BROKEN, was
   mid-debug when paused.** Two bugs found:
   - **Bug A (duplicate event):** `run_started` is emitted twice — once by
     `apps/studio/app/api/run/route.ts:36` (the route itself) and again inside
     `runAgenticRag()` in `apps/studio/lib/agents/agentic-rag.ts:181`. Fix: remove
     one of the two emissions (the route already emits `run_started`, so
     `runAgenticRag` doesn't need to — delete lines 181 in agentic-rag.ts, or
     have the route not emit it and let the runner own it consistently).
   - **Bug B (Groq URL doubled — the actual failure):** Error was
     `POST /openai/v1/openai/v1/chat/completions 404`. Root cause: `lib/agents/agentic-rag.ts`
     uses `ChatGroq` from `@langchain/groq` (see `llm()` helper, ~line 43-45),
     constructed with `new ChatGroq({ model, temperature: 0, apiKey: process.env.GROQ_API_KEY })`
     — it does NOT pass `baseURL`, so it should default correctly... but
     `GROQ_BASE_URL=https://api.groq.com/openai/v1` is set in the env and
     something in the `@langchain/groq` / underlying `groq-sdk` client is
     picking up that env var AND appending its own `/openai/v1` suffix,
     producing the double path. Two installed versions were found in
     node_modules: `@langchain+groq@0.1.3` and `@langchain+groq@1.3.1` (two
     resolutions) — was about to inspect which one is actually used and how it
     reads `GROQ_BASE_URL` / `baseURL` / `OPENAI_BASE_URL` env vars when this
     got interrupted.

   **Next step:** Read the `ChatGroq` source (likely at
   `node_modules/.pnpm/@langchain+groq@1.3.1*/node_modules/@langchain/groq/dist/chat_models.*`)
   to see exactly which env var it reads and whether it silently appends
   `/openai/v1`. Two likely fixes:
   - (a) Unset/don't read `GROQ_BASE_URL` for the LangChain client — pass
     `baseURL: undefined` explicitly, or rename the env var so `groq-sdk`'s
     auto-detection doesn't double it, or
   - (b) Pass `baseURL: "https://api.groq.com"` (without `/openai/v1`) to
     `ChatGroq` if the SDK appends the suffix itself — test empirically.
   - Compare against `model-router.ts` which uses the raw `OpenAI` SDK
     (not `ChatGroq`) with the same `GROQ_BASE_URL` and works correctly — that's
     the reference for correct behavior. `@langchain/groq`'s wrapper must be
     doing something different internally.

## Immediate next steps (in order)

1. Fix Bug B (Groq URL doubling) in `apps/studio/lib/agents/agentic-rag.ts`
   `llm()` helper — likely also affects `apps/studio/lib/agents/model-router.ts`
   if it's ever switched to ChatGroq, but currently model-router uses raw
   OpenAI SDK so it's fine.
2. Fix Bug A (duplicate `run_started` event) — pick one emission site.
3. Re-test `POST /api/run` with `agentId: "langgraph-ts:agentic-rag"` end-to-end,
   confirm the SSE stream shows: `run_started → query_rewrite → retrieve →
   grade_docs → generate → grade_answer → run_finished` with a real grounded
   answer, no errors.
4. Also smoke-test the Studio canvas UI itself in the browser (not just curl/API):
   navigate to `/studio`, select the agentic-RAG graph preset, run it, confirm
   the trace panel shows live events and nodes animate.
5. Test `mcp-servers/ts-open-data` — start it (`pnpm --filter ts-open-data dev`,
   port 3001), confirm `/health` and `/.well-known/agent-card.json` respond,
   and that at least one tool call round-trips (e.g. weather for a city).
6. Once all of Phase 1 is verified live, commit with a clear message, push to
   GitHub (`git push origin main` — remote is
   `https://github.com/rshishir812-creator/AgenticAI.git`), then decide with
   the user whether to start Phase 2 (Python agents: LangGraph-Py + ADK-Py).

## Known non-blocking cleanup items
- There's a leftover orphan row in the Supabase `documents` table with
  `source = "test"` and no embedding (inserted while debugging the schema
  mismatch). Harmless but could be deleted via:
  `DELETE FROM documents WHERE source = 'test';` in the Supabase SQL editor.
- `apps/studio/scripts/preload-model.mjs` and root `scripts/preload-model.mjs`
  are both present — the root one failed (wrong node_modules resolution) and
  the studio one succeeded. Consider deleting the root-level one to avoid
  confusion, keep only `apps/studio/scripts/preload-model.mjs`.

## Reference: full original plan
See `C:\Users\Shishir\.claude\plans\create-a-plan-to-valiant-parnas.md` for the
complete repo plan (Phase 0–5 roadmap, design decisions, repo structure).
