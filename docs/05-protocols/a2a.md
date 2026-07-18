# A2A v1.0 — Agent-to-Agent Protocol

> **Lab 3.1 · Architect · TypeScript · Python · Java**
> Status: Production — AWS Bedrock AgentCore, Azure AI Foundry, Copilot Studio, 150+ orgs

## What A2A solves

Before A2A, agents from different frameworks/vendors couldn't talk to each other.
A2A standardises:
1. **Agent discovery** — how to find what an agent can do (AgentCard)
2. **Task delegation** — how to send work and track it (task lifecycle)
3. **Result streaming** — how to receive progressive results over SSE

## Core concepts

### AgentCard

Every A2A-capable agent exposes a card at `/.well-known/agent-card.json`:

```json
{
  "id": "langgraph-ts:agentic-rag",
  "name": "Agentic RAG Agent (TypeScript)",
  "description": "Self-RAG + Corrective RAG using LangGraph.js and Groq",
  "version": "0.1.0",
  "capabilities": {
    "streaming": true,
    "humanInTheLoop": true,
    "a2a": {
      "endpoint": "https://agentic-ai-lab.vercel.app/api/a2a",
      "specVersion": "1.0"
    }
  },
  "skills": [
    {
      "id": "rag-query",
      "name": "Answer questions using retrieved documents",
      "inputModes": ["text"],
      "outputModes": ["text"]
    }
  ]
}
```

### Task lifecycle

```
Client                    Agent
  |── POST /api/a2a/tasks ──→|  create task
  |← 202 { taskId }  ────────|
  |                           |  (agent runs)
  |── GET /api/a2a/tasks/:id ─|  poll or SSE subscribe
  |← SSE stream of events ───|  working → completed/failed
```

### Cross-stack scenario (this repo)

```
TS Supervisor (Vercel)
    │
    ├── A2A → Python Researcher (Vercel)   [ADK 2.0]
    │         │
    │         └── MCP → py-research server (arXiv, HN, Wikipedia)
    │
    └── A2A → Java Planner (Docker)         [Embabel GOAP]
              │
              └── MCP → java-finance server (FX, market data)
```

## In this repo

Every agent exposes a `/.well-known/agent-card.json`:

| Agent | Card endpoint | A2A endpoint |
|-------|--------------|--------------|
| langgraph-ts:agentic-rag | `GET /well-known/agent-card.json` | `POST /api/a2a` |
| adk-py:workflow | `GET /.well-known/agent-card.json` | `POST /api/a2a` |
| embabel-java:goap | `GET /.well-known/agent-card.json` | `POST /api/a2a` |
| adk-java:a2a | `GET /.well-known/agent-card.json` | `POST /api/a2a` |

ADK-Java uses native A2A support via `RemoteA2AAgent`:

```java
// ADK-Java — call the Embabel agent via A2A
var agentCard = a2aClient.resolveAgentCard("http://localhost:8081/.well-known/agent-card.json");
var remoteAgent = RemoteA2AAgent.from(agentCard);
var response = remoteAgent.execute(TaskRequest.of("Plan a trip to Paris"));
```

## Lab: Cross-stack call

```bash
# 1. Start all Java agents
docker-compose --profile java up

# 2. Start Studio (proxies A2A calls)
pnpm studio

# 3. Open http://localhost:3000/labs/protocols/a2a
# → Run the cross-stack scenario
# → See A2A task events in the trace panel
```
