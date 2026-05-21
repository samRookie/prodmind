import { SandboxLimits } from './sandbox-limits.ts';

export class SandboxGovernance {
  private readonly _limits: SandboxLimits;
  private _executionCount = 0;
  private _totalDurationMs = 0;

  constructor(limits: SandboxLimits) {
    this._limits = limits;
  }

  get executionCount(): number {
    return this._executionCount;
  }

  get totalDurationMs(): number {
    return this._totalDurationMs;
  }

  canExecute(): boolean {
    return (
      this._executionCount < this._limits.maxExecutions &&
      this._totalDurationMs < this._limits.maxCumulativeDurationMs
    );
  }

  recordExecution(durationMs: number): void {
    this._executionCount++;
    this._totalDurationMs += durationMs;
  }

  reset(): void {
    this._executionCount = 0;
    this._totalDurationMs = 0;
  }
}
