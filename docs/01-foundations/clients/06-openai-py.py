"""
Client 6: Python openai SDK + httpx streaming

Same completion, Python style. Also shows httpx for raw HTTP streaming
(equivalent to Client 1 but in Python).

Run:  GROQ_API_KEY=... python 06-openai-py.py
Deps: pip install openai httpx
"""

import os
import json
import httpx
from openai import OpenAI

BASE_URL = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
API_KEY  = os.getenv("GROQ_API_KEY", "")
MODEL    = os.getenv("GROQ_MODEL_LARGE", "openai/gpt-oss-120b")
QUESTION = "What is the Embabel GOAP framework? Why use it for agents?"


# ── openai SDK: non-streaming ─────────────────────────────────────────────

client = OpenAI(api_key=API_KEY, base_url=BASE_URL)

completion = client.chat.completions.create(
    model=MODEL,
    messages=[
        {"role": "system", "content": "You are a concise AI assistant."},
        {"role": "user",   "content": QUESTION},
    ],
)
print("[openai-py non-stream]", completion.choices[0].message.content)
print("[openai-py non-stream] usage:", completion.usage)


# ── openai SDK: streaming ─────────────────────────────────────────────────

print("\n[openai-py stream] ", end="", flush=True)
with client.chat.completions.stream(
    model=MODEL,
    messages=[
        {"role": "system", "content": "You are a concise AI assistant."},
        {"role": "user",   "content": QUESTION},
    ],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
print()


# ── httpx: raw HTTP streaming (like Client 1 in Python) ──────────────────

print("\n[httpx raw stream] ", end="", flush=True)
with httpx.stream(
    "POST",
    f"{BASE_URL}/chat/completions",
    headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    json={
        "model": MODEL,
        "stream": True,
        "messages": [
            {"role": "user", "content": QUESTION},
        ],
    },
    timeout=60,
) as r:
    r.raise_for_status()
    for line in r.iter_lines():
        if not line.startswith("data: "):
            continue
        payload = line[6:].strip()
        if payload == "[DONE]":
            break
        chunk = json.loads(payload)
        delta = (chunk.get("choices") or [{}])[0].get("delta", {}).get("content", "")
        if delta:
            print(delta, end="", flush=True)
print()


# ── structured output ─────────────────────────────────────────────────────

from pydantic import BaseModel
from typing import List

class Protocol(BaseModel):
    name: str
    purpose: str
    year: int

class ProtocolList(BaseModel):
    protocols: List[Protocol]

result = client.beta.chat.completions.parse(
    model=MODEL,
    messages=[
        {"role": "user", "content": "List MCP, A2A, and AG-UI as JSON with name, purpose, and year fields."},
    ],
    response_format=ProtocolList,
)
parsed = result.choices[0].message.parsed
print("\n[openai-py structured]", parsed.model_dump_json(indent=2))
