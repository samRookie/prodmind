export interface ExecutionResult<T> {
  result: T;
  durationMs: number;
}

export async function measureExecution<T>(
  fn: () => Promise<T>,
  _label?: string,
): Promise<ExecutionResult<T>> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

export function measureSyncExecution<T>(
  fn: () => T,
  _label?: string,
): ExecutionResult<T> {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  return { result, durationMs };
}

export function formatDuration(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(0)}\u00B5s`;
  }
  if (ms < 1000) {
    return `${ms.toFixed(1)}ms`;
  }
  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  const minutes = Math.floor(ms / 60_000);
  const seconds = ((ms % 60_000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}
