const stack = [
  {
    category: "Frontend",
    color: "blue",
    items: ["Next.js 15 (App Router)", "React 19", "Tailwind CSS v4", "React Flow (xyflow)", "Vercel AI SDK"],
  },
  {
    category: "TypeScript Agents",
    color: "sky",
    items: ["LangGraph.js 1.x", "@modelcontextprotocol/sdk", "Groq SDK", "OpenAI SDK (→Groq)", "nanoid"],
  },
  {
    category: "Python Agents",
    color: "yellow",
    items: ["LangGraph 1.x (Py)", "Google ADK 2.0", "FastAPI", "openai (→Groq)", "httpx streaming"],
  },
  {
    category: "Java Agents",
    color: "orange",
    items: ["Embabel 0.3.x (GOAP)", "ADK-Java 1.x", "Spring Boot 3.x", "Kotlin data classes", "A2A Java SDK"],
  },
  {
    category: "Protocols",
    color: "purple",
    items: ["MCP (Streamable HTTP)", "A2A v1.0", "AG-UI", "A2UI", "AP2 / x402", "WebMCP (W3C)"],
  },
  {
    category: "LLMs",
    color: "emerald",
    items: ["Groq gpt-oss-120b", "Groq gpt-oss-20b", "Groq qwen3.6-27b", "OpenAI-compatible API", "Model routing tier"],
  },
  {
    category: "Data & Infra",
    color: "cyan",
    items: ["Supabase Postgres 16", "pgvector 0.7", "Hybrid search (RRF)", "LangGraph checkpointer", "Agent memory table"],
  },
  {
    category: "Observability",
    color: "pink",
    items: ["OTel GenAI conventions", "Custom trace sink", "Langfuse (optional)", "Loop detection", "Cost tracking"],
  },
];

const colorMap: Record<string, string> = {
  blue:   "border-blue-500/20   bg-blue-500/5   text-blue-300",
  sky:    "border-sky-500/20    bg-sky-500/5    text-sky-300",
  yellow: "border-yellow-500/20 bg-yellow-500/5 text-yellow-300",
  orange: "border-orange-500/20 bg-orange-500/5 text-orange-300",
  purple: "border-purple-500/20 bg-purple-500/5 text-purple-300",
  emerald:"border-emerald-500/20 bg-emerald-500/5 text-emerald-300",
  cyan:   "border-cyan-500/20   bg-cyan-500/5   text-cyan-300",
  pink:   "border-pink-500/20   bg-pink-500/5   text-pink-300",
};

export function TechStack() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stack.map((s) => (
        <div key={s.category} className={`rounded-xl border p-5 ${colorMap[s.color]}`}>
          <div className="font-semibold text-sm mb-3">{s.category}</div>
          <ul className="space-y-1.5">
            {s.items.map((item) => (
              <li key={item} className="text-xs text-slate-400 flex items-center gap-1.5">
                <span className="opacity-60">·</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
