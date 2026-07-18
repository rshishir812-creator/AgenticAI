"""
ADK 2.0 Workflow demo — fan-out/fan-in (ParallelAgent) composed inside a
SequentialAgent, using GroqAgent leaf nodes.

Pipeline:
  1. ParallelAgent fans out the question to two GroqAgents running
     concurrently, each analyzing it from a different angle:
       - "technical" — implementation/architecture details
       - "tradeoffs" — pros/cons/when-to-use-this
  2. A final GroqAgent (sequential, after the parallel step) synthesizes
     both perspectives into one answer.

This is the ADK-equivalent of the TS/Py agentic-RAG graphs' "supervisor
delegates to workers, then synthesizes" pattern — a concrete, runnable demo
of ADK's real Workflow primitives (SequentialAgent + ParallelAgent), not a
toy single-node example.
"""
from google.adk.agents import ParallelAgent, SequentialAgent
from google.adk.agents.invocation_context import InvocationContext
from google.adk.events import Event
from google.genai import types
from typing_extensions import AsyncGenerator, override

from groq_agent import GroqAgent, _groq


def build_workflow() -> SequentialAgent:
    technical = GroqAgent(
        name="technical_analyst",
        system_prompt="Analyze the technical/implementation angle of the user's question in 2-3 sentences. Be specific and concrete.",
        state_key_out="technical_analysis",
    )
    tradeoffs = GroqAgent(
        name="tradeoffs_analyst",
        system_prompt="Analyze the tradeoffs, pros/cons, and when-to-use angle of the user's question in 2-3 sentences.",
        state_key_out="tradeoffs_analysis",
    )

    fan_out = ParallelAgent(
        name="parallel_analysis",
        sub_agents=[technical, tradeoffs],
    )

    synthesizer = SynthesizerAgent(
        name="synthesizer",
        system_prompt="Synthesize the technical and tradeoffs analyses into one clear, well-organized answer.",
        state_key_out="final_answer",
    )

    return SequentialAgent(
        name="adk_workflow_demo",
        sub_agents=[fan_out, synthesizer],
    )


class SynthesizerAgent(GroqAgent):
    """
    GroqAgent variant that reads BOTH parallel branches' outputs from
    session state (rather than a single state_key_in) and combines them.
    Calls Groq directly instead of delegating to GroqAgent's own
    _run_async_impl, since that reads a single state_key_in rather than
    merging two — mutating a pydantic model's fields at runtime to fake a
    combined key would be fragile under concurrent requests.
    """

    @override
    async def _run_async_impl(self, ctx: InvocationContext) -> AsyncGenerator[Event, None]:
        technical = ctx.session.state.get("technical_analysis", "")
        tradeoffs = ctx.session.state.get("tradeoffs_analysis", "")
        question = ctx.user_content.parts[0].text if ctx.user_content and ctx.user_content.parts else ""

        combined = (
            f"Question: {question}\n\n"
            f"Technical analysis: {technical}\n\n"
            f"Tradeoffs analysis: {tradeoffs}"
        )

        client = _groq()
        resp = client.chat.completions.create(
            model=self.model,
            temperature=0,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": combined},
            ],
        )
        output_text = resp.choices[0].message.content or ""
        ctx.session.state[self.state_key_out] = output_text

        yield Event(
            author=self.name,
            content=types.Content(role="model", parts=[types.Part(text=output_text)]),
        )
