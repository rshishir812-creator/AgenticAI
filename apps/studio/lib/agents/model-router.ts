import OpenAI from "openai";

export type ModelTier = "small" | "large" | "vision";

export interface RoutingDecision {
  tier: ModelTier;
  model: string;
  reason: string;
  complexityScore: number;
}

const MODELS: Record<ModelTier, string> = {
  small:  process.env.GROQ_MODEL_SMALL  ?? "openai/gpt-oss-20b",
  large:  process.env.GROQ_MODEL_LARGE  ?? "openai/gpt-oss-120b",
  vision: process.env.GROQ_MODEL_VISION ?? "qwen/qwen3.6-27b",
};

const CLASSIFIER_PROMPT = `Rate this task complexity 0.0–1.0 and respond with only JSON: {"score": <0.0-1.0>, "reason": "<15 words max>"}
0.0–0.3: simple lookup/short answer. 0.3–0.6: multi-step. 0.6–1.0: complex reasoning/agents.`;

export async function routeRequest(userMessage: string): Promise<RoutingDecision> {
  try {
    const client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1" });
    const resp = await client.chat.completions.create({
      model: MODELS.small,
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
    return { tier: "large", model: MODELS.large, reason: "routing error — fallback", complexityScore: 0.9 };
  }
}

export { MODELS };
