/**
 * AG-UI Event Protocol
 *
 * AG-UI standardises how an agent's real-time output (text tokens, tool calls,
 * state mutations, lifecycle signals) streams to a frontend.
 *
 * Spec: https://docs.ag-ui.com/agentic-protocols
 * Every agent backend in this repo emits these events over a streaming HTTP
 * response (text/event-stream).  The Studio canvas subscribes and renders them.
 */

import { z } from "zod";

// ── Lifecycle ──────────────────────────────────────────────────────────────

export const RunStartedEvent = z.object({
  type: z.literal("run_started"),
  runId: z.string(),
  agentId: z.string(),
  input: z.unknown(),
  timestamp: z.string().datetime(),
});

export const RunFinishedEvent = z.object({
  type: z.literal("run_finished"),
  runId: z.string(),
  status: z.enum(["success", "error", "interrupted"]),
  durationMs: z.number(),
  totalTokens: z.number().optional(),
  timestamp: z.string().datetime(),
});

export const StepStartedEvent = z.object({
  type: z.literal("step_started"),
  runId: z.string(),
  stepId: z.string(),
  nodeName: z.string(),
  timestamp: z.string().datetime(),
});

export const StepFinishedEvent = z.object({
  type: z.literal("step_finished"),
  runId: z.string(),
  stepId: z.string(),
  nodeName: z.string(),
  outputPreview: z.string().optional(),
  timestamp: z.string().datetime(),
});

// ── Text streaming ─────────────────────────────────────────────────────────

export const TextDeltaEvent = z.object({
  type: z.literal("text_delta"),
  runId: z.string(),
  stepId: z.string(),
  delta: z.string(),
  timestamp: z.string().datetime(),
});

// ── Tool / MCP calls ───────────────────────────────────────────────────────

export const ToolCallStartedEvent = z.object({
  type: z.literal("tool_call_started"),
  runId: z.string(),
  stepId: z.string(),
  toolCallId: z.string(),
  toolName: z.string(),
  serverName: z.string().optional(),
  args: z.unknown(),
  timestamp: z.string().datetime(),
});

export const ToolCallFinishedEvent = z.object({
  type: z.literal("tool_call_finished"),
  runId: z.string(),
  stepId: z.string(),
  toolCallId: z.string(),
  toolName: z.string(),
  result: z.unknown(),
  errorMessage: z.string().optional(),
  timestamp: z.string().datetime(),
});

// ── State / graph ─────────────────────────────────────────────────────────

export const StateSnapshotEvent = z.object({
  type: z.literal("state_snapshot"),
  runId: z.string(),
  state: z.record(z.unknown()),
  activeNodes: z.array(z.string()),
  timestamp: z.string().datetime(),
});

// ── Human-in-the-loop (interrupt) ─────────────────────────────────────────

export const HumanInterruptEvent = z.object({
  type: z.literal("human_interrupt"),
  runId: z.string(),
  stepId: z.string(),
  question: z.string(),
  options: z.array(z.string()).optional(),
  timestamp: z.string().datetime(),
});

export const HumanResponseEvent = z.object({
  type: z.literal("human_response"),
  runId: z.string(),
  stepId: z.string(),
  response: z.string(),
  timestamp: z.string().datetime(),
});

// ── Error ─────────────────────────────────────────────────────────────────

export const ErrorEvent = z.object({
  type: z.literal("error"),
  runId: z.string(),
  code: z.string(),
  message: z.string(),
  loopDetected: z.boolean().optional(),
  timestamp: z.string().datetime(),
});

// ── Union ─────────────────────────────────────────────────────────────────

export const AgUiEvent = z.discriminatedUnion("type", [
  RunStartedEvent,
  RunFinishedEvent,
  StepStartedEvent,
  StepFinishedEvent,
  TextDeltaEvent,
  ToolCallStartedEvent,
  ToolCallFinishedEvent,
  StateSnapshotEvent,
  HumanInterruptEvent,
  HumanResponseEvent,
  ErrorEvent,
]);

export type AgUiEvent = z.infer<typeof AgUiEvent>;
export type RunStartedEvent = z.infer<typeof RunStartedEvent>;
export type RunFinishedEvent = z.infer<typeof RunFinishedEvent>;
export type StepStartedEvent = z.infer<typeof StepStartedEvent>;
export type StepFinishedEvent = z.infer<typeof StepFinishedEvent>;
export type TextDeltaEvent = z.infer<typeof TextDeltaEvent>;
export type ToolCallStartedEvent = z.infer<typeof ToolCallStartedEvent>;
export type ToolCallFinishedEvent = z.infer<typeof ToolCallFinishedEvent>;
export type StateSnapshotEvent = z.infer<typeof StateSnapshotEvent>;
export type HumanInterruptEvent = z.infer<typeof HumanInterruptEvent>;
export type ErrorEvent = z.infer<typeof ErrorEvent>;

export function serializeAgUiEvent(event: AgUiEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}
