const protocols = [
  {
    name: "MCP",
    fullName: "Model Context Protocol",
    layer: "Tool Access",
    status: "Production",
    statusColor: "emerald",
    year: "2024→",
    description: "Standardises how agents access tools, resources, and prompts. Streamable HTTP transport, elicitation (pause-and-ask), sampling (LLM through client), and MCP Apps (interactive UI results). Now on 2026-07-28 RC.",
    href: "/labs/mcp/server",
  },
  {
    name: "A2A",
    fullName: "Agent-to-Agent Protocol",
    layer: "Agent Interop",
    status: "Production",
    statusColor: "emerald",
    year: "2025→",
    description: "Enables any agent to call any other agent regardless of framework, language, or cloud. AgentCard discovery, task lifecycle, streaming results. 150+ orgs including AWS, Azure, Google, Salesforce.",
    href: "/labs/protocols/a2a",
  },
  {
    name: "AG-UI",
    fullName: "Agent-User Interaction Protocol",
    layer: "Agent → Frontend",
    status: "Available",
    statusColor: "blue",
    year: "2025→",
    description: "Standardises how an agent's real-time output (text tokens, tool calls, state changes, HITL requests) streams to a frontend. Every backend in this repo emits AG-UI events; the Studio canvas subscribes.",
    href: "/labs/protocols/ag-ui",
  },
  {
    name: "A2UI",
    fullName: "Agent-to-UI State Protocol",
    layer: "Agent ↔ Frontend",
    status: "Available",
    statusColor: "blue",
    year: "2025→",
    description: "Persistent-state variant of AG-UI. While AG-UI is event streaming, A2UI keeps the agent's internal state durably synchronised with the UI over time — useful for long-running workflows.",
    href: "/labs/protocols/a2ui",
  },
  {
    name: "AP2",
    fullName: "Agent Payments Protocol",
    layer: "Commerce",
    status: "Teach + Demo",
    statusColor: "yellow",
    year: "2025→",
    description: "Enables agents to initiate secure, auditable financial transactions on behalf of users. 60+ orgs including major payments providers. Pairs with x402 for HTTP-native micropayments.",
    href: "/labs/protocols/ap2",
  },
  {
    name: "WebMCP",
    fullName: "Web MCP (W3C track)",
    layer: "Browser",
    status: "Preview",
    statusColor: "orange",
    year: "2026",
    description: "Extends MCP into the browser. Developed jointly by Google + Microsoft on a W3C track. Chrome Canary preview. Enables web pages to expose MCP tools directly to agents and vice versa.",
    href: "/labs/protocols/webmcp",
  },
];

const statusColor: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-300",
  blue:    "bg-blue-500/10    text-blue-300",
  yellow:  "bg-yellow-500/10  text-yellow-300",
  orange:  "bg-orange-500/10  text-orange-300",
};

export function ProtocolStack() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {protocols.map((p) => (
        <a
          key={p.name}
          href={p.href}
          className="glow-border group flex flex-col rounded-xl border border-white/8 bg-slate-900/60 p-6 transition-all duration-200 hover:bg-slate-800/60"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <span className="text-xl font-bold text-white">{p.name}</span>
              <div className="text-xs text-slate-500 mt-0.5">{p.fullName}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[p.statusColor]}`}>
                {p.status}
              </span>
              <span className="text-xs text-slate-500">{p.layer}</span>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed flex-1">{p.description}</p>
          <div className="mt-4 text-xs text-blue-400 group-hover:text-blue-300 transition-colors">
            Learn + Run lab →
          </div>
        </a>
      ))}
    </div>
  );
}
