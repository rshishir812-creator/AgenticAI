"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface AgentNodeData {
  label: string;
  model?: string;
  description?: string;
  active?: boolean;
}

export function AgentNode({ data }: NodeProps) {
  const d = data as unknown as AgentNodeData;
  return (
    <div
      className={`rounded-xl border px-4 py-3 min-w-[140px] text-center transition-all duration-300 ${
        d.active
          ? "border-blue-400 bg-blue-600/25 shadow-lg shadow-blue-500/30 scale-105"
          : "border-blue-500/40 bg-blue-600/10 hover:border-blue-500/70"
      }`}
    >
      <Handle type="target" position={Position.Left}  style={{ background: "#3b82f6" }} />
      <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-1">Agent</div>
      <div className="text-sm font-semibold text-white">{d.label}</div>
      {d.model && (
        <div className="mt-1 text-xs text-blue-400/70 font-mono">{d.model}</div>
      )}
      {d.description && (
        <div className="mt-1.5 text-xs text-slate-400 leading-tight">{d.description}</div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: "#3b82f6" }} />
    </div>
  );
}
