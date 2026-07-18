/**
 * Intelligent Model Router
 *
 * Classifies request complexity → routes to the right Groq model tier.
 * Teaching: intelligent routing is a key production pattern — saves cost
 * while preserving quality for hard tasks.
 *
 * Routing tiers (Groq, July 2026):
 *   SMALL  → openai/gpt-oss-20b   (fast, cheap — routing, classification, summarisation)
 *   LARGE  → openai/gpt-oss-120b  (powerful — multi-step reasoning, code, agents)
 *   VISION → qwen/qwen3.6-27b     (multimodal)
 */

import OpenAI from "openai";

export type ModelTier = "small" | "large" | "vision";

export interface RoutingDecision {
  tier: ModelTier;
  model: string;
  reason: string;
  complexityScore: number;   // 0–1
}

const MODELS: Record<ModelTier, string> = {
  small:  process.env.GROQ_MODEL_SMALL  ?? "openai/gpt-oss-20b",
  large:  process.env.GROQ_MODEL_LARGE  ?? "openai/gpt-oss-120b",
  vision: process.env.GROQ_MODEL_VISION ?? "qwen/qwen3.6-27b",
};

const client = new OpenAI({
  apiKey:  process.env.GROQ_API_KEY ?? "",
  baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
});

const CLASSIFIER_PROMPT = `You are a task complexity classifier for AI agent routing.
Rate the following user request on a complexity scale from 0.0 to 1.0:
- 0.0–0.3: Simple — short answer, basic lookup, one-step, no reasoning chain
- 0.3–0.6: Medium — multi-step, some reasoning, structured output
- 0.6–1.0: Complex — deep analysis, multi-hop, code generation, long context, agent tasks

Respond with ONLY a JSON object: {"score": <0.0-1.0>, "reason": "<15 words max>"}`;

export async function routeRequest(userMessage: string, hasImages = false): Promise<RoutingDecision> {
  if (hasImages) {
    return { tier: "vision", model: MODELS.vision, reason: "multimodal input", complexityScore: 0.7 };
  }

  try {
    const resp = await client.chat.completions.create({
      model: MODELS.small,   // always use small model for routing itself
      messages: [
        { role: "system", content: CLASSIFIER_PROMPT },
        { role: "user",   content: userMessage.slice(0, 500) },
      ],
      response_format: { type: "json_object" },
      max_tokens: 60,
      temperature: 0,
    });

    const { score, reason } = JSON.parse(resp.choices[0].message.content ?? "{}");
    const complexityScore = typeof score === "number" ? Math.max(0, Math.min(1, score)) : 0.5;
    const tier: ModelTier = complexityScore < 0.35 ? "small" : "large";

    return { tier, model: MODELS[tier], reason, complexityScore };
  } catch {
    // Fallback to large on any error — prefer capability over cost savings
    return { tier: "large", model: MODELS.large, reason: "routing error — fallback", complexityScore: 0.9 };
  }
}

export function createRoutedClient(decision: RoutingDecision): OpenAI {
  return new OpenAI({
    apiKey:  process.env.GROQ_API_KEY ?? "",
    baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
  });
}

export { MODELS };
