export class ExecutionScheduler {
  private readonly maxConcurrency: number;

  constructor(config?: { maxConcurrency?: number }) {
    const mc = config?.maxConcurrency ?? 4;
    this.maxConcurrency = mc < 1 ? 1 : mc;
  }

  schedule(
    ready: readonly string[],
    running: readonly string[],
    maxConcurrency?: number,
  ): readonly string[] {
    const limit = maxConcurrency ?? this.maxConcurrency;
    const capacity = Math.max(0, limit - running.length);
    return Object.freeze(ready.slice(0, capacity));
  }

  getMaxConcurrency(): number {
    return this.maxConcurrency;
  }
}
