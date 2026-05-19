import { performance } from 'node:perf_hooks';

export interface BenchmarkResult {
  durationMs: number;
  heapBeforeMB: number;
  heapAfterMB: number;
  heapDeltaMB: number;
}

export function measureDuration<T>(fn: () => T): { durationMs: number; result: T } {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  return { durationMs, result };
}

export async function measureDurationAsync<T>(fn: () => Promise<T>): Promise<{ durationMs: number; result: T }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { durationMs, result };
}

export function measureMemory(): { heapUsedMB: number; heapTotalMB: number } {
  const mem = process.memoryUsage();
  return {
    heapUsedMB: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotalMB: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
  };
}

export function measureHeapGrowth<T>(fn: () => T): BenchmarkResult {
  const before = process.memoryUsage();
  const start = performance.now();
  fn();
  const durationMs = performance.now() - start;
  const after = process.memoryUsage();
  return {
    durationMs,
    heapBeforeMB: Math.round((before.heapUsed / 1024 / 1024) * 100) / 100,
    heapAfterMB: Math.round((after.heapUsed / 1024 / 1024) * 100) / 100,
    heapDeltaMB: Math.round(((after.heapUsed - before.heapUsed) / 1024 / 1024) * 100) / 100,
  };
}

export interface ScalingReport {
  label: string;
  scales: Array<{ nodeCount: number; durationMs: number; heapDeltaMB: number }>;
  ratio: string;
}

export function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function assertBoundedGrowth(
  previousDuration: number,
  currentDuration: number,
  maxRatio: number,
  label: string,
): void {
  if (previousDuration === 0) return;
  const ratio = currentDuration / previousDuration;
  if (ratio > maxRatio) {
    throw new Error(
      `${label}: growth ratio ${ratio.toFixed(2)}x exceeds max ${maxRatio.toFixed(2)}x ` +
      `(${(previousDuration / 1000).toFixed(2)}s → ${(currentDuration / 1000).toFixed(2)}s)`,
    );
  }
}

export function assertBoundedHeapGrowth(deltaMB: number, maxMB: number, label: string): void {
  if (deltaMB > maxMB) {
    throw new Error(
      `${label}: heap grew by ${deltaMB.toFixed(1)}MB, exceeds max ${maxMB}MB`,
    );
  }
}
