"""
GroqAgent — a custom google.adk.agents.BaseAgent that calls Groq directly
via the raw openai SDK instead of ADK's built-in LLM abstraction.

Why not ADK's native LlmAgent + LiteLlm wrapper? ADK's LlmAgent defaults to
Gemini; reaching a non-Gemini provider like Groq requires the
google.adk.models.lite_llm.LiteLlm wrapper, which needs the
`google-adk[extensions]` extra. That extra pulls in `litellm`, which as of
this writing ships no prebuilt wheel and requires a Rust/Cargo toolchain to
build from source — a heavy, environment-modifying install we chose not to
force. Calling Groq directly (same raw-openai-SDK pattern already proven in
agents/langgraph-py/model_router.py) sidesteps that entirely while still
using ADK's real BaseAgent/SequentialAgent/ParallelAgent orchestration
primitives — the actual "ADK 2.0 Workflow Runtime" teaching point.
"""
import os

from google.adk.agents import BaseAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from google.genai import types
from openai import OpenAI
from typing_extensions import AsyncGenerator, override


def _groq() -> OpenAI:
    return OpenAI(
        api_key=os.environ["GROQ_API_KEY"],
        base_url=os.environ.get("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
    )


class GroqAgent(BaseAgent):
    """
    A leaf ADK agent whose generation step calls Groq. Reads its input from
    `state_key_in` (or the invocation's user_content on the first turn),
    writes its output to `state_key_out` in session state so downstream
    sibling agents (in a SequentialAgent/ParallelAgent) can read it.
    """

    model_config = {"arbitrary_types_allowed": True}

    system_prompt: str
    state_key_in: str | None = None
    state_key_out: str
    model: str = os.environ.get("GROQ_MODEL_LARGE", "openai/gpt-oss-120b")

    @override
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        if self.state_key_in and self.state_key_in in ctx.session.state:
            user_text = ctx.session.state[self.state_key_in]
        elif ctx.user_content and ctx.user_content.parts:
            user_text = ctx.user_content.parts[0].text or ""
        else:
            user_text = ""

        client = _groq()
        resp = client.chat.completions.create(
            model=self.model,
            temperature=0,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": user_text},
            ],
        )
        output_text = resp.choices[0].message.content or ""

        ctx.session.state[self.state_key_out] = output_text

        yield Event(
            author=self.name,
            content=types.Content(role="model", parts=[types.Part(text=output_text)]),
        )
