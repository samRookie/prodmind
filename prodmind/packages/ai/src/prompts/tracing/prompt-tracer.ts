import { now } from '@prodmind/db';

import type { PromptTrace, PromptTraceEntry } from '../contracts/prompt-contracts.ts';

export class PromptTracer {
  private entries: PromptTraceEntry[] = [];
  private startTime = 0;

  start(): void {
    this.entries = [];
    this.startTime = Date.now();
  }

  record(
    operation: string,
    details: Record<string, unknown>,
    durationMs?: number,
  ): void {
    this.entries.push(Object.freeze({
      operation,
      timestamp: now(),
      details: Object.freeze(details ?? {}),
      durationMs: durationMs ?? 0,
    }));
  }

  getTrace(): PromptTrace {
    const sorted = [...this.entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const totalDurationMs = sorted.reduce((sum, e) => sum + e.durationMs, 0);
    return Object.freeze({
      entries: Object.freeze(sorted),
      totalDurationMs,
      operationCount: sorted.length,
    });
  }

  getElapsedMs(): number {
    return this.startTime > 0 ? Date.now() - this.startTime : 0;
  }

  clear(): void {
    this.entries = [];
    this.startTime = 0;
  }
}
