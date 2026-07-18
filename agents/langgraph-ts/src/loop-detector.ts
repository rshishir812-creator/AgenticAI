/**
 * Infinite Loop Detector
 *
 * Three complementary strategies:
 *   1. Step budget  — hard cap on graph node executions
 *   2. Token budget — hard cap on total tokens consumed across all LLM calls
 *   3. State cycle  — detect repeated graph state (hashing state snapshot)
 *
 * All three are checked per-step inside the LangGraph StateGraph.
 * When triggered, they throw LoopDetectedError which the graph's error handler
 * catches, emits an AG-UI error event, and halts the run.
 */

import crypto from "node:crypto";

export class LoopDetectedError extends Error {
  constructor(
    public readonly reason: "step_budget" | "token_budget" | "state_cycle",
    public readonly details: string
  ) {
    super(`Loop detected: ${reason} — ${details}`);
    this.name = "LoopDetectedError";
  }
}

export interface LoopDetectorConfig {
  maxSteps:  number;
  maxTokens: number;
  windowSize: number;  // how many recent state hashes to track
}

export class LoopDetector {
  private stepCount   = 0;
  private tokenCount  = 0;
  private stateHashes: string[] = [];

  constructor(private config: LoopDetectorConfig = {
    maxSteps:   25,
    maxTokens:  50_000,
    windowSize: 5,
  }) {}

  step(tokensUsed = 0): void {
    this.stepCount++;
    this.tokenCount += tokensUsed;

    if (this.stepCount > this.config.maxSteps) {
      throw new LoopDetectedError(
        "step_budget",
        `Exceeded ${this.config.maxSteps} steps (${this.stepCount} executed)`
      );
    }

    if (this.tokenCount > this.config.maxTokens) {
      throw new LoopDetectedError(
        "token_budget",
        `Exceeded ${this.config.maxTokens} tokens (${this.tokenCount} used)`
      );
    }
  }

  checkState(state: unknown): void {
    const hash = crypto
      .createHash("sha256")
      .update(JSON.stringify(state))
      .digest("hex")
      .slice(0, 16);

    const isDuplicate = this.stateHashes.includes(hash);
    this.stateHashes = [...this.stateHashes.slice(-this.config.windowSize), hash];

    if (isDuplicate) {
      throw new LoopDetectedError(
        "state_cycle",
        `Identical state seen twice within last ${this.config.windowSize} steps (hash: ${hash})`
      );
    }
  }

  get stats() {
    return {
      steps: this.stepCount,
      tokens: this.tokenCount,
      maxSteps: this.config.maxSteps,
      maxTokens: this.config.maxTokens,
    };
  }
}
