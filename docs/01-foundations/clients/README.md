# Client Zoo — 6 Ways to Call the Same LLM API

> **Lab 1.2 · Beginner · TypeScript · Python · Java**

The same chat completion, implemented 6 different ways. All point to Groq's
OpenAI-compatible API. Compare syntax, streaming behaviour, and error handling
across clients and languages.

## The 6 clients

| # | Client | Lang | File |
|---|--------|------|------|
| 1 | `fetch` (raw HTTP, manual SSE parsing) | TS | `01-raw-fetch.ts` |
| 2 | `openai` Node.js SDK | TS | `02-openai-sdk.ts` |
| 3 | Vercel AI SDK (`streamText`) | TS | `03-vercel-ai-sdk.ts` |
| 4 | LangChain `ChatOpenAI` | TS | `04-langchain.ts` |
| 5 | Spring AI `ChatClient` | Java | `05-spring-ai.java` |
| 6 | Python `openai` + `httpx` streaming | Py | `06-openai-py.py` |

## Why this matters

Every framework, tutorial, and stack uses a different client. When you switch
libraries you need to understand what's the same (the OpenAI wire format) and
what's different (streaming APIs, error types, retry logic). This lab makes
that concrete.

## Teaching points

- **OpenAI wire format** is the lingua franca — if it's OpenAI-compatible, any client works
- **Streaming** requires SSE parsing; each client abstracts this differently
- **Structured outputs** (`response_format: json_object`) work the same across clients
- **Tool calling** syntax is identical across clients; only the SDK wrapper changes
- **Error handling** differs significantly (Groq rate limits, timeouts, etc.)
