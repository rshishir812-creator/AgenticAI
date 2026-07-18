# MCP — Model Context Protocol

> **Labs 2.1–2.3 · Practitioner · TypeScript · Python · Java**

## Spec versions in this repo

| Version | Transport | Key features |
|---------|-----------|---|
| **2025-06-18** (stable) | Streamable HTTP + stdio | tools, resources, prompts, elicitation, sampling |
| **2026-07-28** (RC) | Stateless HTTP | Multi-Round-Trip (SEP-2322) replaces server-initiated calls |

## Streamable HTTP transport (2025-06-18 stable)

The current production transport. A single HTTP endpoint handles both:
- `POST /mcp` — client sends a JSON-RPC request; response can be plain JSON or SSE stream
- Both the "request" and the "events" flow over the same endpoint

```
Client                      Server
  |                            |
  |── POST /mcp ─────────────→ |   initialize
  |← HTTP 200 (JSON) ─────────|
  |── POST /mcp ─────────────→ |   tools/call
  |← HTTP 200 (SSE stream) ───|   (streaming result)
```

MCP 2026-07-28 RC adds required headers:
- `Mcp-Method: tools/call`  — for routing/rate-limiting
- `Mcp-Name: get_weather`   — tool name

## Elicitation (pause-and-ask)

MCP elicitation lets a **server** pause a tool call and ask the **user** for structured input:

```json
// Server returns during tool execution:
{
  "type": "elicitation",
  "message": "Which city did you mean?",
  "requestedSchema": {
    "type": "object",
    "properties": { "city": { "type": "string" } }
  }
}
```

The client (usually the agent framework) shows this to the user, collects the answer,
and re-invokes the tool with the clarified input.

**Demonstrated in:** `mcp-servers/ts-open-data` (weather tool when location is ambiguous)

## Sampling (LLM through client)

Servers can request an LLM completion **through the client** — no API key needed on the server:

```typescript
// Server-side
const result = await server.createMessage({
  messages: [{ role: "user", content: "Summarise this data..." }],
  maxTokens: 200,
});
```

The client (LLM app) fulfils the request using its own model access.

**2026-07-28 note:** SEP-2322 replaces the old `sampling/createMessage` server-initiated call
with Multi-Round-Trip Requests — same intent, stateless-friendly pattern.

## MCP Apps (interactive UI results)

Servers can now return rich interactive UI as tool results — rendered in a sandboxed iframe:

```typescript
return {
  content: [
    {
      type: "resource",
      resource: {
        uri: "mcp-app://weather-widget",
        mimeType: "text/html",
        text: `<html>...interactive weather card...</html>`,
      }
    }
  ]
};
```

## Our 3 MCP servers

| Server | Location | APIs | Elicitation | Sampling |
|--------|----------|------|-------------|---------|
| ts-open-data | `mcp-servers/ts-open-data/` | Open-Meteo, REST Countries, Frankfurter | ✅ (location disambiguation) | ✅ |
| py-research | `mcp-servers/py-research/` | arXiv, HN, Wikipedia | Phase 2 | Phase 2 |
| java-finance | `mcp-servers/java-finance/` | Open exchange rates, CoinGecko | Phase 3 | Phase 3 |

## Running the ts-open-data server

```bash
cd mcp-servers/ts-open-data
pnpm dev
# → http://localhost:3001/mcp

# Test with MCP inspector
npx @modelcontextprotocol/inspector http://localhost:3001/mcp
```
