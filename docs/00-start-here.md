# 🗺️ Start Here — Agentic AI Lab Curriculum

Welcome to the Agentic AI Lab. This repo is both a **showcase** and a **learning platform** — every pattern has working code, a live Studio canvas, and documentation.

## How to navigate

```
docs/
├── 00-start-here.md           ← you are here
├── 01-foundations/            ← Beginner track
├── 02-rag/                    ← RAG → Agentic RAG
├── 03-orchestration-patterns/ ← Every pattern with code
├── 04-mcp/                    ← MCP: Streamable HTTP, elicitation, sampling, Apps
├── 05-protocols/              ← A2A, AG-UI, A2UI, AP2, WebMCP
├── 06-production/             ← Observability, routing, loops, redaction, evals, memory
└── 07-interop/                ← Cross-stack: TS ↔ Py ↔ Java
```

## Learning paths

### 🌱 Beginner — "I want to build my first agent"
1. [01-foundations/README.md](01-foundations/README.md) — chat completions, streaming, structured outputs
2. [01-foundations/clients/README.md](01-foundations/clients/README.md) — client zoo: 6 ways to call the same API
3. [02-rag/README.md](02-rag/README.md) — naive RAG with pgvector

### 🚀 Practitioner — "I want to build production systems"
1. [03-orchestration-patterns/README.md](03-orchestration-patterns/README.md) — pattern catalog
2. [04-mcp/README.md](04-mcp/README.md) — MCP servers (Streamable HTTP, elicitation, sampling)
3. [02-rag/agentic-rag.md](02-rag/agentic-rag.md) — Self-RAG + Corrective RAG
4. [06-production/README.md](06-production/README.md) — observability, routing, loop detection, redaction

### 🏗️ Architect — "I want cross-stack, cross-protocol systems"
1. [05-protocols/a2a.md](05-protocols/a2a.md) — A2A v1.0
2. [05-protocols/ag-ui.md](05-protocols/ag-ui.md) — AG-UI event streaming
3. [07-interop/README.md](07-interop/README.md) — cross-stack scenarios
4. [03-orchestration-patterns/goap.md](03-orchestration-patterns/goap.md) — Embabel GOAP

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 20+ | `node --version` |
| pnpm 9+ | `npm install -g pnpm` |
| Docker Desktop | For Java agents (optional in Phase 1) |
| Groq API key | Free at [console.groq.com](https://console.groq.com) |
| Supabase project | Free at [supabase.com](https://supabase.com) |
| OpenAI API key (optional) | For pgvector embeddings; keyword search works without it |

## 2026 protocol stack at a glance

| Protocol | Solves | Spec |
|----------|--------|------|
| **MCP** | Agent ↔ Tools (Streamable HTTP) | 2025-06-18 stable; 2026-07-28 RC |
| **A2A v1.0** | Agent ↔ Agent (cross-stack) | Google, 150+ orgs |
| **AG-UI** | Agent → Frontend (event stream) | CopilotKit |
| **A2UI** | Agent ↔ Frontend (state sync) | CopilotKit |
| **AP2** | Agent ↔ Payments | 60+ payment orgs |
| **x402** | HTTP micropayments for agents | Coinbase |
| **WebMCP** | MCP in the browser (W3C) | Chrome Canary |

## What's new in 2026 (vs established concepts)

| 2026-era (prioritised) | Established |
|---|---|
| MCP Streamable HTTP + elicitation/sampling/Apps | Basic tool use |
| A2A v1.0 + AgentCards | LangChain agents |
| Google ADK 2.0 Workflow Runtime + Task API | ReAct loop |
| Embabel GOAP (JVM-native) | Python-only frameworks |
| AG-UI / A2UI event protocols | REST API agents |
| AP2 / x402 / WebMCP | Static tool definitions |
| OTel GenAI semantic conventions | Print-statement debugging |
| Multi-Round-Trip MCP (SEP-2322) | Single-turn tool calls |

---
*Last updated: July 2026*
