import { notFound } from "next/navigation";
import Link from "next/link";

// Lab configurations — maps track IDs to content
const LABS: Record<string, { title: string; description: string; stack: string[]; docPath: string; apiEndpoint?: string }> = {
  "foundations/chat": {
    title: "Chat Completions & Streaming",
    description: "Your first agent endpoint. Call Groq via 6 different clients, observe streaming tokens, compare latency.",
    stack: ["TypeScript", "Python", "Java"],
    docPath: "docs/01-foundations",
    apiEndpoint: "/api/chat",
  },
  "foundations/clients": {
    title: "Client Zoo — 6 Ways to Call an LLM",
    description: "Same chat completion, six different clients: raw fetch, OpenAI SDK, Vercel AI SDK, LangChain, Spring AI, Python openai+httpx.",
    stack: ["TypeScript", "Python", "Java"],
    docPath: "docs/01-foundations/clients",
  },
  "rag/naive": {
    title: "Naive RAG with pgvector",
    description: "Ingest documents → embed → store in Supabase pgvector → retrieve → generate. The foundation all agentic RAG builds on.",
    stack: ["TypeScript"],
    docPath: "docs/02-rag",
    apiEndpoint: "/api/rag/query",
  },
  "rag/agentic": {
    title: "Agentic RAG — Self-RAG + Corrective RAG",
    description: "LangGraph.js StateGraph: query rewrite → retrieve → grade docs → generate → grade answer → retry. Live on the Studio canvas.",
    stack: ["TypeScript", "Python"],
    docPath: "docs/02-rag",
    apiEndpoint: "/api/run",
  },
  "patterns": {
    title: "Orchestration Patterns Catalog",
    description: "Every agentic orchestration pattern: routing, parallelisation, supervisor+workers, ReAct, evaluator-optimizer, GOAP, swarms, and more.",
    stack: ["TypeScript", "Python", "Java"],
    docPath: "docs/03-orchestration-patterns",
  },
  "mcp/server": {
    title: "MCP Servers — Streamable HTTP",
    description: "Build a Streamable HTTP MCP server with tools, resources, and prompts. Deploy to Vercel. See how agents discover and call tools.",
    stack: ["TypeScript", "Python", "Java"],
    docPath: "docs/04-mcp",
  },
  "protocols/a2a": {
    title: "A2A v1.0 — Agent-to-Agent Protocol",
    description: "AgentCards, task lifecycle, and live cross-stack calls: TypeScript supervisor → Python researcher → Java planner.",
    stack: ["TypeScript", "Python", "Java"],
    docPath: "docs/05-protocols",
  },
  "production/observability": {
    title: "Agent Observability — OTel GenAI Conventions",
    description: "Instrument every LLM call, tool call, and retrieval with OpenTelemetry GenAI semantic conventions. View spans in the Studio trace panel.",
    stack: ["TypeScript", "Python"],
    docPath: "docs/06-production",
  },
  "production/routing": {
    title: "Intelligent Model Routing",
    description: "Classify request complexity → route to Groq gpt-oss-20b (fast/cheap) or gpt-oss-120b (powerful). See routing decisions in traces.",
    stack: ["TypeScript"],
    docPath: "docs/06-production",
  },
  "production/loop-detection": {
    title: "Infinite Loop Detection",
    description: "Three strategies: step budget, token budget, state-cycle hashing. Trigger each intentionally and see the LoopDetectedError in traces.",
    stack: ["TypeScript"],
    docPath: "docs/06-production",
  },
  "interop": {
    title: "Cross-Stack Interop Matrix",
    description: "Every agent talks to every other. TypeScript calls Python via A2A. Python calls Java. All share MCP servers. The full matrix live.",
    stack: ["TypeScript", "Python", "Java"],
    docPath: "docs/07-interop",
  },
};

interface Props {
  params: Promise<{ track: string | string[] }>;
}

export default async function LabPage({ params }: Props) {
  const { track } = await params;
  const trackKey = Array.isArray(track) ? track.join("/") : track;
  const lab = LABS[trackKey];

  if (!lab) notFound();

  const stackColor: Record<string, string> = {
    TypeScript: "bg-blue-500/10 text-blue-300",
    Python:     "bg-yellow-500/10 text-yellow-300",
    Java:       "bg-orange-500/10 text-orange-300",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span>›</span>
          <Link href="/studio" className="hover:text-slate-300 transition-colors">Studio</Link>
          <span>›</span>
          <span className="text-slate-300">{lab.title}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {lab.stack.map((s) => (
              <span key={s} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stackColor[s]}`}>{s}</span>
            ))}
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">{lab.title}</h1>
          <p className="text-lg text-slate-400">{lab.description}</p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mb-12">
          <Link
            href="/studio"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
          >
            Open in Studio Canvas →
          </Link>
          <a
            href={`https://github.com/ShishirRao/agentic-ai-lab/tree/main/${lab.docPath}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:text-white hover:border-white/20 transition-colors"
          >
            View Docs on GitHub ↗
          </a>
          {lab.apiEndpoint && (
            <code className="rounded-lg border border-white/8 bg-slate-900 px-4 py-2.5 text-xs text-slate-400 font-mono self-center">
              POST {lab.apiEndpoint}
            </code>
          )}
        </div>

        {/* Lab content placeholder — in a real implementation each lab
            would have a custom client-side component with code, output,
            and trace viewer. For now we point to the Studio and docs. */}
        <div className="rounded-2xl border border-white/8 bg-slate-900/60 p-8 text-center">
          <div className="text-5xl mb-4">🔬</div>
          <h2 className="text-xl font-bold text-white mb-3">Ready to run this lab</h2>
          <p className="text-slate-400 mb-6 max-w-lg mx-auto">
            Open the Studio canvas to run this agent interactively with live traces,
            or explore the source code and documentation on GitHub.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/studio"
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Open Studio →
            </Link>
            <a
              href="https://github.com/ShishirRao/agentic-ai-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-white/10 px-6 py-3 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              GitHub Repository ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Disable static generation — labs are dynamic (depend on env/keys)
export const dynamic = "force-dynamic";
