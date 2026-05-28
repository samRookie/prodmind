import type { ArchitectureDiff, DiffInput, DiffOutput, DiffType, DiffSeverity } from './diff-types.ts';
import { fingerprintDiff } from './diff-fingerprint.ts';
import { detectNodeChanges, detectEdgeChanges } from './graph-diff.ts';
import { detectSccChanges, detectRiskChanges, detectHotspotChanges, detectPropagationChanges } from './cognition-diff.ts';
import { detectComplexityChanges, detectHealthChanges } from './metrics-diff.ts';

export function buildDiff(input: {
  diffType: DiffType;
  severity: DiffSeverity;
  previousSnapshotId: string;
  currentSnapshotId: string;
  impactedNodes?: string[];
  impactedClusters?: string[];
  impactedRisks?: string[];
  impactedPatterns?: string[];
  evidence: { metricType: string; previousValue: number; currentValue: number; delta: number; description: string }[];
  metadata?: Record<string, unknown>;
}): ArchitectureDiff {
  const fp = fingerprintDiff({
    diffType: input.diffType, severity: input.severity,
    previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
    impactedNodes: input.impactedNodes ?? [],
    evidence: input.evidence,
  });
  return {
    diffType: input.diffType, severity: input.severity, fingerprint: fp,
    previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
    impactedNodes: [...(input.impactedNodes ?? [])].sort(),
    impactedClusters: [...(input.impactedClusters ?? [])].sort(),
    impactedRisks: [...(input.impactedRisks ?? [])].sort(),
    impactedPatterns: [...(input.impactedPatterns ?? [])].sort(),
    evidence: input.evidence.sort((a, b) => a.metricType.localeCompare(b.metricType)),
    metadata: { ...input.metadata },
  };
}

export class DiffEngine {
  compare(input: DiffInput): DiffOutput {
    const diffs: ArchitectureDiff[] = [
      ...detectNodeChanges(input),
      ...detectEdgeChanges(input),
      ...detectSccChanges(input),
      ...detectRiskChanges(input),
      ...detectHotspotChanges(input),
      ...detectPropagationChanges(input),
      ...detectComplexityChanges(input),
      ...detectHealthChanges(input),
    ];

    return {
      previousSnapshotId: input.previousSnapshotId,
      currentSnapshotId: input.currentSnapshotId,
      diffs: diffs.sort((a, b) => a.fingerprint.localeCompare(b.fingerprint)),
      generatedAt: new Date().toISOString(),
    };
  }
}
