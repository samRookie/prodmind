import type { DriftReport } from '../types/index.ts';
import { compareGraphSnapshots, createDriftReport } from './drift-comparison.ts';

export class DriftEngine {
  detectGraphEvolution(
    previousSnapshotId: string,
    currentSnapshotId: string,
    previousNodes: string[],
    currentNodes: string[],
    previousEdges: Array<{ source: string; target: string }>,
    currentEdges: Array<{ source: string; target: string }>,
  ): DriftReport {
    const changes = compareGraphSnapshots(
      previousSnapshotId, currentSnapshotId,
      previousNodes, currentNodes,
      previousEdges, currentEdges,
    );
    return createDriftReport('graph-evolution', previousSnapshotId, currentSnapshotId, changes);
  }

  detectComplexityDrift(
    previousSnapshotId: string,
    currentSnapshotId: string,
    prevDensity: number,
    currDensity: number,
    prevEntropy: number,
    currEntropy: number,
  ): DriftReport {
    const changes: Array<{ type: 'added' | 'removed' | 'modified'; nodeId: string; metric: string; oldValue: number; newValue: number }> = [];
    if (Math.abs(currDensity - prevDensity) > 0.01) {
      changes.push({ type: 'modified', nodeId: 'graph', metric: 'density', oldValue: prevDensity, newValue: currDensity });
    }
    if (Math.abs(currEntropy - prevEntropy) > 0.01) {
      changes.push({ type: 'modified', nodeId: 'graph', metric: 'entropy', oldValue: prevEntropy, newValue: currEntropy });
    }
    return createDriftReport('complexity-drift', previousSnapshotId, currentSnapshotId, changes);
  }
}
