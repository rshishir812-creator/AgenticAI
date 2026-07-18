"use client";

interface TracePanelProps {
  traces: any[];
}

function eventColor(type: string): string {
  if (type === "run_started")      return "text-emerald-400";
  if (type === "run_finished")     return "text-emerald-300";
  if (type === "step_started")     return "text-blue-400";
  if (type === "step_finished")    return "text-blue-300";
  if (type === "tool_call_started")return "text-purple-400";
  if (type === "tool_call_finished")return "text-purple-300";
  if (type === "error")            return "text-red-400";
  if (type === "human_interrupt")  return "text-orange-400";
  return "text-slate-400";
}

function eventIcon(type: string): string {
  if (type.includes("run"))    return "●";
  if (type.includes("tool"))   return "🔌";
  if (type.includes("step"))   return "→";
  if (type === "error")        return "✗";
  if (type.includes("human"))  return "👤";
  return "·";
}

export function TracePanel({ traces }: TracePanelProps) {
  if (!traces.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <div className="text-3xl mb-3">📊</div>
        <div className="text-sm font-semibold text-slate-300">No traces yet</div>
        <div className="mt-1 text-xs text-slate-500">
          Run an agent to see live AG-UI events and OTel spans here.
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-1 font-mono text-xs">
      <div className="text-slate-500 text-xs mb-3 px-1">
        {traces.length} events — AG-UI event stream
      </div>
      {traces.map((e, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded px-2 py-1.5 hover:bg-slate-800/50 transition-colors"
        >
          <span className={`shrink-0 ${eventColor(e.type)}`}>{eventIcon(e.type)}</span>
          <div className="flex-1 min-w-0">
            <span className={`font-semibold ${eventColor(e.type)}`}>{e.type}</span>
            {e.nodeName && <span className="text-slate-500"> · {e.nodeName}</span>}
            {e.outputPreview && (
              <div className="mt-0.5 text-slate-400 truncate">{e.outputPreview}</div>
            )}
            {e.message && (
              <div className="mt-0.5 text-red-300 truncate">{e.message}</div>
            )}
          </div>
          <span className="text-slate-600 shrink-0 text-xs">
            {e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour12: false, second: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
