/**
 * /api/rag/query — Naive RAG query
 *
 * 1. Embed the question with all-mpnet-base-v2 (768 dims, no API key)
 * 2. Retrieve top-k chunks via pgvector cosine similarity or hybrid RRF search
 * 3. Generate answer with Groq
 * 4. Return answer + source chunks
 *
 * Teaching: Lab 1.4 — the simplest RAG pipeline.
 * Compare to /api/run (agentic-rag) which uses a full LangGraph StateGraph.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createGroq } from "@ai-sdk/groq";
import { generateText } from "ai";
import { embed } from "@/lib/embeddings";

export const runtime = "nodejs";

const groq = createGroq({
  apiKey:  process.env.GROQ_API_KEY ?? "",
  baseURL: process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
});

export async function POST(req: NextRequest) {
  const { question, k = 5, hybrid = false } = await req.json();
  if (!question) return NextResponse.json({ error: "question is required" }, { status: 400 });

  const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const embedding = await embed(question);

  let docs: any[] = [];
  if (hybrid) {
    const { data, error } = await db.rpc("hybrid_search", {
      query_text: question,
      query_embedding: embedding,
      match_count: k,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    docs = data ?? [];
  } else {
    const { data, error } = await db.rpc("match_documents", {
      query_embedding: embedding,
      match_threshold: 0.2,   // MPNet cosine sims run lower than OpenAI's; 0.2 is a sane floor
      match_count: k,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    docs = data ?? [];
  }

  if (!docs.length) {
    return NextResponse.json({
      answer: "I couldn't find relevant documents to answer your question.",
      sources: [],
      retrievalMethod: hybrid ? "hybrid (vector + keyword)" : "vector (cosine)",
    });
  }

  const context = docs.map((d, i) => `[${i + 1}] ${d.content}`).join("\n\n---\n\n");

  const { text: answer } = await generateText({
    model: groq(process.env.GROQ_MODEL_LARGE ?? "openai/gpt-oss-120b"),
    system: `You are a helpful assistant. Use only the provided context documents to answer the question.
If the context doesn't answer the question, say so clearly.
Context:
${context}`,
    prompt: question,
    maxOutputTokens: 1024,
  });

  return NextResponse.json({
    answer,
    sources: docs.map((d) => ({ id: d.id, source: d.source, preview: d.content.slice(0, 150) })),
    retrievalMethod: hybrid ? "hybrid (vector + keyword)" : "vector (cosine)",
    embeddingModel: process.env.EMBEDDING_MODEL ?? "Xenova/all-mpnet-base-v2",
  });
}
