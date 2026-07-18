/**
 * Client 3: Vercel AI SDK
 *
 * The Vercel AI SDK provides a unified interface for streaming text,
 * structured objects, and tool use — and integrates directly with
 * Next.js streaming responses (no manual SSE handling).
 *
 * Run:  GROQ_API_KEY=... npx tsx 03-vercel-ai-sdk.ts
 * Deps: npm install ai @ai-sdk/groq
 */

import { createGroq } from "@ai-sdk/groq";
import { streamText, generateText, generateObject } from "ai";
import { z } from "zod";

const groq = createGroq({
  apiKey:  process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
});

const model  = groq(process.env.GROQ_MODEL_LARGE ?? "openai/gpt-oss-120b");
const PROMPT = "Explain MCP elicitation in 2 sentences.";

// ── generateText (non-streaming) ──────────────────────────────────────────
const { text, usage } = await generateText({ model, prompt: PROMPT });
console.log("[vercel-ai-sdk] generateText:", text);
console.log("[vercel-ai-sdk] usage:", usage);

// ── streamText ────────────────────────────────────────────────────────────
const stream = streamText({ model, prompt: PROMPT });
process.stdout.write("\n[vercel-ai-sdk] streamText: ");
for await (const delta of stream.textStream) {
  process.stdout.write(delta);
}
process.stdout.write("\n");

// ── generateObject (structured output via Zod schema) ────────────────────
const { object } = await generateObject({
  model,
  schema: z.object({
    name:        z.string(),
    purpose:     z.string(),
    year:        z.number(),
    supporters:  z.array(z.string()),
  }),
  prompt: "Describe the A2A protocol as a JSON object.",
});
console.log("\n[vercel-ai-sdk] generateObject:", object);
