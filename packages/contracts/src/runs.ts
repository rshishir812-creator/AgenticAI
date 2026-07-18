import { z } from "zod";

export const AgentId = z.enum([
  "langgraph-ts:agentic-rag",
  "langgraph-ts:react",
  "langgraph-ts:supervisor",
  "langgraph-ts:deep-research",
  "langgraph-py:agentic-rag",
  "adk-py:workflow",
  "embabel-java:goap",
  "adk-java:a2a",
]);

export type AgentId = z.infer<typeof AgentId>;

export const RunRequest = z.object({
  agentId: AgentId,
  input: z.string(),
  config: z.object({
    threadId: z.string().optional(),
    maxSteps: z.number().int().min(1).max(100).default(25),
    maxTokens: z.number().int().default(50_000),
    streaming: z.boolean().default(true),
  }).default({}),
});

export type RunRequest = z.infer<typeof RunRequest>;

export const RunStatus = z.enum(["pending", "running", "success", "error", "interrupted"]);
export type RunStatus = z.infer<typeof RunStatus>;

export const Run = z.object({
  id: z.string(),
  agentId: AgentId,
  status: RunStatus,
  input: z.string(),
  output: z.string().nullable(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
  durationMs: z.number().nullable(),
  totalTokens: z.number().nullable(),
  estimatedCostUsd: z.number().nullable(),
  errorMessage: z.string().nullable(),
  threadId: z.string().nullable(),
});

export type Run = z.infer<typeof Run>;
