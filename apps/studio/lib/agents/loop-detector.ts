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

export class LoopDetector {
  private stepCount   = 0;
  private tokenCount  = 0;
  private stateHashes: string[] = [];

  constructor(private config = { maxSteps: 25, maxTokens: 50_000, windowSize: 5 }) {}

  step(tokensUsed = 0): void {
    this.stepCount++;
    this.tokenCount += tokensUsed;

    if (this.stepCount > this.config.maxSteps)
      throw new LoopDetectedError("step_budget", `Exceeded ${this.config.maxSteps} steps`);

    if (this.tokenCount > this.config.maxTokens)
      throw new LoopDetectedError("token_budget", `Exceeded ${this.config.maxTokens} tokens`);
  }

  checkState(state: unknown): void {
    const hash = crypto.createHash("sha256").update(JSON.stringify(state)).digest("hex").slice(0, 16);
    const isDuplicate = this.stateHashes.includes(hash);
    this.stateHashes = [...this.stateHashes.slice(-this.config.windowSize), hash];
    if (isDuplicate)
      throw new LoopDetectedError("state_cycle", `Repeated state hash ${hash}`);
  }
}
