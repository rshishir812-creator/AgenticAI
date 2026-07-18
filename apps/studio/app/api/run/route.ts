/**
 * /api/run — Agent run endpoint (AG-UI event stream)
 *
 * Dispatches a run request to the correct agent backend and proxies
 * the AG-UI event stream back to the Studio canvas.
 *
 * For TS agents (langgraph-ts): runs in-process via the agent module.
 * For Py agents (adk-py):       proxies to the Python Vercel function.
 * For Java agents (embabel/adk-java): proxies to the local Docker service.
 *
 * The response is text/event-stream (SSE) carrying AG-UI events.
 */

import { NextRequest } from "next/server";
import { nanoid } from "nanoid";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { agentId, input, config = {} } = body;

  const runId    = nanoid();
  const encoder  = new TextEncoder();

  function sseEvent(event: object): Uint8Array {
    return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
  }

  const stream = new ReadableStream({
    async start(controller) {
      const ts = () => new Date().toISOString();

      // Emit run_started
      controller.enqueue(sseEvent({ type: "run_started", runId, agentId, input, timestamp: ts() }));

      try {
        if (agentId === "langgraph-ts:agentic-rag") {
          // Dynamically import the LangGraph agentic-RAG agent
          // Agent lives in agents/langgraph-ts — add "langgraph-ts": "workspace:*" to studio/package.json
          const { runAgenticRag } = await import("@/lib/agents/agentic-rag");
          await runAgenticRag(
            input,
            (event) => controller.enqueue(sseEvent(event)),
            { maxSteps: config.maxSteps ?? 15, maxTokens: config.maxTokens ?? 30_000, threadId: config.threadId }
          );

        } else if (agentId?.startsWith("langgraph-py:") || agentId?.startsWith("adk-py:")) {
          // Proxy to Python agent
          const pyUrl = process.env.PYTHON_AGENT_URL ?? "http://localhost:8000";
          const upstream = await fetch(`${pyUrl}/api/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentId, input, config }),
          });
          if (upstream.body) {
            const reader = upstream.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          }

        } else if (agentId?.startsWith("embabel-java:") || agentId?.startsWith("adk-java:")) {
          // Proxy to Java agent (local Docker)
          const javaUrl = agentId.startsWith("embabel-java:")
            ? (process.env.EMBABEL_SERVICE_URL ?? "http://localhost:8081")
            : (process.env.ADK_JAVA_SERVICE_URL ?? "http://localhost:8082");

          const upstream = await fetch(`${javaUrl}/api/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agentId, input, config }),
          });
          if (upstream.body) {
            const reader = upstream.body.getReader();
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              controller.enqueue(value);
            }
          }

        } else {
          controller.enqueue(sseEvent({
            type: "error", runId, code: "UNKNOWN_AGENT",
            message: `Unknown agentId: ${agentId}. Check agents/langgraph-ts, agents/adk-py, agents/embabel-java.`,
            timestamp: ts(),
          }));
        }
      } catch (err: any) {
        controller.enqueue(sseEvent({
          type: "error", runId, code: "RUN_ERROR",
          message: err?.message ?? String(err),
          loopDetected: err?.name === "LoopDetectedError",
          timestamp: ts(),
        }));
      }

      controller.enqueue(sseEvent({ type: "run_finished", runId, status: "success", durationMs: 0, timestamp: ts() }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      Connection:      "keep-alive",
      "X-Run-Id":      runId,
    },
  });
}
