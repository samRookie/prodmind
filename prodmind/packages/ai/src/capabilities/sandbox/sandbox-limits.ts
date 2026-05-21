export class SandboxLimits {
  readonly maxExecutions: number;
  readonly maxCumulativeDurationMs: number;
  readonly maxSingleDurationMs: number;
  readonly maxConcurrency: number;

  constructor(overrides?: Partial<SandboxLimits>) {
    this.maxExecutions = overrides?.maxExecutions ?? 100;
    this.maxCumulativeDurationMs = overrides?.maxCumulativeDurationMs ?? 60_000;
    this.maxSingleDurationMs = overrides?.maxSingleDurationMs ?? 10_000;
    this.maxConcurrency = overrides?.maxConcurrency ?? 3;
    Object.freeze(this);
  }
}
