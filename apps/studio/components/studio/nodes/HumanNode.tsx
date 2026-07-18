"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface HumanNodeData {
  label: string;
  question?: string;
  active?: boolean;
}

export function HumanNode({ data }: NodeProps) {
  const d = data as unknown as HumanNodeData;
  return (
    <div
      className={`rounded-xl border px-4 py-3 min-w-[140px] text-center transition-all duration-300 ${
        d.active
          ? "border-orange-400 bg-orange-600/25 shadow-lg shadow-orange-500/30 scale-105"
          : "border-orange-500/40 bg-orange-600/10 hover:border-orange-500/70"
      }`}
    >
      <Handle type="target" position={Position.Left}  style={{ background: "#f97316" }} />
      <div className="text-xs font-bold text-orange-300 uppercase tracking-wider mb-1">👤 Human</div>
      <div className="text-sm font-semibold text-white">{d.label}</div>
      {d.question && (
        <div className="mt-1.5 text-xs text-slate-400 leading-tight">{d.question}</div>
      )}
      <Handle type="source" position={Position.Right} style={{ background: "#f97316" }} />
    </div>
  );
}
