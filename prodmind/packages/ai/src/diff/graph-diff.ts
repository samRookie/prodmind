import type { ArchitectureDiff, DiffInput, DiffSeverity } from './diff-types.ts';
import { buildDiff } from './diff-engine.ts';

export function detectNodeChanges(input: DiffInput): ArchitectureDiff[] {
  const diffs: ArchitectureDiff[] = [];
  const prevNodes = new Set((input.previousNodes ?? []).map(n => n.id));
  const currNodes = new Set((input.currentNodes ?? []).map(n => n.id));

  const added = [...currNodes].filter(n => !prevNodes.has(n));
  const removed = [...prevNodes].filter(n => !currNodes.has(n));

  if (added.length > 0) {
    diffs.push(buildDiff({
      diffType: 'NODE_ADDED', severity: added.length > 10 ? 'HIGH' : added.length > 5 ? 'MODERATE' : 'LOW',
      previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
      impactedNodes: added, evidence: [{ metricType: 'NODES_ADDED', previousValue: 0, currentValue: added.length, delta: added.length, description: `${added.length} nodes added` }],
      metadata: { added },
    }));
  }
  if (removed.length > 0) {
    diffs.push(buildDiff({
      diffType: 'NODE_REMOVED', severity: removed.length > 10 ? 'HIGH' : removed.length > 5 ? 'MODERATE' : 'LOW',
      previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
      impactedNodes: removed, evidence: [{ metricType: 'NODES_REMOVED', previousValue: removed.length, currentValue: 0, delta: -removed.length, description: `${removed.length} nodes removed` }],
      metadata: { removed },
    }));
  }
  return diffs;
}

export function detectEdgeChanges(input: DiffInput): ArchitectureDiff[] {
  const diffs: ArchitectureDiff[] = [];
  const prevEdgeKeys = new Set((input.previousEdges ?? []).map(e => `${e.sourceNodeId}->${e.targetNodeId}`));
  const currEdgeKeys = new Set((input.currentEdges ?? []).map(e => `${e.sourceNodeId}->${e.targetNodeId}`));

  const added = [...currEdgeKeys].filter(e => !prevEdgeKeys.has(e));
  const removed = [...prevEdgeKeys].filter(e => !currEdgeKeys.has(e));

  if (added.length > 0) {
    const severity: DiffSeverity = added.length > 20 ? 'CRITICAL' : added.length > 10 ? 'HIGH' : 'MODERATE';
    diffs.push(buildDiff({
      diffType: 'EDGE_ADDED', severity, previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
      impactedNodes: [], evidence: [{ metricType: 'EDGES_ADDED', previousValue: 0, currentValue: added.length, delta: added.length, description: `${added.length} edges added` }],
      metadata: { added: added.slice(0, 100) },
    }));
  }
  if (removed.length > 0) {
    diffs.push(buildDiff({
      diffType: 'EDGE_REMOVED', severity: 'MODERATE', previousSnapshotId: input.previousSnapshotId, currentSnapshotId: input.currentSnapshotId,
      impactedNodes: [], evidence: [{ metricType: 'EDGES_REMOVED', previousValue: removed.length, currentValue: 0, delta: -removed.length, description: `${removed.length} edges removed` }],
      metadata: { removed: removed.slice(0, 100) },
    }));
  }
  return diffs;
}
