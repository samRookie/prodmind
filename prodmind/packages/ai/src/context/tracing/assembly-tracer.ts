import type { AssemblyMetrics,AssemblyOperation, AssemblyTrace, AssemblyTraceEntry } from '../contracts.ts';
import { createAssemblyMetrics,createAssemblyTrace, createAssemblyTraceEntry } from '../contracts.ts';

export class AssemblyTracer {
  private entries: AssemblyTraceEntry[] = [];
  private startTime: number = 0;
  private counters: Record<string, number> = {};

  start(): void {
    this.entries = [];
    this.startTime = Date.now();
    this.counters = {
      retrieved: 0,
      ranked: 0,
      sliced: 0,
      compressed: 0,
      deduped: 0,
      discarded: 0,
    };
  }

  record(
    operation: AssemblyOperation,
    details: Record<string, unknown>,
    durationMs: number,
    resultCount?: number,
    discardedCount?: number,
  ): void {
    const entry = createAssemblyTraceEntry({
      operation,
      details,
      durationMs,
      resultCount,
      discardedCount,
    });

    this.entries.push(entry);

    switch (operation) {
      case 'retrieve':
        this.counters['retrieved']! += resultCount ?? 0;
        this.counters['discarded']! += discardedCount ?? 0;
        break;
      case 'rank':
        this.counters['ranked']! += resultCount ?? 0;
        this.counters['discarded']! += discardedCount ?? 0;
        break;
      case 'slice':
        this.counters['sliced']! += resultCount ?? 0;
        break;
      case 'compress':
        this.counters['compressed']! += resultCount ?? 0;
        break;
      case 'dedup':
        this.counters['deduped']! += resultCount ?? 0;
        this.counters['discarded']! += discardedCount ?? 0;
        break;
      case 'budget':
        this.counters['discarded']! += discardedCount ?? 0;
        break;
    }
  }

  snapshot(): AssemblyTrace {
    return createAssemblyTrace([...this.entries]);
  }

  metrics(finalTokenCount: number, budgetUtilization: number): AssemblyMetrics {
    const duration = this.startTime > 0 ? Date.now() - this.startTime : 0;

    return createAssemblyMetrics({
      totalRetrieved: this.counters['retrieved'] ?? 0,
      totalRanked: this.counters['ranked'] ?? 0,
      totalSliced: this.counters['sliced'] ?? 0,
      totalCompressed: this.counters['compressed'] ?? 0,
      totalDeduped: this.counters['deduped'] ?? 0,
      totalDiscarded: this.counters['discarded'] ?? 0,
      finalTokenCount,
      budgetUtilization,
      assemblyDurationMs: duration,
    });
  }
}
