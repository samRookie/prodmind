export interface ReplayAuditResult {
  enabled: boolean;
  snapshotCount: number;
  integrityValid: boolean;
  lastReplayTimestamp: string | null;
  passed: boolean;
}

export class ReplayAudit {
  audit(enabled: boolean, snapshotCount?: number, integrityValid?: boolean): ReplayAuditResult {
    return {
      enabled,
      snapshotCount: snapshotCount ?? 0,
      integrityValid: integrityValid ?? true,
      lastReplayTimestamp: null,
      passed: enabled && (integrityValid ?? true),
    };
  }
}
