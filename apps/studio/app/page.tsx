import Link from "next/link";
import { AgentGraphHero } from "@/components/landing/AgentGraphHero";
import { TrackCard } from "@/components/landing/TrackCard";
import { ModuleGrid } from "@/components/landing/ModuleGrid";
import { TechStack } from "@/components/landing/TechStack";
import { QuickStart } from "@/components/landing/QuickStart";
import { ProtocolStack } from "@/components/landing/ProtocolStack";

export default function LandingPage() {
  return (
    <div className="min-h-screen hero-gradient">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <span className="font-bold text-lg tracking-tight">
            <span className="text-blue-400">Agentic</span>
            <span className="text-white"> AI Lab</span>
          </span>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#curriculum" className="hover:text-white transition-colors">Curriculum</a>
            <a href="#protocols" className="hover:text-white transition-colors">Protocols</a>
            <a href="#stack" className="hover:text-white transition-colors">Stack</a>
            <a href="#quickstart" className="hover:text-white transition-colors">Quickstart</a>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/ShishirRao/agentic-ai-lab"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              GitHub ↗
            </a>
            <Link
              href="/studio"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Open Studio →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 pt-24 pb-20 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-300">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
          Updated for 2026 — MCP 2026-07-28 RC · A2A v1.0 · Google ADK 2.0 · Embabel GOAP
        </div>

        <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
          The Complete{" "}
          <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
            Agentic AI Lab
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-3xl text-xl text-slate-400 leading-relaxed">
          Learn by running. Every orchestration pattern, protocol, and cross-stack scenario —
          TypeScript, Python, and Java — live in a BPMN-style studio with real traces, model routing,
          loop detection, and RAG. Built for the 2026 agentic stack.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/studio"
            className="rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
          >
            Open Studio →
          </Link>
          <Link
            href="/labs/foundations/chat"
            className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-slate-200 hover:bg-white/10 transition-all"
          >
            Start First Lab
          </Link>
          <a
            href="https://github.com/ShishirRao/agentic-ai-lab"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-slate-200 hover:bg-white/10 transition-all"
          >
            ⭐ Star on GitHub
          </a>
        </div>

        {/* Animated agent graph */}
        <div className="mt-16">
          <AgentGraphHero />
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-white/2 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { value: "30+", label: "Orchestration patterns" },
              { value: "3",   label: "Language stacks (TS · Py · Java)" },
              { value: "7",   label: "Protocols (MCP · A2A · AG-UI · more)" },
              { value: "15+", label: "Runnable labs in the Studio" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-bold text-white">{value}</div>
                <div className="mt-1 text-sm text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Learning tracks ───────────────────────────────────────────────── */}
      <section id="curriculum" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-400">Curriculum</div>
        <h2 className="text-4xl font-bold text-white">Three learning tracks</h2>
        <p className="mt-3 text-lg text-slate-400">
          Progress from first API call to cross-stack, cross-protocol production agent systems.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <TrackCard
            emoji="🌱"
            title="Beginner"
            subtitle="Get agents working fast"
            color="emerald"
            modules={[
              "Chat completions & streaming",
              "Client zoo — 6 ways to call the same API",
              "Structured outputs (Zod, Pydantic, Records)",
              "Naive RAG with pgvector",
              "Function / tool calling basics",
            ]}
            cta={{ label: "Start here →", href: "/labs/foundations/chat" }}
          />
          <TrackCard
            emoji="🚀"
            title="Practitioner"
            subtitle="Build real agent systems"
            color="blue"
            modules={[
              "MCP Servers — Streamable HTTP, tools, resources",
              "Agentic RAG (Self-RAG + Corrective RAG)",
              "All orchestration patterns — live canvas",
              "Observability · Model routing · Loop detection",
              "PII redaction · Guardrails · Prompt-injection defense",
            ]}
            cta={{ label: "Explore patterns →", href: "/labs/patterns" }}
            featured
          />
          <TrackCard
            emoji="🏗️"
            title="Architect"
            subtitle="Cross-stack, cross-protocol"
            color="purple"
            modules={[
              "A2A v1.0 — cross-stack agent calls",
              "AG-UI · A2UI · AP2 · WebMCP protocols",
              "Embabel GOAP + Google ADK 2.0 (Java)",
              "TS supervisor → Py researcher → Java planner",
              "Agent evals · Memory · Durable agents",
            ]}
            cta={{ label: "Explore interop →", href: "/labs/interop" }}
          />
        </div>
      </section>

      {/* ── Module grid ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <ModuleGrid />
      </section>

      {/* ── Protocol stack ────────────────────────────────────────────────── */}
      <section id="protocols" className="border-t border-white/5 bg-white/2 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-purple-400">2026 Protocol Stack</div>
          <h2 className="text-4xl font-bold text-white">Every agent protocol, taught and demonstrated</h2>
          <p className="mt-3 text-lg text-slate-400">
            The agentic ecosystem now has 7 standardised protocols. This repo covers all of them.
          </p>
          <div className="mt-12">
            <ProtocolStack />
          </div>
        </div>
      </section>

      {/* ── Tech stack ────────────────────────────────────────────────────── */}
      <section id="stack" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-emerald-400">Tech Stack</div>
        <h2 className="text-4xl font-bold text-white">Built on the best of 2026</h2>
        <p className="mt-3 text-lg text-slate-400">
          Every framework, platform, and tool chosen to represent what production teams are using today.
        </p>
        <div className="mt-12">
          <TechStack />
        </div>
      </section>

      {/* ── Quickstart ────────────────────────────────────────────────────── */}
      <section id="quickstart" className="border-t border-white/5 bg-white/2 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 text-sm font-semibold uppercase tracking-widest text-blue-400">Quickstart</div>
          <h2 className="text-4xl font-bold text-white">Running in under 5 minutes</h2>
          <p className="mt-3 text-lg text-slate-400">
            One Groq key and a free Supabase project is all you need. Java agents are optional.
          </p>
          <div className="mt-10">
            <QuickStart />
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-12">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-slate-400 text-sm">
            MIT License · Built by{" "}
            <a href="https://linkedin.com/in/shishir-rao" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
              Shishir Rao
            </a>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <a href="/studio" className="hover:text-slate-300 transition-colors">Studio</a>
            <a href="/labs/foundations/chat" className="hover:text-slate-300 transition-colors">Labs</a>
            <a href="https://github.com/ShishirRao/agentic-ai-lab" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
