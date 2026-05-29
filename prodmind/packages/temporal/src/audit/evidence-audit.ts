import type { TemporalEvidence } from '../types/index.ts';
import type { AuditEntry } from './forecast-audit.ts';

export function auditEvidence(evidence: TemporalEvidence): AuditEntry[] {
  return [
    {
      timestamp: new Date().toISOString(),
      check: `evidence.${evidence.type}.snapshots`,
      passed: evidence.snapshotIds.length > 0,
      details: `Snapshot count: ${evidence.snapshotIds.length}`,
    },
    {
      timestamp: new Date().toISOString(),
      check: `evidence.${evidence.type}.metrics`,
      passed: Object.keys(evidence.metricValues).length > 0,
      details: `Metric keys: ${Object.keys(evidence.metricValues).join(', ')}`,
    },
    {
      timestamp: new Date().toISOString(),
      check: `evidence.${evidence.type}.confidence`,
      passed: evidence.confidence >= 0 && evidence.confidence <= 1,
      details: `Confidence: ${evidence.confidence}`,
    },
  ];
}

export function auditEvidenceBatch(evidenceList: TemporalEvidence[]): AuditEntry[] {
  return evidenceList.flatMap(auditEvidence);
}
