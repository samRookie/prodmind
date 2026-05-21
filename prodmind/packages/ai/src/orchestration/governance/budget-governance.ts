export interface BudgetConfig {
  readonly maxTotalNodes?: number;
  readonly maxTotalTimeMs?: number;
}

export interface BudgetState {
  readonly remainingNodes: number;
  readonly remainingTimeMs: number;
  readonly usedNodes: number;
  readonly usedTimeMs: number;
  readonly exhausted: boolean;
}

export class BudgetGovernance {
  private readonly maxNodes: number;
  private readonly maxTimeMs: number;
  private remainingNodes: number;
  private remainingTimeMs: number;
  private usedNodes = 0;
  private usedTimeMs = 0;

  constructor(config?: BudgetConfig) {
    this.maxNodes = config?.maxTotalNodes ?? 1000;
    this.maxTimeMs = config?.maxTotalTimeMs ?? 300_000;
    this.remainingNodes = this.maxNodes;
    this.remainingTimeMs = this.maxTimeMs;
  }

  allowExecution(): boolean {
    return this.remainingNodes > 0 && this.remainingTimeMs > 0;
  }

  recordNodeComplete(durationMs: number): void {
    this.usedNodes++;
    this.usedTimeMs += durationMs;
    this.remainingNodes = Math.max(0, this.remainingNodes - 1);
    this.remainingTimeMs = Math.max(0, this.remainingTimeMs - durationMs);
  }

  getState(): BudgetState {
    return Object.freeze({
      remainingNodes: this.remainingNodes,
      remainingTimeMs: this.remainingTimeMs,
      usedNodes: this.usedNodes,
      usedTimeMs: this.usedTimeMs,
      exhausted: this.remainingNodes <= 0 || this.remainingTimeMs <= 0,
    });
  }

  reset(): void {
    this.remainingNodes = this.maxNodes;
    this.remainingTimeMs = this.maxTimeMs;
    this.usedNodes = 0;
    this.usedTimeMs = 0;
  }
}
