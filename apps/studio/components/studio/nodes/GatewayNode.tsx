"use client";
import { Handle, Position, type NodeProps } from "@xyflow/react";

interface GatewayNodeData {
  label: string;
  active?: boolean;
}

export function GatewayNode({ data }: NodeProps) {
  const d = data as unknown as GatewayNodeData;
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <Handle type="target" position={Position.Left}   style={{ background: "#f59e0b", left: 0 }} />
      {/* Diamond shape via CSS rotate */}
      <div
        className={`absolute inset-2 rotate-45 border-2 transition-all duration-300 ${
          d.active
            ? "border-yellow-400 bg-yellow-500/30 shadow-lg shadow-yellow-500/30"
            : "border-yellow-500/60 bg-yellow-500/10"
        }`}
      />
      <div className="relative z-10 text-center px-1">
        <div className="text-xs font-bold text-yellow-300 leading-tight text-center">
          {d.label}
        </div>
      </div>
      <Handle type="source" position={Position.Right}  style={{ background: "#f59e0b", right: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#f59e0b", bottom: 0 }} id="b" />
    </div>
  );
}
