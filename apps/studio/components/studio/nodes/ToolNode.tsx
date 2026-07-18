"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface ToolNodeData {
  label: string;
  tool?: string;
  server?: string;
  active?: boolean;
}

export function ToolNode({ data }: NodeProps) {
  const d = data as unknown as ToolNodeData;
  return (
    <div
      className={`rounded-xl border px-4 py-3 min-w-[140px] text-center transition-all duration-300 ${
        d.active
          ? "border-purple-400 bg-purple-600/25 shadow-lg shadow-purple-500/30 scale-105"
          : "border-purple-500/40 bg-purple-600/10 hover:border-purple-500/70"
      }`}
    >
      <Handle type="target" position={Position.Left}  style={{ background: "#8b5cf6" }} />
      <div className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">🔌 MCP Tool</div>
      <div className="text-sm font-semibold text-white">{d.label}</div>
      {d.tool && (
        <div className="mt-1 text-xs text-purple-400/70 font-mono">{d.tool}</div>
      )}
      {d.server && (
        <div className="mt-1 text-xs text-slate-400">{d.server}</div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: "#8b5cf6" }} />
    </div>
  );
}
