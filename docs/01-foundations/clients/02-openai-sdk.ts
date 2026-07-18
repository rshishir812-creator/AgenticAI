/**
 * Client 2: OpenAI Node.js SDK pointed at Groq
 *
 * The most common client. Change only the baseURL + apiKey
 * and everything else works identically — this is the power of
 * OpenAI-compatibility.
 *
 * Run:  GROQ_API_KEY=... npx tsx 02-openai-sdk.ts
 * Deps: npm install openai
 */

import OpenAI from "openai";

const client = new OpenAI({
  apiKey:  process.env.GROQ_API_KEY,
  baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
});

const MODEL    = process.env.GROQ_MODEL_LARGE ?? "openai/gpt-oss-120b";
const QUESTION = "Explain the A2A v1.0 protocol in 3 bullet points.";

// ── Non-streaming ─────────────────────────────────────────────────────────
const completion = await client.chat.completions.create({
  model: MODEL,
  messages: [
    { role: "system", content: "You are a concise AI assistant." },
    { role: "user",   content: QUESTION },
  ],
});
console.log("[openai-sdk non-stream]", completion.choices[0].message.content);
console.log("[openai-sdk non-stream] usage:", completion.usage);

// ── Streaming ─────────────────────────────────────────────────────────────
const stream = await client.chat.completions.create({
  model: MODEL,
  stream: true,
  messages: [
    { role: "system", content: "You are a concise AI assistant." },
    { role: "user",   content: QUESTION },
  ],
});

process.stdout.write("\n[openai-sdk stream] ");
for await (const chunk of stream) {
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);
}
process.stdout.write("\n");

// ── Structured output (JSON) ──────────────────────────────────────────────
const structured = await client.chat.completions.create({
  model: MODEL,
  response_format: { type: "json_object" },
  messages: [
    { role: "system", content: "Return JSON: {\"protocols\": [\"...\", \"...\", \"...\"]}" },
    { role: "user",   content: "List the 3 most important 2026 agent protocols." },
  ],
});
const json = JSON.parse(structured.choices[0].message.content!);
console.log("\n[openai-sdk structured]", json);
