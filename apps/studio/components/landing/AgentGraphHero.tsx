"use client";

/**
 * Animated SVG graph shown in the hero — a mini representation of the
 * cross-stack architecture: TS agent → MCP server → LLM, plus A2A to Python.
 */

export function AgentGraphHero() {
  const nodes = [
    { id: "user",    x: 60,  y: 110, label: "User",           color: "#64748b", shape: "circle" },
    { id: "lg-ts",  x: 200, y: 60,  label: "LangGraph.js",   color: "#3b82f6", shape: "rect" },
    { id: "mcp",    x: 360, y: 40,  label: "MCP Server",     color: "#8b5cf6", shape: "hex" },
    { id: "groq",   x: 500, y: 90,  label: "Groq LLM",       color: "#10b981", shape: "rect" },
    { id: "adk-py", x: 200, y: 165, label: "ADK 2.0 (Py)",   color: "#f59e0b", shape: "rect" },
    { id: "embabel",x: 360, y: 185, label: "Embabel (Java)",  color: "#ef4444", shape: "rect" },
    { id: "supa",   x: 500, y: 185, label: "Supabase",        color: "#06b6d4", shape: "rect" },
  ];

  const edges = [
    { from: "user",    to: "lg-ts",   label: "prompt",     color: "#3b82f6" },
    { from: "lg-ts",  to: "mcp",     label: "MCP tools",  color: "#8b5cf6" },
    { from: "mcp",    to: "groq",    label: "sampling",   color: "#10b981" },
    { from: "lg-ts",  to: "groq",    label: "chat",       color: "#10b981" },
    { from: "lg-ts",  to: "adk-py",  label: "A2A v1.0",  color: "#f59e0b" },
    { from: "adk-py", to: "embabel", label: "A2A v1.0",  color: "#ef4444" },
    { from: "lg-ts",  to: "supa",    label: "traces",     color: "#06b6d4" },
    { from: "embabel",to: "supa",    label: "checkpoints",color: "#06b6d4" },
  ];

  function nodePos(id: string) {
    const n = nodes.find((n) => n.id === id)!;
    return { x: n.x + 45, y: n.y + 16 };
  }

  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/8 bg-slate-900/60 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-red-500/70" />
        <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
        <span className="h-3 w-3 rounded-full bg-green-500/70" />
        <span className="ml-3 text-xs text-slate-500">agentic-ai-lab — cross-stack architecture</span>
      </div>
      <svg
        viewBox="0 0 600 240"
        className="w-full"
        style={{ minHeight: 200 }}
        aria-label="Animated agent architecture graph"
      >
        {/* Edges */}
        {edges.map((e) => {
          const from = nodePos(e.from);
          const to   = nodePos(e.to);
          const mx   = (from.x + to.x) / 2;
          const my   = (from.y + to.y) / 2 - 20;
          return (
            <g key={`${e.from}-${e.to}`}>
              <path
                d={`M${from.x},${from.y} Q${mx},${my} ${to.x},${to.y}`}
                fill="none"
                stroke={e.color}
                strokeWidth="1.5"
                strokeOpacity="0.3"
                strokeDasharray="5 5"
                className="animate-dash"
              />
              <text x={mx} y={my - 4} textAnchor="middle" fontSize="8" fill={e.color} opacity="0.6">
                {e.label}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n, i) => (
          <g key={n.id} className="animate-pulse-node" style={{ animationDelay: `${i * 0.3}s` }}>
            {n.shape === "circle" ? (
              <circle cx={n.x + 45} cy={n.y + 16} r={18} fill={n.color} fillOpacity="0.15" stroke={n.color} strokeWidth="1.5" />
            ) : (
              <rect x={n.x} y={n.y} width={90} height={32} rx={6} fill={n.color} fillOpacity="0.12" stroke={n.color} strokeWidth="1.5" />
            )}
            <text x={n.x + 45} y={n.y + 21} textAnchor="middle" fontSize="9.5" fill={n.color} fontWeight="600">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="border-t border-white/5 px-4 py-2 text-center text-xs text-slate-500">
        TypeScript on Vercel · Python on Vercel · Java on Docker · Supabase · Groq
      </div>
    </div>
  );
}
