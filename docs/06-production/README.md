# Production Patterns

> **Labs 2.8–2.12 · Practitioner · TypeScript · Python**

Building agents that work in demos is easy. Building agents that work reliably in production is the hard part.
This section covers the six production concerns every serious agent needs.

## 1. Observability — OTel GenAI Semantic Conventions

**Lab:** `/labs/production/observability`

OpenTelemetry published [GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) in 2024
as the standard way to instrument LLM calls. Every agent in this repo emits OTel spans into Supabase
`traces` table, visible in the Studio trace panel.

Key span attributes:
```
gen_ai.system          = "groq"
gen_ai.model           = "openai/gpt-oss-120b"
gen_ai.operation.name  = "chat"
gen_ai.usage.input_tokens  = 1234
gen_ai.usage.output_tokens = 456
```

**Implementation:** `packages/observability/src/tracer.ts`

Optional: forward to Langfuse by setting `LANGFUSE_*` env vars.

## 2. Intelligent Model Routing

**Lab:** `/labs/production/routing`
**Code:** `agents/langgraph-ts/src/model-router.ts`

Instead of always using the powerful (expensive) model, classify the task first:

```
User request → Classifier (gpt-oss-20b) → score 0–1
  < 0.35: route to gpt-oss-20b  (fast, cheap)
  ≥ 0.35: route to gpt-oss-120b (powerful)
```

Savings: ~5× cheaper on simple tasks; complex tasks still get full power.
Routing decision is logged as a span attribute → visible in trace panel.

## 3. Infinite Loop & Runaway Cost Detection

**Lab:** `/labs/production/loop-detection`
**Code:** `agents/langgraph-ts/src/loop-detector.ts`

Three complementary strategies:

| Strategy | Detects | Mechanism |
|----------|---------|-----------|
| **Step budget** | Agents that never finish | Hard cap on node executions |
| **Token budget** | Agents that generate too much | Running token count vs. limit |
| **State cycle** | Agents stuck in a loop | SHA-256 hash of graph state, window comparison |

All three run per-step inside the LangGraph graph. `LoopDetectedError` is caught
by the error handler, emits an AG-UI `error` event with `loopDetected: true`.

## 4. PII Redaction

**Lab:** `/labs/production/redaction`

A middleware layer that runs on tool inputs/outputs **before** logging to traces.
Uses a combination of regex patterns and a lightweight NER model:

- Email addresses → `[REDACTED_EMAIL]`
- Phone numbers   → `[REDACTED_PHONE]`
- Credit cards    → `[REDACTED_CC]`
- Names (NER)     → `[REDACTED_NAME]`
- Custom patterns via env config

Redacted spans have `redacted: true` and `redactedFields: [...]` in Supabase.

## 5. Guardrails & Prompt-Injection Defense

**Lab:** `/labs/production/guardrails`

Three layers:
1. **Input validation** — schema check + moderation call before agent runs
2. **Prompt-injection detection** — classifier checks if user input tries to override system instructions
3. **Output validation** — schema check + hallucination scorer after agent completes

Key insight: tool-using agents are especially vulnerable to prompt injection via tool results
(e.g., a web page that says "Ignore previous instructions"). We demonstrate this attack
and the defense.

## 6. Agent Memory

**Lab:** `/labs/production/memory`

Three types of memory:

| Type | Storage | Scope | When to use |
|------|---------|-------|-------------|
| **Short-term** | LangGraph state | Single run | Current conversation context |
| **Long-term** | Supabase `agent_memory` | Across runs | User preferences, facts |
| **Episodic** | Supabase `agent_memory` + embedding | Across runs | "What did we discuss last week?" |

LangGraph's **Store API** maps onto the `agent_memory` table — agents can read/write
cross-thread memories using the same interface.
