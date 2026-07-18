/**
 * /api/rag/ingest — Document ingestion for RAG
 *
 * 1. Accept text or URL
 * 2. Chunk using simple paragraph-based splitting
 * 3. Embed with all-mpnet-base-v2 via @huggingface/transformers (no API key needed)
 * 4. Upsert into Supabase `documents` table with pgvector embedding (768 dims)
 *
 * Teaching: Lab 1.4 — naive RAG ingestion pipeline.
 * Model downloads once (~420 MB) then stays cached in ~/.cache/huggingface.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { embed } from "@/lib/embeddings";

export const runtime = "nodejs";

function chunkText(text: string, chunkSize = 800, overlap = 100): string[] {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + para).length > chunkSize && current) {
      chunks.push(current.trim());
      current = current.slice(-overlap) + "\n\n" + para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export async function POST(req: NextRequest) {
  const { text, source, metadata = {} } = await req.json();

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const db = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const chunks = chunkText(text);

  const rows = await Promise.all(
    chunks.map(async (chunk, i) => {
      const embedding = await embed(chunk);
      return {
        content: chunk,
        embedding,
        source: source ?? null,
        metadata: { ...metadata, chunk_index: i, total_chunks: chunks.length },
      };
    })
  );

  const { error } = await db.from("documents").insert(rows);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    chunksIngested: chunks.length,
    chunksEmbedded: chunks.length,
    model: process.env.EMBEDDING_MODEL ?? "Xenova/all-mpnet-base-v2",
    dims: 768,
  });
}
