import { describe, it, expect } from 'vitest';
import { ReuseEngine } from '../reuse-engine.ts';
import type { IncrementalGraphDiffResult, IncrementalCompressionDiffResult } from '../diff-types.ts';

describe('ReuseEngine', () => {
  it('produces reuse plan for unchanged artifacts', () => {
    const engine = new ReuseEngine();
    const graphDiff: IncrementalGraphDiffResult = {
      addedNodes: [], removedNodes: [], modifiedNodes: [],
      unchangedNodeIds: ['n1', 'n2'],
      addedEdges: [], removedEdges: [],
      totalPreviousNodes: 2, totalCurrentNodes: 2,
      totalPreviousEdges: 0, totalCurrentEdges: 0,
      hasNodeChanges: false, hasEdgeChanges: false,
    };
    const compressionDiff: IncrementalCompressionDiffResult = {
      reusableFileContextPaths: ['a.ts', 'b.ts'],
      invalidFileContextPaths: [],
      reusableModuleContextPaths: ['src/core'],
      invalidModuleContextPaths: [],
      repositoryContextChanged: false,
      metricsChanged: false,
      totalPreviousFileContexts: 2,
      totalCurrentFileContexts: 2,
      hasChanges: false,
    };

    const plan = engine.plan(graphDiff, compressionDiff, 'snap-1');

    expect(plan.reuseNodes).toHaveLength(2);
    expect(plan.reuseFileContexts).toHaveLength(2);
    expect(plan.reuseModuleContexts).toHaveLength(1);
    expect(plan.recomputeAll).toBe(false);
  });

  it('returns empty plan with recomputeAll when no base snapshot', () => {
    const engine = new ReuseEngine();
    const emptyDiff: IncrementalGraphDiffResult = {
      addedNodes: [], removedNodes: [], modifiedNodes: [],
      unchangedNodeIds: [],
      addedEdges: [], removedEdges: [],
      totalPreviousNodes: 0, totalCurrentNodes: 0,
      totalPreviousEdges: 0, totalCurrentEdges: 0,
      hasNodeChanges: false, hasEdgeChanges: false,
    };
    const emptyComp: IncrementalCompressionDiffResult = {
      reusableFileContextPaths: [], invalidFileContextPaths: [],
      reusableModuleContextPaths: [], invalidModuleContextPaths: [],
      repositoryContextChanged: false, metricsChanged: false,
      totalPreviousFileContexts: 0, totalCurrentFileContexts: 0,
      hasChanges: false,
    };

    const plan = engine.plan(emptyDiff, emptyComp, null);

    expect(plan.reuseNodes).toHaveLength(0);
    expect(plan.recomputeAll).toBe(true);
  });

  it('includes reuse entries from compression diff', () => {
    const engine = new ReuseEngine();
    const graphDiff: IncrementalGraphDiffResult = {
      addedNodes: [], removedNodes: [], modifiedNodes: [],
      unchangedNodeIds: [],
      addedEdges: [], removedEdges: [],
      totalPreviousNodes: 0, totalCurrentNodes: 0,
      totalPreviousEdges: 0, totalCurrentEdges: 0,
      hasNodeChanges: false, hasEdgeChanges: false,
    };
    const compressionDiff: IncrementalCompressionDiffResult = {
      reusableFileContextPaths: ['a.ts'],
      invalidFileContextPaths: ['b.ts'],
      reusableModuleContextPaths: ['src/core'],
      invalidModuleContextPaths: [],
      repositoryContextChanged: false,
      metricsChanged: false,
      totalPreviousFileContexts: 2,
      totalCurrentFileContexts: 2,
      hasChanges: true,
    };

    const plan = engine.plan(graphDiff, compressionDiff, 'snap-1');

    expect(plan.reuseFileContexts).toHaveLength(1);
    expect(plan.reuseFileContexts[0]!.artifactId).toBe('a.ts');
    expect(plan.reuseModuleContexts).toHaveLength(1);
    expect(plan.reuseModuleContexts[0]!.artifactId).toBe('src/core');
  });
});
