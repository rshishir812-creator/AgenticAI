"""
Agentic RAG - LangGraph (Python) StateGraph, Self-RAG + Corrective RAG.

Python mirror of apps/studio/lib/agents/agentic-rag.ts, sharing the same
Supabase `documents` table, `match_documents` RPC, and Groq models — a TS
agent and this Python agent can retrieve the exact same chunks because both
embed with all-mpnet-base-v2 (768 dims).

Graph: query_rewrite -> retrieve -> grade_docs -> generate -> grade_answer -> end
Corrective path: grade_docs -> retrieve again (bounded by retryCount, see below)

This implementation carries forward every bugfix discovered while debugging
the TypeScript version (see docs/RESUME.md commit 510ec27):
  1. retryCount increments on BOTH the irrelevant-docs loop and the
     hallucinated-answer loop (the original TS bug: only the answer loop
     incremented it, so the docs loop could recurse forever).
  2. No aggressive truncation of document content before grading — chunks
     are already capped at ~800 chars by ingestion; slicing further risked
     hiding the actually-relevant sentence from the grading LLM.
  3. JSON-mode grading prompts avoid literal "true|false" placeholder syntax
     (gpt-oss models sometimes echo it verbatim -> invalid JSON). Prompts give
     one concrete example instead.
  4. match_documents is called with match_threshold=0.2 (MPNet cosine
     similarities run lower than OpenAI's embedding space).

A fifth issue was found and fixed specifically in this Python port (not
present in the TS version, which never surfaced it in testing): even with a
well-formed prompt, gpt-oss models occasionally emit malformed JSON in
response_format=json_object mode — probabilistic, not deterministic, so it
doesn't reproduce on every run. A bare json.loads() call on that response
would crash the whole graph. See _graded_bool() below: retries once, then
fails open (defaults to True) rather than aborting the run.
"""
import json
import os
import time
from typing import Any, Literal, TypedDict

from langgraph.graph import StateGraph, END, START
from nanoid import generate as nanoid
from openai import OpenAI
from supabase import create_client

from embeddings import embed
from loop_detector import LoopDetectedError, LoopDetector
from model_router import MODELS, route_request


class DocItem(TypedDict, total=False):
    id: str
    content: str
    source: str | None


class State(TypedDict, total=False):
    run_id: str
    question: str
    rewritten: str | None
    documents: list[DocItem]
    docs_grade: Literal["relevant", "irrelevant"] | None
    generation: str | None
    answer_grade: Literal["grounded", "hallucinated"] | None
    retry_count: int
    total_tokens: int
    events: list[dict]


def _supabase():
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def _groq() -> OpenAI:
    return OpenAI(
        api_key=os.environ["GROQ_API_KEY"],
        base_url=os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
    )


def _ts() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _chat(model: str, system: str, user: str, json_mode: bool = False) -> str:
    client = _groq()
    kwargs: dict[str, Any] = {}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
        kwargs["max_tokens"] = 500
    resp = client.chat.completions.create(
        model=model,
        temperature=0,
        messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
        **kwargs,
    )
    return resp.choices[0].message.content or ""


def _graded_bool(system: str, user: str, field: str, default: bool, retries: int = 2) -> bool:
    """
    Call the small model in JSON mode and pull a boolean field out of the
    response, retrying on malformed JSON before falling back to a safe
    default. gpt-oss models occasionally emit invalid JSON even with a
    well-formed prompt and a low temperature — this is probabilistic, not a
    deterministic bug, so a bare json.loads() call is not production-safe
    for a graph node whose failure would otherwise crash the whole run.
    """
    last_err: Exception | None = None
    for _ in range(retries):
        try:
            resp = _chat(MODELS["small"], system, user, json_mode=True)
            return bool(json.loads(resp).get(field, default))
        except Exception as err:  # noqa: BLE001 - deliberately broad, see docstring
            last_err = err
            continue
    print(f"[agentic-rag] JSON grading failed after {retries} attempts, defaulting {field}={default}: {last_err}")
    return default


# ── Nodes ────────────────────────────────────────────────────────────────

def query_rewrite(s: State) -> dict:
    step_id = nanoid(size=8)
    routing = route_request(s["question"])
    rewritten = _chat(
        routing["model"],
        "Rewrite the query for vector DB retrieval. Return ONLY the rewritten query.",
        s["question"],
    ).strip()
    return {
        "rewritten": rewritten,
        "events": s["events"] + [
            {"type": "step_started", "runId": s["run_id"], "stepId": step_id, "nodeName": "query_rewrite", "timestamp": _ts()},
            {"type": "step_finished", "runId": s["run_id"], "stepId": step_id, "nodeName": "query_rewrite", "outputPreview": rewritten[:80], "timestamp": _ts()},
        ],
    }


def retrieve(s: State) -> dict:
    step_id = nanoid(size=8)
    db = _supabase()
    query = s.get("rewritten") or s["question"]
    embedding = embed(query)
    result = db.rpc("match_documents", {"query_embedding": embedding, "match_threshold": 0.2, "match_count": 5}).execute()
    docs = result.data or []
    return {
        "documents": docs,
        "events": s["events"] + [
            {"type": "step_started", "runId": s["run_id"], "stepId": step_id, "nodeName": "retrieve", "timestamp": _ts()},
            {"type": "step_finished", "runId": s["run_id"], "stepId": step_id, "nodeName": "retrieve", "outputPreview": f"{len(docs)} docs", "timestamp": _ts()},
        ],
    }


def grade_docs(s: State) -> dict:
    step_id = nanoid(size=8)
    docs = s.get("documents", [])
    if not docs:
        return {
            "docs_grade": "irrelevant",
            "retry_count": s.get("retry_count", 0) + 1,
            "events": s["events"] + [
                {"type": "step_started", "runId": s["run_id"], "stepId": step_id, "nodeName": "grade_docs", "timestamp": _ts()},
                {"type": "step_finished", "runId": s["run_id"], "stepId": step_id, "nodeName": "grade_docs", "outputPreview": "irrelevant (no docs)", "timestamp": _ts()},
            ],
        }
    ctx = "\n\n".join(f"[{i+1}] {d['content']}" for i, d in enumerate(docs))
    relevant = _graded_bool(
        'You are a relevance grader. Respond with only a JSON object matching this exact shape: {"relevant": true}. Set "relevant" to true if the documents help answer the question, otherwise false.',
        f"Q: {s['question']}\n\nDocs:\n{ctx}",
        field="relevant",
        default=True,  # fail open: if grading itself is broken, don't discard a plausibly-good retrieval
    )
    grade = "relevant" if relevant else "irrelevant"
    return {
        "docs_grade": grade,
        "retry_count": s.get("retry_count", 0) + (0 if relevant else 1),
        "events": s["events"] + [
            {"type": "step_started", "runId": s["run_id"], "stepId": step_id, "nodeName": "grade_docs", "timestamp": _ts()},
            {"type": "step_finished", "runId": s["run_id"], "stepId": step_id, "nodeName": "grade_docs", "outputPreview": grade, "timestamp": _ts()},
        ],
    }


def generate(s: State) -> dict:
    step_id = nanoid(size=8)
    routing = route_request(s["question"])
    docs = s.get("documents", [])
    ctx = "\n\n---\n\n".join(f"[{i+1}] {d['content']}" for i, d in enumerate(docs))
    generation = _chat(routing["model"], f"Answer using context:\n{ctx}", s["question"])
    return {
        "generation": generation,
        "events": s["events"] + [
            {"type": "step_started", "runId": s["run_id"], "stepId": step_id, "nodeName": "generate", "timestamp": _ts()},
            {"type": "step_finished", "runId": s["run_id"], "stepId": step_id, "nodeName": "generate", "outputPreview": generation[:100], "timestamp": _ts()},
        ],
    }


def grade_answer(s: State) -> dict:
    step_id = nanoid(size=8)
    docs = s.get("documents", [])
    ctx = "\n".join(f"[{i+1}] {d['content']}" for i, d in enumerate(docs))
    grounded = _graded_bool(
        'You are a groundedness grader. Respond with only a JSON object matching this exact shape: {"grounded": true}. Set "grounded" to true if the answer is fully supported by the context, otherwise false.',
        f"Q: {s['question']}\nCtx: {ctx}\nAnswer: {s.get('generation', '')}",
        field="grounded",
        default=True,  # fail open: if grading itself is broken, don't discard a plausibly-good answer
    )
    grade = "grounded" if grounded else "hallucinated"
    return {
        "answer_grade": grade,
        "retry_count": s.get("retry_count", 0) + (0 if grounded else 1),
        "events": s["events"] + [
            {"type": "step_started", "runId": s["run_id"], "stepId": step_id, "nodeName": "grade_answer", "timestamp": _ts()},
            {"type": "step_finished", "runId": s["run_id"], "stepId": step_id, "nodeName": "grade_answer", "outputPreview": grade, "timestamp": _ts()},
        ],
    }


# ── Routing edges ────────────────────────────────────────────────────────

def after_grade(s: State) -> str:
    if s.get("docs_grade") == "relevant":
        return "generate"
    return END if s.get("retry_count", 0) >= 2 else "retrieve"


def after_answer_grade(s: State) -> str:
    if s.get("answer_grade") == "grounded" or s.get("retry_count", 0) >= 2:
        return END
    return "generate"


# ── Compiled graph ───────────────────────────────────────────────────────

def build_agentic_rag_graph():
    g = StateGraph(State)
    g.add_node("query_rewrite", query_rewrite)
    g.add_node("retrieve", retrieve)
    g.add_node("grade_docs", grade_docs)
    g.add_node("generate", generate)
    g.add_node("grade_answer", grade_answer)
    g.add_edge(START, "query_rewrite")
    g.add_edge("query_rewrite", "retrieve")
    g.add_edge("retrieve", "grade_docs")
    g.add_conditional_edges("grade_docs", after_grade, ["generate", "retrieve", END])
    g.add_edge("generate", "grade_answer")
    g.add_conditional_edges("grade_answer", after_answer_grade, [END, "generate"])
    return g.compile()


# ── Public runner ────────────────────────────────────────────────────────

def run_agentic_rag(question: str, on_event, max_steps: int = 15, max_tokens: int = 30_000):
    run_id = nanoid()
    LoopDetector(max_steps=max_steps, max_tokens=max_tokens, window_size=5)  # reserved for future per-node budget checks

    on_event({"type": "run_started", "runId": run_id, "agentId": "langgraph-py:agentic-rag", "input": question, "timestamp": _ts()})

    graph = build_agentic_rag_graph()
    try:
        result = graph.invoke({
            "run_id": run_id, "question": question,
            "rewritten": None, "documents": [], "docs_grade": None,
            "generation": None, "answer_grade": None, "retry_count": 0, "total_tokens": 0, "events": [],
        })
        for event in result["events"]:
            on_event(event)
        on_event({"type": "run_finished", "runId": run_id, "status": "success", "durationMs": 0, "totalTokens": result.get("total_tokens", 0), "timestamp": _ts()})
        return {"answer": result.get("generation"), "tokens": result.get("total_tokens", 0)}
    except LoopDetectedError as err:
        on_event({"type": "error", "runId": run_id, "code": f"LOOP_{err.reason.upper()}", "message": str(err), "loopDetected": True, "timestamp": _ts()})
        raise
    except Exception as err:
        on_event({"type": "error", "runId": run_id, "code": "AGENT_ERROR", "message": str(err), "timestamp": _ts()})
        raise
