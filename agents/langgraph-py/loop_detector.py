"""
Infinite-loop / runaway-cost detection — Python mirror of
apps/studio/lib/agents/loop-detector.ts (step budget, token budget, and
SHA-256 state-cycle hashing).
"""
import hashlib
import json


class LoopDetectedError(Exception):
    def __init__(self, reason: str, details: str):
        self.reason = reason
        self.details = details
        super().__init__(f"Loop detected: {reason} - {details}")


class LoopDetector:
    def __init__(self, max_steps: int = 25, max_tokens: int = 50_000, window_size: int = 5):
        self.max_steps = max_steps
        self.max_tokens = max_tokens
        self.window_size = window_size
        self.step_count = 0
        self.token_count = 0
        self.state_hashes: list[str] = []

    def step(self, tokens_used: int = 0) -> None:
        self.step_count += 1
        self.token_count += tokens_used

        if self.step_count > self.max_steps:
            raise LoopDetectedError("step_budget", f"Exceeded {self.max_steps} steps")
        if self.token_count > self.max_tokens:
            raise LoopDetectedError("token_budget", f"Exceeded {self.max_tokens} tokens")

    def check_state(self, state: dict) -> None:
        digest = hashlib.sha256(json.dumps(state, sort_keys=True, default=str).encode()).hexdigest()[:16]
        is_duplicate = digest in self.state_hashes
        self.state_hashes = (self.state_hashes + [digest])[-self.window_size:]
        if is_duplicate:
            raise LoopDetectedError("state_cycle", f"Repeated state hash {digest}")
