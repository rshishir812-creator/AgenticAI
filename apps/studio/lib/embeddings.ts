/**
 * Local embeddings via @huggingface/transformers (ONNX runtime, no API key).
 * Model: sentence-transformers/all-mpnet-base-v2 → 768-dim vectors.
 *
 * First call downloads ~420 MB model to ~/.cache/huggingface (cached forever).
 * Subsequent calls are fast (model stays in memory for the process lifetime).
 *
 * Teaching note: This is "Option B" — zero external dependencies, perfect for
 * local dev and teaching. For production at scale, swap EMBEDDING_PROVIDER=openai.
 */

import type { FeatureExtractionPipeline } from "@huggingface/transformers";

const MODEL = process.env.EMBEDDING_MODEL ?? "Xenova/all-mpnet-base-v2";
export const EMBEDDING_DIMS = 768;

// Singleton — one pipeline per Node.js process
let _pipeline: FeatureExtractionPipeline | null = null;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (_pipeline) return _pipeline;
  const { pipeline } = await import("@huggingface/transformers");
  _pipeline = await pipeline("feature-extraction", MODEL, { dtype: "fp32" }) as FeatureExtractionPipeline;
  return _pipeline;
}

/** Embed a single string → Float32Array of length 768 */
export async function embed(text: string): Promise<number[]> {
  const pipe = await getPipeline();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  // output.data is Float32Array
  return Array.from(output.data as Float32Array);
}

/** Embed a batch of strings → array of 768-dim vectors */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const pipe = await getPipeline();
  const results: number[][] = [];
  for (const text of texts) {
    const output = await pipe(text, { pooling: "mean", normalize: true });
    results.push(Array.from(output.data as Float32Array));
  }
  return results;
}
