"use client";
import { useState } from "react";

const steps = [
  {
    n: "1",
    label: "Clone & configure",
    code: `git clone https://github.com/ShishirRao/agentic-ai-lab.git
cd agentic-ai-lab
cp .env.example .env
# Add your GROQ_API_KEY and Supabase credentials to .env`,
  },
  {
    n: "2",
    label: "Install dependencies",
    code: `pnpm install`,
  },
  {
    n: "3",
    label: "Run Supabase migrations",
    code: `# From your Supabase dashboard → SQL Editor, run each file in order:
# supabase/migrations/001_extensions.sql
# supabase/migrations/002_rag_documents.sql
# supabase/migrations/003_runs_and_traces.sql
# supabase/migrations/004_checkpoints.sql
# supabase/migrations/005_agent_memory.sql`,
  },
  {
    n: "4",
    label: "Start the Studio",
    code: `pnpm studio
# → http://localhost:3000`,
  },
  {
    n: "5",
    label: "(Optional) Start Java agents",
    code: `docker-compose --profile java up
# Embabel: http://localhost:8081
# ADK-Java: http://localhost:8082
# Java MCP: http://localhost:8083`,
  },
];

export function QuickStart() {
  const [active, setActive] = useState(0);

  return (
    <div className="text-left">
      {/* Step tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {steps.map((s, i) => (
          <button
            key={s.n}
            onClick={() => setActive(i)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              active === i
                ? "bg-blue-600 text-white"
                : "border border-white/10 text-slate-400 hover:text-white hover:border-white/20"
            }`}
          >
            {s.n}. {s.label}
          </button>
        ))}
      </div>

      {/* Code block */}
      <div className="code-block overflow-x-auto p-5 text-sm">
        <pre className="text-slate-300 whitespace-pre-wrap break-words">{steps[active].code}</pre>
      </div>

      <p className="mt-6 text-sm text-slate-500 text-center">
        Free Groq key:{" "}
        <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
          console.groq.com
        </a>{" "}
        · Free Supabase:{" "}
        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
          supabase.com
        </a>
      </p>
    </div>
  );
}
