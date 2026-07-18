import { StudioCanvas } from "@/components/studio/StudioCanvas";
import Link from "next/link";

export const metadata = {
  title: "Studio — Agentic AI Lab",
  description: "BPMN-style canvas to visualise and run any agent orchestration — live traces, AG-UI event streaming, model routing and loop detection.",
};

export default function StudioPage() {
  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
            ← Home
          </Link>
          <span className="text-slate-700">|</span>
          <span className="font-semibold text-white text-sm">
            <span className="text-blue-400">Agentic</span> Studio
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live — AG-UI event stream active
        </div>
      </header>

      {/* Canvas — takes remaining height */}
      <div className="flex-1 overflow-hidden">
        <StudioCanvas />
      </div>
    </div>
  );
}
