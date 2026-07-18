# py-research — Python Streamable HTTP MCP Server

Mirrors [`mcp-servers/ts-open-data`](../ts-open-data) but in Python, using the
official [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)'s
`FastMCP` and three free, no-API-key research APIs.

## Tools

| Tool | API | Notes |
|---|---|---|
| `arxiv_search` | [arXiv API](https://info.arxiv.org/help/api/) | Atom XML. arXiv enforces ~1 request per 3s — burst testing will get you a temporary `Rate exceeded.` response. |
| `hackernews_search` | [Algolia HN Search API](https://hn.algolia.com/api) | JSON, no auth, generous rate limits. |
| `wikipedia_search` | [Wikipedia REST API](https://www.mediawiki.org/wiki/API:REST_API) | Requires a descriptive `User-Agent` header or you get `403`. |

## Run

```bash
cd mcp-servers/py-research
pip install -r requirements.txt
python server.py            # port 3002 (or $PORT)
```

## Endpoints

- `POST /mcp` — Streamable HTTP MCP transport (stateless mode — no session ID needed)
- `GET /health` — health check
- `GET /.well-known/agent-card.json` — A2A discovery card

## Teaching points

- **Stateless Streamable HTTP**: `FastMCP(..., stateless_http=True)` — no session
  affinity needed, so this server can run behind a load balancer or as a
  serverless function without sticky sessions.
- **Lifespan wiring**: `FastMCP.streamable_http_app()` returns its own Starlette
  app with the session manager's lifespan attached. When mounting it inside a
  *different* outer Starlette app (to add `/health` and the agent-card route
  alongside `/mcp`), that lifespan doesn't propagate automatically — see the
  explicit `lifespan=lambda _app: mcp.session_manager.run()` wiring in
  `server.py`.
- **User-Agent matters**: Wikipedia's API returns a hard `403` without one —
  a good real-world reminder that "free public API" doesn't mean
  "no etiquette required."
