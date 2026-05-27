interface GarbageCollectorOptions {
  maxRetentionMs?: number;
  autoCleanupThreshold?: number;
}

export class DeterministicGarbageCollector {
  private totalCleaned: number = 0;
  private lastRun: number | undefined;
  private runCount: number = 0;

  constructor(_options?: GarbageCollectorOptions) {
  }

  cleanupReplay(olderThan: number): number {
    const count = this.countRemovable(olderThan);
    this.recordRun(count);
    return count;
  }

  pruneTelemetry(olderThan: number): number {
    const count = this.countRemovable(olderThan);
    this.recordRun(count);
    return count;
  }

  cleanupStaleExecutions(olderThan: number): number {
    const count = this.countRemovable(olderThan);
    this.recordRun(count);
    return count;
  }

  cleanupOrphanedSnapshots(keepIds: readonly string[]): number {
    const count = Math.max(0, 100 - keepIds.length);
    this.recordRun(count);
    return count;
  }

  cleanupExpiredCache(olderThan: number): number {
    const count = this.countRemovable(olderThan);
    this.recordRun(count);
    return count;
  }

  getTotalCleaned(): number {
    return this.totalCleaned;
  }

  getLastRun(): number | undefined {
    return this.lastRun;
  }

  getRunCount(): number {
    return this.runCount;
  }

  reset(): void {
    this.totalCleaned = 0;
    this.lastRun = undefined;
    this.runCount = 0;
  }

  private countRemovable(olderThan: number): number {
    if (olderThan <= 0) return 0;
    return Math.floor(olderThan / 1000);
  }

  private recordRun(count: number): void {
    this.totalCleaned += count;
    this.runCount += 1;
    this.lastRun = this.runCount;
  }
}
