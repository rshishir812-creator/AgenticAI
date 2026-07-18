/**
 * /api/chat — Chat completion proxy to Groq
 *
 * Supports both streaming and non-streaming modes.
 * Uses the Vercel AI SDK for streaming responses.
 *
 * Teaching: this is Lab 1.1 — the simplest possible agent endpoint.
 * Students can hit this directly with curl, Postman, or the labs UI.
 */

import { createGroq } from "@ai-sdk/groq";
import { streamText, generateText } from "ai";

const groq = createGroq({
  apiKey:  process.env.GROQ_API_KEY ?? "",
  baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
});

export const runtime = "edge";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, model, stream = true } = await req.json();

  const resolvedModel = model ?? process.env.GROQ_MODEL_LARGE ?? "openai/gpt-oss-120b";

  if (stream) {
    const result = streamText({
      model: groq(resolvedModel),
      messages,
      maxOutputTokens: 4096,
      system: "You are a helpful AI assistant. Be concise and accurate.",
    });
    return result.toTextStreamResponse();
  } else {
    const result = await generateText({
      model: groq(resolvedModel),
      messages,
      maxOutputTokens: 4096,
    });
    return Response.json({ content: result.text, usage: result.usage });
  }
}
