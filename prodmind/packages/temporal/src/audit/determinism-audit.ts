import type { AuditEntry } from './forecast-audit.ts';

export function auditDeterminism(
  label: string,
  originalValue: number,
  replayedValue: number,
): AuditEntry[] {
  return [
    {
      timestamp: new Date().toISOString(),
      check: `determinism.${label}`,
      passed: originalValue === replayedValue,
      details: `Original: ${originalValue}, Replayed: ${replayedValue}`,
    },
  ];
}

export function auditDeterminismBatch(
  checks: Array<{ label: string; original: number; replayed: number }>,
): AuditEntry[] {
  return checks.map((c) => ({
    timestamp: new Date().toISOString(),
    check: `determinism.${c.label}`,
    passed: c.original === c.replayed,
    details: `Original: ${c.original}, Replayed: ${c.replayed}`,
  }));
}
