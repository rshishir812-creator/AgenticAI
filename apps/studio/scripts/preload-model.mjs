import { pipeline, env } from "@huggingface/transformers";
console.log("Cache dir:", env.cacheDir);
console.log("Downloading Xenova/all-mpnet-base-v2 ...");
const start = Date.now();
const pipe = await pipeline("feature-extraction", "Xenova/all-mpnet-base-v2", { dtype: "fp32" });
const out = await pipe("test sentence", { pooling: "mean", normalize: true });
const dims = Array.from(out.data).length;
console.log(`Done in ${((Date.now()-start)/1000).toFixed(1)}s — dims: ${dims}`);
