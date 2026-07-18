/**
 * Client 1: Raw fetch + manual SSE parsing
 *
 * The lowest-level way to call a chat completion API.
 * No SDK — just fetch and TextDecoder.
 *
 * Teaching: understanding what SDKs do under the hood.
 *
 * Run:  GROQ_API_KEY=... npx tsx 01-raw-fetch.ts
 */

const BASE_URL = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
const API_KEY  = process.env.GROQ_API_KEY ?? "";
const MODEL    = process.env.GROQ_MODEL_LARGE ?? "openai/gpt-oss-120b";

const QUESTION = "What is the difference between Agentic RAG and Naive RAG? Explain in 3 bullet points.";

async function chat(stream: boolean) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      Authorization:   `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      stream,
      messages: [
        { role: "system",  content: "You are a concise AI assistant." },
        { role: "user",    content: QUESTION },
      ],
    }),
  });

  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`);

  if (!stream) {
    const data = await res.json() as any;
    console.log("[non-stream] Answer:", data.choices[0].message.content);
    console.log("[non-stream] Tokens:", data.usage);
    return;
  }

  // ── SSE streaming ───────────────────────────────────────────────────────
  const reader  = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  process.stdout.write("[stream] ");

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE lines
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";          // keep incomplete line

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") { process.stdout.write("\n"); return; }

      const chunk = JSON.parse(payload);
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) process.stdout.write(delta);
    }
  }
}

// Non-streaming first, then streaming
await chat(false);
console.log("\n");
await chat(true);
