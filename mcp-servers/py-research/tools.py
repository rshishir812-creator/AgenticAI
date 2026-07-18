"""
Open research APIs — all free, no API keys required.

- arXiv: academic paper search (Atom XML API)
- Hacker News: story/comment search via Algolia HN Search API (JSON)
- Wikipedia: article summary via the REST API
"""
import xml.etree.ElementTree as ET

import httpx

_ARXIV_NS = {"atom": "http://www.w3.org/2005/Atom"}

# Wikipedia's API rejects requests without a descriptive User-Agent (403) —
# see https://meta.wikimedia.org/wiki/User-Agent_policy
_HEADERS = {"User-Agent": "agentic-ai-lab-py-research/0.1 (https://github.com/rshishir812-creator/AgenticAI)"}


async def search_arxiv(query: str, max_results: int = 5) -> str:
    url = "https://export.arxiv.org/api/query"
    params = {"search_query": f"all:{query}", "start": 0, "max_results": max_results}
    async with httpx.AsyncClient(timeout=15, headers=_HEADERS) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()

    root = ET.fromstring(resp.text)
    entries = root.findall("atom:entry", _ARXIV_NS)
    if not entries:
        return f"No arXiv papers found for '{query}'."

    lines = [f"arXiv results for '{query}':\n"]
    for entry in entries:
        title = entry.findtext("atom:title", default="", namespaces=_ARXIV_NS).strip()
        summary = entry.findtext("atom:summary", default="", namespaces=_ARXIV_NS).strip()
        published = entry.findtext("atom:published", default="", namespaces=_ARXIV_NS)[:10]
        link = entry.findtext("atom:id", default="", namespaces=_ARXIV_NS)
        authors = [a.findtext("atom:name", namespaces=_ARXIV_NS) for a in entry.findall("atom:author", _ARXIV_NS)]
        lines.append(
            f"- **{title}** ({published})\n"
            f"  Authors: {', '.join(authors[:3])}{' et al.' if len(authors) > 3 else ''}\n"
            f"  {summary[:280].replace(chr(10), ' ')}...\n"
            f"  {link}\n"
        )
    return "\n".join(lines)


async def search_hackernews(query: str, max_results: int = 5) -> str:
    url = "https://hn.algolia.com/api/v1/search"
    params = {"query": query, "tags": "story", "hitsPerPage": max_results}
    async with httpx.AsyncClient(timeout=15, headers=_HEADERS) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
    data = resp.json()

    hits = data.get("hits", [])
    if not hits:
        return f"No Hacker News stories found for '{query}'."

    lines = [f"Hacker News results for '{query}':\n"]
    for hit in hits:
        title = hit.get("title") or hit.get("story_title") or "(untitled)"
        points = hit.get("points", 0)
        comments = hit.get("num_comments", 0)
        author = hit.get("author", "unknown")
        hn_url = f"https://news.ycombinator.com/item?id={hit.get('objectID')}"
        story_url = hit.get("url") or hn_url
        lines.append(f"- **{title}** — {points} points, {comments} comments, by {author}\n  {story_url}\n  Discussion: {hn_url}\n")
    return "\n".join(lines)


async def search_wikipedia(query: str) -> str:
    search_url = "https://en.wikipedia.org/w/api.php"
    search_params = {
        "action": "query", "list": "search", "srsearch": query,
        "format": "json", "srlimit": 1,
    }
    async with httpx.AsyncClient(timeout=15, headers=_HEADERS) as client:
        search_resp = await client.get(search_url, params=search_params)
        search_resp.raise_for_status()
        results = search_resp.json().get("query", {}).get("search", [])
        if not results:
            return f"No Wikipedia article found for '{query}'."

        title = results[0]["title"]
        summary_resp = await client.get(
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{title.replace(' ', '_')}"
        )
        summary_resp.raise_for_status()
        summary = summary_resp.json()

    extract = summary.get("extract", "No summary available.")
    page_url = summary.get("content_urls", {}).get("desktop", {}).get("page", "")
    return f"**{summary.get('title', title)}**\n\n{extract}\n\n{page_url}"
