import type { AuditEntry } from './forecast-audit.ts';

export interface ReplayAuditCheck {
  name: string;
  original: unknown;
  replayed: unknown;
}

export function auditReplayCheck(check: ReplayAuditCheck): AuditEntry {
  return {
    timestamp: new Date().toISOString(),
    check: `replay.${check.name}`,
    passed: check.original === check.replayed,
    details: `Original: ${JSON.stringify(check.original)}, Replayed: ${JSON.stringify(check.replayed)}`,
  };
}

export function auditReplayBatch(checks: ReplayAuditCheck[]): AuditEntry[] {
  return checks.map(auditReplayCheck);
}
