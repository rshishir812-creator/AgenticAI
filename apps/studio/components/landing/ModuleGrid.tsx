import Link from "next/link";

const modules = [
  // Foundations
  { id: "1.1", title: "Chat Completions & Streaming",       track: "Beginner",      tags: ["TS","Py","Java"],        href: "/labs/foundations/chat",        difficulty: "Easy" },
  { id: "1.2", title: "Client Zoo — 6 Ways to Call an LLM",track: "Beginner",      tags: ["TS","Py","Java"],        href: "/labs/foundations/clients",     difficulty: "Easy" },
  { id: "1.4", title: "Naive RAG with pgvector",            track: "Beginner",      tags: ["TS"],                    href: "/labs/rag/naive",               difficulty: "Easy" },
  { id: "2.1", title: "MCP Servers — Streamable HTTP",      track: "Practitioner",  tags: ["TS","Py","Java"],        href: "/labs/mcp/server",              difficulty: "Medium" },
  { id: "2.4", title: "Agentic RAG (Self-RAG + Corrective)",track: "Practitioner",  tags: ["TS","Py"],               href: "/labs/rag/agentic",             difficulty: "Medium" },
  { id: "2.7", title: "Orchestration Patterns Catalog",     track: "Practitioner",  tags: ["TS","Py"],               href: "/labs/patterns",                difficulty: "Medium" },
  { id: "2.8", title: "Agent Observability (OTel GenAI)",   track: "Practitioner",  tags: ["TS","Py"],               href: "/labs/production/observability", difficulty: "Medium" },
  { id: "2.9", title: "Intelligent Model Routing",          track: "Practitioner",  tags: ["TS"],                    href: "/labs/production/routing",      difficulty: "Medium" },
  { id: "2.10","title": "Loop Detection & Token Budgets",   track: "Practitioner",  tags: ["TS"],                    href: "/labs/production/loop-detection",difficulty: "Medium" },
  { id: "3.1", title: "A2A v1.0 — Cross-Stack Agent Calls",track: "Architect",     tags: ["TS","Py","Java"],        href: "/labs/protocols/a2a",           difficulty: "Advanced" },
  { id: "3.2", title: "AG-UI Event Streaming Protocol",     track: "Architect",     tags: ["TS"],                    href: "/labs/protocols/ag-ui",         difficulty: "Advanced" },
  { id: "3.6", title: "Embabel GOAP (Java/Kotlin)",         track: "Architect",     tags: ["Java"],                  href: "/labs/java/embabel",            difficulty: "Advanced" },
  { id: "3.7", title: "Google ADK 2.0 Workflow Runtime",    track: "Architect",     tags: ["Py","Java"],             href: "/labs/adk",                     difficulty: "Advanced" },
  { id: "3.8", title: "Cross-Stack Interop Matrix",         track: "Architect",     tags: ["TS","Py","Java"],        href: "/labs/interop",                 difficulty: "Advanced" },
  { id: "3.11","title": "Durable Agents + Time-Travel",     track: "Architect",     tags: ["TS"],                    href: "/labs/patterns/durable",        difficulty: "Advanced" },
];

const difficultyColor: Record<string, string> = {
  Easy:     "text-emerald-300 bg-emerald-500/10",
  Medium:   "text-blue-300    bg-blue-500/10",
  Advanced: "text-purple-300  bg-purple-500/10",
};

const trackColor: Record<string, string> = {
  Beginner:     "text-emerald-400",
  Practitioner: "text-blue-400",
  Architect:    "text-purple-400",
};

const tagColor: Record<string, string> = {
  TS:   "bg-blue-500/10   text-blue-300",
  Py:   "bg-yellow-500/10 text-yellow-300",
  Java: "bg-orange-500/10 text-orange-300",
};

export function ModuleGrid() {
  return (
    <div>
      <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-400">All Modules</div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.id}
            href={m.href}
            className="glow-border group flex flex-col rounded-xl border border-white/8 bg-slate-900/60 p-5 transition-all duration-200 hover:bg-slate-800/60"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-semibold ${trackColor[m.track]}`}>
                {m.track} · {m.id}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${difficultyColor[m.difficulty]}`}>
                {m.difficulty}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-slate-100 group-hover:text-white transition-colors leading-snug">
              {m.title}
            </h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {m.tags.map((t) => (
                <span key={t} className={`rounded px-1.5 py-0.5 text-xs font-mono ${tagColor[t]}`}>
                  {t}
                </span>
              ))}
            </div>
            <div className="mt-auto pt-4 text-xs text-blue-400 group-hover:text-blue-300 transition-colors">
              Open Lab →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
