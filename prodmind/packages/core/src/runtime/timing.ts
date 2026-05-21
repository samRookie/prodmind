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
