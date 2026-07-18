"use client";

/**
 * BPMN-style Studio Canvas
 *
 * Built on React Flow (xyflow). Custom node types mimic BPMN notation:
 *   AgentNode      — rounded rectangle (blue)    → LLM-calling step
 *   ToolNode       — hexagonal (purple)           → MCP tool invocation
 *   GatewayNode    — diamond (yellow)             → conditional routing
 *   HumanNode      — rounded rect w/ person icon  → human-in-the-loop
 *   StartNode      — green circle                 → graph start
 *   EndNode        — red circle                   → graph end
 *
 * The canvas loads graph definitions from /api/graphs/[id] and streams
 * AG-UI events from /api/run to animate edges and highlight active nodes
 * in real time.
 */

import { useCallback, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { AgentNode }  from "./nodes/AgentNode";
import { ToolNode }   from "./nodes/ToolNode";
import { GatewayNode }from "./nodes/GatewayNode";
import { HumanNode }  from "./nodes/HumanNode";
import { StartNode }  from "./nodes/StartNode";
import { EndNode }    from "./nodes/EndNode";
import { GraphSelector } from "./GraphSelector";
import { RunPanel }      from "./RunPanel";
import { TracePanel }    from "./TracePanel";

const nodeTypes = {
  agentNode:   AgentNode,
  toolNode:    ToolNode,
  gatewayNode: GatewayNode,
  humanNode:   HumanNode,
  startNode:   StartNode,
  endNode:     EndNode,
};

// ── Agentic RAG demo graph ────────────────────────────────────────────────

const DEMO_NODES: Node[] = [
  { id: "start",         type: "startNode",   position: { x: 80,  y: 180 }, data: { label: "Start" } },
  { id: "query_rewrite", type: "agentNode",   position: { x: 200, y: 155 }, data: { label: "Query Rewrite", model: "gpt-oss-20b", description: "Optimise query for vector DB retrieval" } },
  { id: "retrieve",      type: "toolNode",    position: { x: 380, y: 155 }, data: { label: "Retrieve", tool: "match_documents", server: "Supabase pgvector" } },
  { id: "grade_docs",    type: "agentNode",   position: { x: 560, y: 155 }, data: { label: "Grade Docs", model: "gpt-oss-20b", description: "Are retrieved docs relevant?" } },
  { id: "gateway",       type: "gatewayNode", position: { x: 730, y: 155 }, data: { label: "Relevant?" } },
  { id: "generate",      type: "agentNode",   position: { x: 880, y: 100 }, data: { label: "Generate", model: "gpt-oss-120b", description: "Answer using context docs" } },
  { id: "grade_answer",  type: "agentNode",   position: { x: 1060, y: 100 }, data: { label: "Grade Answer", model: "gpt-oss-20b", description: "Is answer grounded?" } },
  { id: "end",           type: "endNode",     position: { x: 1240, y: 100 }, data: { label: "End" } },
  // Corrective RAG path
  { id: "web_fallback",  type: "toolNode",    position: { x: 880, y: 230 }, data: { label: "Web Fallback", tool: "web_search", server: "External" } },
];

const DEMO_EDGES: Edge[] = [
  { id: "e1", source: "start",        target: "query_rewrite", animated: false, style: { stroke: "#3b82f6" } },
  { id: "e2", source: "query_rewrite",target: "retrieve",      animated: false, style: { stroke: "#8b5cf6" } },
  { id: "e3", source: "retrieve",     target: "grade_docs",    animated: false, style: { stroke: "#8b5cf6" } },
  { id: "e4", source: "grade_docs",   target: "gateway",       animated: false, style: { stroke: "#f59e0b" } },
  { id: "e5", source: "gateway",      target: "generate",      animated: false, label: "relevant", style: { stroke: "#10b981" } },
  { id: "e6", source: "gateway",      target: "web_fallback",  animated: false, label: "irrelevant", style: { stroke: "#ef4444" }, type: "step" },
  { id: "e7", source: "generate",     target: "grade_answer",  animated: false, style: { stroke: "#3b82f6" } },
  { id: "e8", source: "grade_answer", target: "end",           animated: false, label: "grounded", style: { stroke: "#10b981" } },
  { id: "e9", source: "grade_answer", target: "generate",      animated: false, label: "retry", type: "step", style: { stroke: "#f59e0b", strokeDasharray: "5 5" } },
  { id: "e10",source: "web_fallback", target: "generate",      animated: false, style: { stroke: "#8b5cf6" } },
];

export function StudioCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(DEMO_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(DEMO_EDGES);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isRunning, setIsRunning]       = useState(false);
  const [traces, setTraces]             = useState<any[]>([]);
  const [panelTab, setPanelTab]         = useState<"run" | "traces">("run");

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Highlight a node as "active" during a run
  const activateNode = useCallback((id: string | null) => {
    setActiveNodeId(id);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, active: n.id === id },
      }))
    );
  }, [setNodes]);

  // Animate edges when active
  const animateEdgesFrom = useCallback((nodeId: string) => {
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        animated: e.source === nodeId,
      }))
    );
  }, [setEdges]);

  return (
    <div className="flex h-full">
      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          className="bg-slate-950"
          deleteKeyCode={null}
        >
          <Background color="#1e293b" gap={20} />
          <Controls className="fill-slate-400" />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === "startNode") return "#10b981";
              if (n.type === "endNode")   return "#ef4444";
              if (n.type === "toolNode")  return "#8b5cf6";
              if (n.type === "gatewayNode") return "#f59e0b";
              if (n.type === "humanNode") return "#f97316";
              return "#3b82f6";
            }}
            bgColor="#0f172a"
            maskColor="rgba(0,0,0,0.4)"
          />
        </ReactFlow>

        {/* Graph selector overlay */}
        <div className="absolute top-3 left-3">
          <GraphSelector />
        </div>
      </div>

      {/* Right panel */}
      <div className="w-80 border-l border-white/5 flex flex-col bg-slate-900/50 shrink-0">
        {/* Panel tabs */}
        <div className="flex border-b border-white/5">
          {(["run", "traces"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setPanelTab(tab)}
              className={`flex-1 py-3 text-xs font-semibold capitalize transition-colors ${
                panelTab === tab
                  ? "border-b-2 border-blue-500 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab === "run" ? "▶ Run" : "📊 Traces"}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {panelTab === "run" ? (
            <RunPanel
              isRunning={isRunning}
              onRunStart={() => { setIsRunning(true); setPanelTab("traces"); }}
              onRunEnd={() => setIsRunning(false)}
              onStepChange={activateNode}
              onEdgeAnimate={animateEdgesFrom}
              onTrace={(span) => setTraces((t) => [span, ...t])}
            />
          ) : (
            <TracePanel traces={traces} />
          )}
        </div>
      </div>
    </div>
  );
}
