import type { DriftChange,DriftReport } from '../types/index.ts';
import type { InsightSeverity } from '../types/index.ts';
import { generateId } from '../utils/index.ts';

export function compareGraphSnapshots(
  _previousSnapshotId: string,
  _currentSnapshotId: string,
  previousNodes: string[],
  currentNodes: string[],
  previousEdges: Array<{ source: string; target: string }>,
  currentEdges: Array<{ source: string; target: string }>,
): DriftChange[] {
  const changes: DriftChange[] = [];
  const prevNodeSet = new Set(previousNodes);
  const currNodeSet = new Set(currentNodes);
  for (const node of currentNodes) {
    if (!prevNodeSet.has(node)) {
      changes.push({ type: 'added', nodeId: node, metric: 'node', oldValue: 0, newValue: 1 });
    }
  }
  for (const node of previousNodes) {
    if (!currNodeSet.has(node)) {
      changes.push({ type: 'removed', nodeId: node, metric: 'node', oldValue: 1, newValue: 0 });
    }
  }
  const prevEdgeSet = new Set(previousEdges.map(e => `${e.source}->${e.target}`));
  const currEdgeSet = new Set(currentEdges.map(e => `${e.source}->${e.target}`));
  for (const edge of currentEdges) {
    const key = `${edge.source}->${edge.target}`;
    if (!prevEdgeSet.has(key)) {
      changes.push({ type: 'added', nodeId: key, metric: 'edge', oldValue: 0, newValue: 1 });
    }
  }
  for (const edge of previousEdges) {
    const key = `${edge.source}->${edge.target}`;
    if (!currEdgeSet.has(key)) {
      changes.push({ type: 'removed', nodeId: key, metric: 'edge', oldValue: 1, newValue: 0 });
    }
  }
  return changes;
}

export function computeDriftMetrics(changes: DriftChange[]): Record<string, number> {
  const added = changes.filter(c => c.type === 'added').length;
  const removed = changes.filter(c => c.type === 'removed').length;
  const modified = changes.filter(c => c.type === 'modified').length;
  const total = added + removed + modified;
  return {
    totalChanges: total,
    addedCount: added,
    removedCount: removed,
    modifiedCount: modified,
    churnRate: total > 0 ? (added + removed) / total : 0,
  };
}

export function createDriftReport(
  driftType: string,
  previousSnapshotId: string,
  currentSnapshotId: string,
  changes: DriftChange[],
): DriftReport {
  const changeCount = changes.length;
  const severity: InsightSeverity = changeCount > 50 ? 'CRITICAL' : changeCount > 20 ? 'HIGH' : changeCount > 10 ? 'MODERATE' : 'LOW';
  return {
    id: generateId('drift'),
    driftType,
    severity,
    description: `${driftType}: ${changeCount} changes between snapshots ${previousSnapshotId} and ${currentSnapshotId}`,
    previousSnapshotId,
    currentSnapshotId,
    changes,
    metrics: computeDriftMetrics(changes),
  };
}
