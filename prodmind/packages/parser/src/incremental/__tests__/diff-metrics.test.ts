import { describe, it, expect } from 'vitest';
import { DiffMetricsCalculator } from '../diff-metrics.ts';
import type { IncrementalSnapshotDiffResult, IncrementalGraphDiffResult, ReusePlan, InvalidationResult } from '../diff-types.ts';

describe('DiffMetricsCalculator', () => {
  it('calculates savings ratios for partial reuse', () => {
    const calc = new DiffMetricsCalculator();
    const snapshotDiff: IncrementalSnapshotDiffResult = {
      projectId: 'p1',
      baseSnapshotId: 'snap-1',
      currentSnapshotId: 'snap-2',
      fileChanges: { added: ['b.ts'], removed: [], modified: [], unchanged: ['a.ts'] },
      totalPreviousFiles: 1,
      totalCurrentFiles: 2,
      hasChanges: true,
    };
    const graphDiff: IncrementalGraphDiffResult = {
      addedNodes: [{ id: 'n2', filePath: 'b.ts', fileHash: '2', nodeType: 'FILE', symbolName: null }],
      removedNodes: [], modifiedNodes: [],
      unchangedNodeIds: ['n1'],
      addedEdges: [], removedEdges: [],
      totalPreviousNodes: 1, totalCurrentNodes: 2,
      totalPreviousEdges: 0, totalCurrentEdges: 0,
      hasNodeChanges: true, hasEdgeChanges: false,
    };
    const reusePlan: ReusePlan = {
      reuseNodes: [{ artifactType: 'NODE', artifactId: 'n1', sourceSnapshotId: 'snap-1' }],
      reuseEdges: [],
      reuseFileContexts: [{ artifactType: 'FILE_CONTEXT', artifactId: 'a.ts', sourceSnapshotId: 'snap-1' }],
      reuseModuleContexts: [],
      recomputeAll: false,
    };
    const invalidation: InvalidationResult = {
      invalidations: [{ regionType: 'NODE', regionIdentifier: 'n2', invalidationReason: 'FILE_MODIFIED' }],
      totalInvalidated: 1,
      preservedNodeCount: 1,
      preservedEdgeCount: 0,
    };

    const metrics = calc.calculate(snapshotDiff, graphDiff, reusePlan, invalidation);

    expect(metrics.reusedNodeCount).toBe(1);
    expect(metrics.recomputedNodeCount).toBe(1);
    expect(metrics.incrementalSavingsRatio).toBeGreaterThan(0);
    expect(metrics.traversalReductionRatio).toBeGreaterThan(0);
  });

  it('returns zero savings for full recompute', () => {
    const calc = new DiffMetricsCalculator();
    const snapshotDiff: IncrementalSnapshotDiffResult = {
      projectId: 'p1',
      baseSnapshotId: null,
      currentSnapshotId: 'snap-1',
      fileChanges: { added: ['a.ts'], removed: [], modified: [], unchanged: [] },
      totalPreviousFiles: 0,
      totalCurrentFiles: 1,
      hasChanges: true,
    };
    const graphDiff: IncrementalGraphDiffResult = {
      addedNodes: [{ id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null }],
      removedNodes: [], modifiedNodes: [],
      unchangedNodeIds: [],
      addedEdges: [], removedEdges: [],
      totalPreviousNodes: 0, totalCurrentNodes: 1,
      totalPreviousEdges: 0, totalCurrentEdges: 0,
      hasNodeChanges: true, hasEdgeChanges: false,
    };
    const reusePlan: ReusePlan = { reuseNodes: [], reuseEdges: [], reuseFileContexts: [], reuseModuleContexts: [], recomputeAll: true };
    const invalidation: InvalidationResult = {
      invalidations: [],
      totalInvalidated: 0,
      preservedNodeCount: 0,
      preservedEdgeCount: 0,
    };

    const metrics = calc.calculate(snapshotDiff, graphDiff, reusePlan, invalidation);

    expect(metrics.reusedNodeCount).toBe(0);
    expect(metrics.incrementalSavingsRatio).toBe(0);
    expect(metrics.recomputationReductionRatio).toBe(0);
  });

  it('handles full reuse edge case', () => {
    const calc = new DiffMetricsCalculator();
    const snapshotDiff: IncrementalSnapshotDiffResult = {
      projectId: 'p1',
      baseSnapshotId: 'snap-1',
      currentSnapshotId: 'snap-2',
      fileChanges: { added: [], removed: [], modified: [], unchanged: ['a.ts'] },
      totalPreviousFiles: 1,
      totalCurrentFiles: 1,
      hasChanges: false,
    };
    const graphDiff: IncrementalGraphDiffResult = {
      addedNodes: [], removedNodes: [], modifiedNodes: [],
      unchangedNodeIds: ['n1'],
      addedEdges: [], removedEdges: [],
      totalPreviousNodes: 1, totalCurrentNodes: 1,
      totalPreviousEdges: 1, totalCurrentEdges: 1,
      hasNodeChanges: false, hasEdgeChanges: false,
    };
    const reusePlan: ReusePlan = {
      reuseNodes: [{ artifactType: 'NODE', artifactId: 'n1', sourceSnapshotId: 'snap-1' }],
      reuseEdges: [],
      reuseFileContexts: [{ artifactType: 'FILE_CONTEXT', artifactId: 'a.ts', sourceSnapshotId: 'snap-1' }],
      reuseModuleContexts: [],
      recomputeAll: false,
    };
    const invalidation: InvalidationResult = {
      invalidations: [],
      totalInvalidated: 0,
      preservedNodeCount: 1,
      preservedEdgeCount: 1,
    };

    const metrics = calc.calculate(snapshotDiff, graphDiff, reusePlan, invalidation);

    expect(metrics.reusedNodeCount).toBe(1);
    expect(metrics.recomputedNodeCount).toBe(0);
  });
});
