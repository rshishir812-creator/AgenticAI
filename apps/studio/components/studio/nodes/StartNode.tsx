"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export function StartNode({ data }: NodeProps) {
  return (
    <div className="w-14 h-14 rounded-full border-2 border-emerald-500 bg-emerald-500/20 flex items-center justify-center">
      <span className="text-emerald-300 text-xs font-bold">START</span>
      <Handle type="source" position={Position.Right} style={{ background: "#10b981" }} />
    </div>
  );
}
