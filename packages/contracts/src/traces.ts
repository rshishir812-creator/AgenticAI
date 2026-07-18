/**
 * Trace / Span schema — OpenTelemetry GenAI semantic conventions
 *
 * Spec: https://opentelemetry.io/docs/specs/semconv/gen-ai/
 * Every span is stored in Supabase `traces` table.
 * The Studio Observability panel reads spans grouped by runId.
 */

import { z } from "zod";

export const SpanKind = z.enum(["agent", "llm", "tool", "retrieval", "rerank", "embed"]);

export const GenAiSpan = z.object({
  spanId: z.string(),
  parentSpanId: z.string().nullable(),
  runId: z.string(),
  traceId: z.string(),
  name: z.string(),
  kind: SpanKind,
  startTimeMs: z.number(),
  endTimeMs: z.number().nullable(),
  status: z.enum(["ok", "error", "unset"]).default("unset"),
  errorMessage: z.string().optional(),

  // GenAI semantic conventions
  genai: z.object({
    system: z.string().optional(),                 // "groq", "openai", etc.
    model: z.string().optional(),                  // "openai/gpt-oss-120b"
    operation: z.string().optional(),              // "chat", "embeddings", etc.
    inputTokens: z.number().optional(),
    outputTokens: z.number().optional(),
    totalTokens: z.number().optional(),
    promptMessages: z.array(z.unknown()).optional(),
    responseContent: z.string().optional(),
    finishReason: z.string().optional(),
  }).optional(),

  // Tool-specific
  tool: z.object({
    name: z.string(),
    serverName: z.string().optional(),
    inputArgs: z.unknown().optional(),
    outputResult: z.unknown().optional(),
  }).optional(),

  // Loop detection flags
  loopDetected: z.boolean().optional(),
  stepBudgetExceeded: z.boolean().optional(),
  tokenBudgetExceeded: z.boolean().optional(),

  // Model routing decision
  routing: z.object({
    selectedModel: z.string(),
    reason: z.string(),
    complexityScore: z.number(),
  }).optional(),

  // Redaction flags
  redacted: z.boolean().optional(),
  redactedFields: z.array(z.string()).optional(),

  attributes: z.record(z.unknown()).optional(),
});

export type GenAiSpan = z.infer<typeof GenAiSpan>;
export type SpanKind = z.infer<typeof SpanKind>;
