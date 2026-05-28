import type { ArchitectureDiff, DiffInput } from './diff-types.ts';
import { detectNodeChanges, detectEdgeChanges } from './graph-diff.ts';
import { detectSccChanges } from './cognition-diff.ts';

export function detectTopologyChanges(input: DiffInput): ArchitectureDiff[] {
  return [
    ...detectNodeChanges(input),
    ...detectEdgeChanges(input),
    ...detectSccChanges(input),
  ];
}

export function detectPropagationExpansion(input: DiffInput): ArchitectureDiff[] {
  const diffs: ArchitectureDiff[] = [];
  const prevProp = new Map((input.previousPropagation ?? []).map(p => [p.nodeId, p.propagationPressure]));
  const currProp = new Map((input.currentPropagation ?? []).map(p => [p.nodeId, p.propagationPressure]));
  const newHighPropagation = [...currProp.entries()].filter(([id, p]) => p >= 0.7 && (prevProp.get(id) ?? 0) < 0.5);
  if (newHighPropagation.length > 0) {
    diffs.push({
      diffType: 'PROPAGATION_EXPANDED', severity: 'HIGH', fingerprint: '',
      previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
      impactedNodes: newHighPropagation.map(([id]) => id),
      impactedClusters: [], impactedRisks: [], impactedPatterns: [],
      evidence: newHighPropagation.map(([id, p]) => ({
        metricType: 'PROPAGATION_PRESSURE', previousValue: prevProp.get(id) ?? 0,
        currentValue: p, delta: p - (prevProp.get(id) ?? 0),
        description: `${id} propagation pressure increased to ${p.toFixed(3)}`,
      })),
      metadata: { newHighPropagation: newHighPropagation.map(([id]) => id) },
    });
  }
  return diffs;
}
