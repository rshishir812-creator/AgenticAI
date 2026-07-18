"use client";
import { useState } from "react";

const graphs = [
  { id: "agentic-rag",  label: "Agentic RAG",          stack: "TS", pattern: "Self-RAG + Corrective" },
  { id: "react",        label: "ReAct Agent",           stack: "TS", pattern: "Reason → Act → Observe" },
  { id: "supervisor",   label: "Supervisor + Workers",  stack: "TS", pattern: "Multi-agent" },
  { id: "evaluator",    label: "Evaluator–Optimizer",   stack: "TS", pattern: "Reflection loop" },
  { id: "parallelise",  label: "Parallelisation (Vote)",stack: "TS", pattern: "Fan-out + majority vote" },
  { id: "goap",         label: "Embabel GOAP",          stack: "Java", pattern: "Goal-Oriented Action Planning" },
  { id: "adk-workflow", label: "ADK 2.0 Workflow",      stack: "Py", pattern: "Graph-based runtime" },
];

export function GraphSelector() {
  const [open, setOpen]     = useState(false);
  const [selected, setSelected] = useState(graphs[0]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-slate-900/90 px-3 py-2 text-sm text-slate-300 hover:text-white backdrop-blur transition-all"
      >
        <span className="font-semibold">{selected.label}</span>
        <span className="text-xs text-slate-500">({selected.stack})</span>
        <span className="text-slate-500 ml-1">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 left-0 w-72 rounded-xl border border-white/10 bg-slate-900 shadow-xl overflow-hidden z-50">
          {graphs.map((g) => (
            <button
              key={g.id}
              onClick={() => { setSelected(g); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800 transition-colors ${
                selected.id === g.id ? "bg-blue-900/30" : ""
              }`}
            >
              <div>
                <div className="text-sm font-semibold text-white">{g.label}</div>
                <div className="text-xs text-slate-400">{g.pattern}</div>
              </div>
              <span className={`text-xs rounded px-1.5 py-0.5 font-mono ${
                g.stack === "TS"   ? "bg-blue-500/10 text-blue-300" :
                g.stack === "Py"   ? "bg-yellow-500/10 text-yellow-300" :
                                     "bg-orange-500/10 text-orange-300"
              }`}>
                {g.stack}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
