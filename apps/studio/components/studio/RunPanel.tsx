"use client";
import { useState } from "react";

interface RunPanelProps {
  isRunning: boolean;
  onRunStart: () => void;
  onRunEnd: () => void;
  onStepChange: (nodeId: string | null) => void;
  onEdgeAnimate: (nodeId: string) => void;
  onTrace: (span: any) => void;
}

export function RunPanel({ isRunning, onRunStart, onRunEnd, onStepChange, onEdgeAnimate, onTrace }: RunPanelProps) {
  const [question, setQuestion] = useState("");
  const [output, setOutput]     = useState<string[]>([]);
  const [error, setError]       = useState<string | null>(null);

  async function handleRun() {
    if (!question.trim() || isRunning) return;
    setOutput([]);
    setError(null);
    onRunStart();

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "langgraph-ts:agentic-rag", input: question }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const dec    = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = dec.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "step_started")   { onStepChange(event.nodeName); onEdgeAnimate(event.nodeName); }
            if (event.type === "step_finished")  { setOutput((o) => [...o, `✓ ${event.nodeName}: ${event.outputPreview ?? ""}`]); }
            if (event.type === "run_finished")   { onStepChange(null); onRunEnd(); }
            if (event.type === "error")          { setError(event.message); onRunEnd(); }
            if (event.type === "text_delta")     { /* handled by streaming if enabled */ }
            onTrace(event);
          } catch { /* malformed line */ }
        }
      }
    } catch (err) {
      setError(String(err));
      onRunEnd();
    }
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div>
        <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
          Question / Input
        </label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What is Agentic RAG and how does it differ from naive RAG?"
          className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 h-24"
          disabled={isRunning}
        />
      </div>

      <button
        onClick={handleRun}
        disabled={!question.trim() || isRunning}
        className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        {isRunning ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Running…
          </span>
        ) : "▶ Run Agent"}
      </button>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {output.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Steps</div>
          {output.map((line, i) => (
            <div key={i} className="text-xs text-slate-300 font-mono bg-slate-800/60 rounded px-2 py-1">
              {line}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/5 bg-slate-800/30 p-3 text-xs text-slate-500 space-y-1">
        <div className="font-semibold text-slate-400">How this works</div>
        <p>The Run button calls <code className="text-blue-300">/api/run</code> which streams AG-UI events.
        Each event updates the canvas in real time — active nodes glow, edges animate, traces accumulate.</p>
      </div>
    </div>
  );
}
