"""
py-research — Streamable HTTP MCP server (Python)

Mirrors mcp-servers/ts-open-data's shape but in Python and with different
open, no-API-key research APIs: arXiv, Hacker News (Algolia), Wikipedia.

Run:
    python server.py            # port 3002 (or $PORT)

Endpoints:
    POST /mcp                    Streamable HTTP MCP transport
    GET  /health                 health check
    GET  /.well-known/agent-card.json   A2A discovery card
"""
import os

from mcp.server.fastmcp import FastMCP
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route

from tools import search_arxiv, search_hackernews, search_wikipedia

mcp = FastMCP("py-research", stateless_http=True)


@mcp.tool()
async def arxiv_search(query: str, max_results: int = 5) -> str:
    """Search arXiv for academic papers matching a query. Free, no API key."""
    return await search_arxiv(query, max_results)


@mcp.tool()
async def hackernews_search(query: str, max_results: int = 5) -> str:
    """Search Hacker News stories via the Algolia HN Search API. Free, no API key."""
    return await search_hackernews(query, max_results)


@mcp.tool()
async def wikipedia_search(query: str) -> str:
    """Search Wikipedia and return a summary of the best-matching article. Free, no API key."""
    return await search_wikipedia(query)


async def health(_request):
    return JSONResponse({"status": "ok", "server": "py-research", "version": "0.1.0"})


async def agent_card(_request):
    return JSONResponse({
        "id": "py-research-mcp",
        "name": "Research MCP Server",
        "description": "MCP server providing arXiv, Hacker News, and Wikipedia research tools via free public APIs",
        "version": "0.1.0",
        "capabilities": {"mcp": {"transport": "streamable-http", "endpoint": "/mcp"}},
    })


app = Starlette(
    routes=[
        Route("/health", health),
        Route("/.well-known/agent-card.json", agent_card),
        Mount("/", app=mcp.streamable_http_app()),
    ],
    # Mount() doesn't propagate ASGI lifespan events to the sub-app, but
    # FastMCP's StreamableHTTPSessionManager needs its run() context active
    # for the whole process lifetime — wire it through explicitly.
    lifespan=lambda _app: mcp.session_manager.run(),
)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 3002))
    print(f"[py-research] MCP server listening on http://localhost:{port}/mcp")
    print(f"[py-research] Health: http://localhost:{port}/health")
    uvicorn.run(app, host="0.0.0.0", port=port)
