export interface StartupAuditResult {
  completed: string[];
  failed: { name: string; error: string }[];
  startedAt: string;
  durationMs: number;
  passed: boolean;
}

export function auditStartup(
  completed: readonly string[],
  failed: readonly { name: string; error: Error }[],
  startedAt: string,
): StartupAuditResult {
  const now = Date.now();
  const startTime = new Date(startedAt).getTime();

  return {
    completed: [...completed],
    failed: failed.map(f => ({ name: f.name, error: f.error.message })),
    startedAt,
    durationMs: now - startTime,
    passed: failed.length === 0,
  };
}
