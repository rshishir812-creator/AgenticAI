"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";

export function EndNode({ data }: NodeProps) {
  return (
    <div className="w-14 h-14 rounded-full border-2 border-red-500 bg-red-500/20 flex items-center justify-center">
      <span className="text-red-300 text-xs font-bold">END</span>
      <Handle type="target" position={Position.Left} style={{ background: "#ef4444" }} />
    </div>
  );
}
