/**
 * Agentic RAG — LangGraph.js StateGraph (Self-RAG + Corrective RAG)
 * Runs inside the Next.js Node.js runtime (api/run route).
 *
 * Graph: query_rewrite → retrieve → grade_docs → generate → grade_answer → end
 * Corrective path: grade_docs → retrieve again (or web fallback in Phase 2)
 */

import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createClient } from "@supabase/supabase-js";
import { embed } from "@/lib/embeddings";
import { nanoid } from "nanoid";
import { LoopDetector, LoopDetectedError } from "./loop-detector";
import { routeRequest } from "./model-router";

// ── State ──────────────────────────────────────────────────────────────────

type DocItem = { id: string; content: string; source?: string };

const State = Annotation.Root({
  runId:       Annotation<string>(),
  question:    Annotation<string>(),
  rewritten:   Annotation<string | null>({ value: (_: string | null, y: string | null) => y, default: () => null }),
  documents:   Annotation<DocItem[]>({ value: (_: DocItem[], y: DocItem[]) => y, default: () => [] }),
  docsGrade:   Annotation<"relevant" | "irrelevant" | null>({ value: (_: any, y: any) => y, default: () => null }),
  generation:  Annotation<string | null>({ value: (_: string | null, y: string | null) => y, default: () => null }),
  answerGrade: Annotation<"grounded" | "hallucinated" | null>({ value: (_: any, y: any) => y, default: () => null }),
  retryCount:  Annotation<number>({ value: (_: number, y: number) => y, default: () => 0 }),
  totalTokens: Annotation<number>({ value: (_: number, y: number) => y, default: () => 0 }),
  events:      Annotation<any[]>({ value: (_: any[], y: any[]) => y, default: () => [] }),
});

type S = typeof State.State;

// ── Helpers ────────────────────────────────────────────────────────────────

function supabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

function llm(model: string) {
  // groq-sdk (used internally by ChatGroq) appends its own "/openai/v1/..." path
  // onto baseUrl, so baseUrl must be the bare host — NOT process.env.GROQ_BASE_URL,
  // which already ends in "/openai/v1" for the raw OpenAI-compatible SDK usage
  // elsewhere (see model-router.ts). Passing it here would double the path.
  return new ChatGroq({ model, temperature: 0, apiKey: process.env.GROQ_API_KEY, baseUrl: "https://api.groq.com" });
}

function ts() { return new Date().toISOString(); }

// ── Nodes ──────────────────────────────────────────────────────────────────

function routingEvent(s: S, nodeName: string, routing: Awaited<ReturnType<typeof routeRequest>>) {
  return {
    type: "routing_decision", runId: s.runId, nodeName,
    tier: routing.tier, model: routing.model, reason: routing.reason,
    complexityScore: routing.complexityScore, timestamp: ts(),
  };
}

async function queryRewrite(s: S) {
  const stepId = nanoid(8);
  const routing = await routeRequest(s.question);
  const resp = await llm(routing.model).invoke([
    new SystemMessage("Rewrite the query for vector DB retrieval. Return ONLY the rewritten query."),
    new HumanMessage(s.question),
  ]);
  return {
    rewritten: resp.content.toString().trim(),
    events: [...s.events,
      routingEvent(s, "query_rewrite", routing),
      { type: "step_started",  runId: s.runId, stepId, nodeName: "query_rewrite", timestamp: ts() },
      { type: "step_finished", runId: s.runId, stepId, nodeName: "query_rewrite", outputPreview: resp.content.toString().slice(0, 80), timestamp: ts() },
    ],
  };
}

async function retrieve(s: S) {
  const stepId = nanoid(8);
  const db = supabase();
  const query = s.rewritten ?? s.question;
  let docs: any[] = [];

  const embedding = await embed(query);
  const { data } = await db.rpc("match_documents", { query_embedding: embedding, match_threshold: 0.2, match_count: 5 });
  docs = data ?? [];

  return {
    documents: docs,
    events: [...s.events,
      { type: "step_started",  runId: s.runId, stepId, nodeName: "retrieve", timestamp: ts() },
      { type: "step_finished", runId: s.runId, stepId, nodeName: "retrieve", outputPreview: `${docs.length} docs`, timestamp: ts() },
    ],
  };
}

async function gradeDocs(s: S) {
  const stepId = nanoid(8);
  if (!s.documents.length) {
    return {
      docsGrade: "irrelevant" as const,
      retryCount: s.retryCount + 1,
      events: [...s.events,
        { type: "step_started",  runId: s.runId, stepId, nodeName: "grade_docs", timestamp: ts() },
        { type: "step_finished", runId: s.runId, stepId, nodeName: "grade_docs", outputPreview: "irrelevant (no docs)", timestamp: ts() },
      ],
    };
  }
  // Chunks are already capped at ~800 chars by the ingestion pipeline — no
  // need to truncate further here, doing so risks cutting the relevant part
  // of a chunk (e.g. a multi-topic chunk) before the grader ever sees it.
  const ctx = s.documents.map((d, i) => `[${i+1}] ${d.content}`).join("\n\n");
  const resp = await llm(process.env.GROQ_MODEL_SMALL ?? "openai/gpt-oss-20b").invoke([
    new SystemMessage('You are a relevance grader. Respond with only a JSON object matching this exact shape: {"relevant": true}. Set "relevant" to true if the documents help answer the question, otherwise false.'),
    new HumanMessage(`Q: ${s.question}\n\nDocs:\n${ctx}`),
  ], { response_format: { type: "json_object" } });
  const { relevant } = JSON.parse(resp.content.toString());
  const grade = relevant ? "relevant" : "irrelevant";
  return {
    docsGrade: grade as "relevant" | "irrelevant",
    retryCount: s.retryCount + (relevant ? 0 : 1),
    events: [...s.events,
      { type: "step_started",  runId: s.runId, stepId, nodeName: "grade_docs", timestamp: ts() },
      { type: "step_finished", runId: s.runId, stepId, nodeName: "grade_docs", outputPreview: grade, timestamp: ts() },
    ],
  };
}

async function generate(s: S) {
  const stepId = nanoid(8);
  const routing = await routeRequest(s.question);
  const ctx = s.documents.map((d, i) => `[${i+1}] ${d.content}`).join("\n\n---\n\n");
  const resp = await llm(routing.model).invoke([
    new SystemMessage(`Answer using context:\n${ctx}`),
    new HumanMessage(s.question),
  ]);
  const generation = resp.content.toString();
  return { generation, events: [...s.events,
    routingEvent(s, "generate", routing),
    { type: "step_started",  runId: s.runId, stepId, nodeName: "generate", timestamp: ts() },
    { type: "step_finished", runId: s.runId, stepId, nodeName: "generate", outputPreview: generation.slice(0, 100), timestamp: ts() },
  ]};
}

async function gradeAnswer(s: S) {
  const stepId = nanoid(8);
  const ctx = s.documents.map((d, i) => `[${i+1}] ${d.content}`).join("\n");
  const resp = await llm(process.env.GROQ_MODEL_SMALL ?? "openai/gpt-oss-20b").invoke([
    new SystemMessage('You are a groundedness grader. Respond with only a JSON object matching this exact shape: {"grounded": true}. Set "grounded" to true if the answer is fully supported by the context, otherwise false.'),
    new HumanMessage(`Q: ${s.question}\nCtx: ${ctx}\nAnswer: ${s.generation}`),
  ], { response_format: { type: "json_object" } });
  const { grounded } = JSON.parse(resp.content.toString());
  const grade = grounded ? "grounded" : "hallucinated";
  return {
    answerGrade: grade as "grounded" | "hallucinated",
    retryCount: s.retryCount + (grounded ? 0 : 1),
    events: [...s.events,
      { type: "step_started",  runId: s.runId, stepId, nodeName: "grade_answer", timestamp: ts() },
      { type: "step_finished", runId: s.runId, stepId, nodeName: "grade_answer", outputPreview: grade, timestamp: ts() },
    ],
  };
}

// ── Routing edges ──────────────────────────────────────────────────────────

function afterGrade(s: S) { return s.docsGrade === "relevant" ? "generate" : s.retryCount >= 2 ? END : "retrieve"; }
function afterAnswerGrade(s: S) { return s.answerGrade === "grounded" || s.retryCount >= 2 ? END : "generate"; }

// ── Compiled graph ─────────────────────────────────────────────────────────

/**
 * Wraps a node function so every node execution also runs it through the
 * shared LoopDetector — step/token budget check plus a SHA-256 state-cycle
 * hash check — and emits a "budget_check" event so it's visible in the
 * trace panel. Previously LoopDetector was only ever constructed, never
 * invoked: the graph's only real protection against infinite loops was
 * LangGraph's own generic recursionLimit (25), which fires with a much
 * less informative error than our own step/token/cycle-specific one.
 */
function withBudgetCheck(nodeName: string, detector: LoopDetector, fn: (s: S) => Promise<Partial<S>>) {
  return async (s: S): Promise<Partial<S>> => {
    const result = await fn(s);
    detector.step();
    detector.checkState({ ...s, ...result, events: undefined });
    const events = (result.events ?? s.events) as any[];
    const usage = detector.usage;
    return {
      ...result,
      events: [...events, {
        type: "budget_check", runId: s.runId, nodeName,
        stepsUsed: usage.steps, maxSteps: usage.maxSteps,
        timestamp: ts(),
      }],
    };
  };
}

export function buildAgenticRagGraph(detector: LoopDetector) {
  return new StateGraph(State)
    .addNode("query_rewrite", withBudgetCheck("query_rewrite", detector, queryRewrite))
    .addNode("retrieve",      withBudgetCheck("retrieve",      detector, retrieve))
    .addNode("grade_docs",    withBudgetCheck("grade_docs",    detector, gradeDocs))
    .addNode("generate",      withBudgetCheck("generate",      detector, generate))
    .addNode("grade_answer",  withBudgetCheck("grade_answer",  detector, gradeAnswer))
    .addEdge(START, "query_rewrite")
    .addEdge("query_rewrite", "retrieve")
    .addEdge("retrieve", "grade_docs")
    .addConditionalEdges("grade_docs",   afterGrade,       ["generate", "retrieve", END])
    .addEdge("generate", "grade_answer")
    .addConditionalEdges("grade_answer", afterAnswerGrade, [END, "generate"])
    .compile();
}

// ── Public runner ──────────────────────────────────────────────────────────

export async function runAgenticRag(
  question: string,
  onEvent: (event: any) => void,
  options: { maxSteps?: number; maxTokens?: number; threadId?: string } = {}
) {
  const runId = nanoid();
  const detector = new LoopDetector({ maxSteps: options.maxSteps ?? 15, maxTokens: options.maxTokens ?? 30_000, windowSize: 5 });

  // Note: the caller (api/run/route.ts) already emits a "run_started" event
  // with its own runId before invoking this function — don't emit a second one.

  const graph = buildAgenticRagGraph(detector);

  try {
    const result = await graph.invoke({
      runId, question,
      rewritten: null, documents: [], docsGrade: null,
      generation: null, answerGrade: null, retryCount: 0, totalTokens: 0, events: [],
    });

    // Emit all accumulated events
    for (const event of result.events) { onEvent(event); }

    onEvent({ type: "run_finished", runId, status: "success", durationMs: 0, totalTokens: result.totalTokens, timestamp: new Date().toISOString() });
    return { answer: result.generation, tokens: result.totalTokens };
  } catch (err: any) {
    if (err?.name === "LoopDetectedError") {
      onEvent({ type: "error", runId, code: `LOOP_${err.reason?.toUpperCase()}`, message: err.message, loopDetected: true, timestamp: new Date().toISOString() });
    } else {
      onEvent({ type: "error", runId, code: "AGENT_ERROR", message: String(err), timestamp: new Date().toISOString() });
    }
    throw err;
  }
}
