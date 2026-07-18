"""
Intelligent model routing — Python mirror of apps/studio/lib/agents/model-router.ts

Classifies task complexity (0.0-1.0) using the small Groq model, then routes
to the small or large model tier. Uses the raw `openai` SDK against Groq's
OpenAI-compatible endpoint directly (not a LangChain wrapper) — see
apps/studio/docs/RESUME.md for why: LangChain's ChatGroq wrapper doubles the
"/openai/v1" path when GROQ_BASE_URL is set, since groq-sdk appends its own
suffix. The raw OpenAI SDK doesn't have that problem.
"""
import json
import os

from openai import OpenAI

MODELS = {
    "small": os.environ.get("GROQ_MODEL_SMALL", "openai/gpt-oss-20b"),
    "large": os.environ.get("GROQ_MODEL_LARGE", "openai/gpt-oss-120b"),
    "vision": os.environ.get("GROQ_MODEL_VISION", "qwen/qwen3.6-27b"),
}

CLASSIFIER_PROMPT = """Rate this task complexity 0.0-1.0 and respond with only JSON: {"score": <0.0-1.0>, "reason": "<15 words max>"}
0.0-0.3: simple lookup/short answer. 0.3-0.6: multi-step. 0.6-1.0: complex reasoning/agents."""


def _client() -> OpenAI:
    return OpenAI(
        api_key=os.environ["GROQ_API_KEY"],
        base_url=os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
    )


def route_request(user_message: str) -> dict:
    try:
        client = _client()
        resp = client.chat.completions.create(
            model=MODELS["small"],
            messages=[
                {"role": "system", "content": CLASSIFIER_PROMPT},
                {"role": "user", "content": user_message[:500]},
            ],
            response_format={"type": "json_object"},
            # gpt-oss reasoning models spend tokens on internal reasoning
            # before the JSON payload — too low a budget truncates mid-reasoning.
            max_tokens=300,
            temperature=0,
        )
        parsed = json.loads(resp.choices[0].message.content or "{}")
        score = parsed.get("score")
        reason = parsed.get("reason", "")
        complexity_score = max(0.0, min(1.0, float(score))) if isinstance(score, (int, float)) else 0.5
        tier = "small" if complexity_score < 0.35 else "large"
        return {"tier": tier, "model": MODELS[tier], "reason": reason, "complexityScore": complexity_score}
    except Exception:
        return {"tier": "large", "model": MODELS["large"], "reason": "routing error - fallback", "complexityScore": 0.9}
