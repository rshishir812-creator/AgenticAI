# Google ADK-Java 1.x Agent

> **Phase 3** — Planned for a future implementation session.
> Runs via Docker — `docker-compose --profile java up`

## What's here

ADK-Java 1.0.0 (GA, June 2026) — Google's official Java agent framework.

### Key features demonstrated

- **Native A2A Protocol support** via `RemoteA2AAgent`:
  ```java
  var card = a2aClient.resolveAgentCard(embabelUrl + "/.well-known/agent-card.json");
  var remoteAgent = RemoteA2AAgent.from(card);
  ```
- **Google Maps grounding** (real-world location data)
- **Human-in-the-Loop** confirmation workflows
- **Event compaction** for long-running agents (manages context window)
- **MCP tool integration** (calls java-finance MCP server)

### Cross-stack scenario

```
ADK-Java (localhost:8082)
    │
    ├── A2A → Embabel GOAP (localhost:8081)  [planning subagent]
    │
    └── MCP → java-finance (localhost:8083)  [market data tools]
```

## Quickstart (Phase 3)

```bash
docker-compose --profile java up adk-java
# → http://localhost:8082
# → http://localhost:8082/.well-known/agent-card.json
```
