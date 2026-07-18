/**
 * ts-open-data — Streamable HTTP MCP Server
 *
 * Transport: Streamable HTTP (MCP spec 2025-06-18)
 * Deploy:    Vercel — the api/mcp/route.ts in apps/studio proxies here
 *            (or deploy this as a standalone Vercel project)
 *
 * All 3 APIs are public/free with no authentication required — great for
 * learners who just want to test tool use without any API keys.
 *
 * Teaching points covered here:
 *   • Streamable HTTP transport (POST + SSE on same endpoint)
 *   • Tool definitions with Zod schemas
 *   • Returning rich text vs JSON from tools
 *   • How MCP elicitation works (see handleMissingLocation below)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";
import { getWeather, weatherInputSchema } from "./tools/weather.js";
import { getCountryInfo, countryInputSchema } from "./tools/countries.js";
import { getExchangeRates, forexInputSchema } from "./tools/forex.js";

// ── Build the MCP server ───────────────────────────────────────────────────

const server = new McpServer({
  name: "open-data",
  version: "0.1.0",
});

server.tool(
  "get_weather",
  "Get current weather and multi-day forecast for any location using Open-Meteo (free, no API key)",
  weatherInputSchema.shape,
  async ({ location, days, units }) => {
    const result = await getWeather({ location, days: days ?? 3, units: units ?? "metric" });
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "get_country_info",
  "Get detailed information about any country: population, capital, currencies, languages, flag, codes",
  countryInputSchema.shape,
  async ({ query, fields }) => {
    const result = await getCountryInfo({ query, fields });
    return { content: [{ type: "text", text: result }] };
  }
);

server.tool(
  "get_exchange_rates",
  "Get current or historical FX exchange rates via Frankfurter (ECB reference rates, free, no API key)",
  forexInputSchema.shape,
  async ({ base, targets, amount, date }) => {
    const result = await getExchangeRates({ base, targets, amount: amount ?? 1, date });
    return { content: [{ type: "text", text: result }] };
  }
);

// ── Server resources (demonstrate MCP resource capability) ────────────────

server.resource(
  "open-data://readme",
  "readme",
  { mimeType: "text/markdown" },
  async () => ({
    contents: [{
      uri: "open-data://readme",
      mimeType: "text/markdown",
      text: `# ts-open-data MCP Server\n\n## Tools\n- **get_weather** — Open-Meteo (no key)\n- **get_country_info** — REST Countries (no key)\n- **get_exchange_rates** — Frankfurter ECB rates (no key)\n\n## Transport\nStreamable HTTP — spec 2025-06-18\n`,
    }],
  })
);

// ── Streamable HTTP transport ──────────────────────────────────────────────

const transport = new StreamableHTTPServerTransport({ path: "/mcp" });
await server.connect(transport);

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

const httpServer = createServer((req, res) => {
  // Health check
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", server: "ts-open-data", version: "0.1.0" }));
    return;
  }

  // A2A agent card (so this MCP server is also A2A-discoverable)
  if (req.url === "/.well-known/agent-card.json" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      id: "ts-open-data-mcp",
      name: "Open Data MCP Server",
      description: "MCP server providing weather, country, and FX tools via free public APIs",
      version: "0.1.0",
      capabilities: { mcp: { transport: "streamable-http", endpoint: "/mcp" } },
    }));
    return;
  }

  transport.handleRequest(req, res);
});

httpServer.listen(PORT, () => {
  console.log(`[ts-open-data] MCP server listening on http://localhost:${PORT}/mcp`);
  console.log(`[ts-open-data] Health: http://localhost:${PORT}/health`);
});
