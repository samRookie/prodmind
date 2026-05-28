import type { ArchitectureDiff } from './diff-types.ts';

export interface NormalizedDiff {
  diffType: string;
  severity: string;
  fingerprint: string;
  previousSnapshotId: string;
  currentSnapshotId: string;
  impactedNodeCount: number;
  evidenceCount: number;
}

export function normalizeDiff(diff: ArchitectureDiff): NormalizedDiff {
  return {
    diffType: diff.diffType,
    severity: diff.severity,
    fingerprint: diff.fingerprint,
    previousSnapshotId: diff.previousSnapshotId,
    currentSnapshotId: diff.currentSnapshotId,
    impactedNodeCount: diff.impactedNodes.length,
    evidenceCount: diff.evidence.length,
  };
}

export function normalizeDiffBatch(diffs: ArchitectureDiff[]): NormalizedDiff[] {
  return diffs.map(normalizeDiff).sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
}
