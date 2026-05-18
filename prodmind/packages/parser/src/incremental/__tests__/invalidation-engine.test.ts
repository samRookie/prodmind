import { describe, it, expect } from 'vitest';
import { InvalidationEngine } from '../invalidation-engine.ts';
import type { IncrementalGraphDiffResult, IncrementalSemanticDiffResult, IncrementalDependencyImpactResult } from '../diff-types.ts';

describe('InvalidationEngine', () => {
  it('invalidates modified and removed nodes', () => {
    const engine = new InvalidationEngine();
    const graphDiff: IncrementalGraphDiffResult = {
      addedNodes: [{ id: 'n3', filePath: 'c.ts', fileHash: '3', nodeType: 'FILE', symbolName: null }],
      removedNodes: [{ id: 'n1', filePath: 'a.ts', fileHash: '1', nodeType: 'FILE', symbolName: null }],
      modifiedNodes: [{ id: 'n2', filePath: 'b.ts', fileHash: '4', nodeType: 'FILE', symbolName: null }],
      unchangedNodeIds: ['n4'],
      addedEdges: [], removedEdges: [],
      totalPreviousNodes: 3, totalCurrentNodes: 3,
      totalPreviousEdges: 0, totalCurrentEdges: 0,
      hasNodeChanges: true, hasEdgeChanges: false,
    };

    const result = engine.compute(graphDiff, makeEmptySemanticDiff(), makeEmptyImpact());

    const reasons = result.invalidations.map((i) => i.invalidationReason);
    expect(reasons.filter((r) => r === 'FILE_MODIFIED')).toHaveLength(3);
    expect(result.preservedNodeCount).toBe(1);
  });

  it('invalidates transitive dependencies', () => {
    const engine = new InvalidationEngine();
    const graphDiff: IncrementalGraphDiffResult = {
      addedNodes: [], removedNodes: [], modifiedNodes: [],
      unchangedNodeIds: ['n1'],
      addedEdges: [], removedEdges: [],
      totalPreviousNodes: 1, totalCurrentNodes: 1,
      totalPreviousEdges: 0, totalCurrentEdges: 0,
      hasNodeChanges: false, hasEdgeChanges: false,
    };
    const impact: IncrementalDependencyImpactResult = {
      impactedNodeIds: ['n2', 'n3'],
      impactedFilePaths: ['b.ts', 'c.ts'],
      impactedModulePaths: ['src/shared'],
      directImpactCount: 0,
      transitiveImpactCount: 2,
      recomputationScope: 'partial',
    };

    const result = engine.compute(graphDiff, makeEmptySemanticDiff(), impact);

    expect(
      result.invalidations.some((i) => i.invalidationReason === 'TRANSITIVE_DEPENDENCY'),
    ).toBe(true);
  });

  it('invalidates semantic drift', () => {
    const engine = new InvalidationEngine();
    const semanticDiff: IncrementalSemanticDiffResult = {
      changedModulePaths: ['src/core'],
      unchangedModulePaths: [],
      couplingDrift: [],
      boundaryDrift: [],
      classificationDrift: [{ filePath: 'a.ts', from: 'utility', to: 'business-logic' }],
      totalPreviousModules: 1,
      totalCurrentModules: 1,
      hasDrift: true,
    };

    const result = engine.compute(makeEmptyGraphDiff(), semanticDiff, makeEmptyImpact());

    expect(
      result.invalidations.some((i) => i.regionIdentifier.includes('a.ts')),
    ).toBe(true);
    expect(
      result.invalidations.some((i) => i.regionType === 'MODULE' && i.regionIdentifier === 'src/core'),
    ).toBe(true);
  });
});

function makeEmptySemanticDiff(): IncrementalSemanticDiffResult {
  return {
    changedModulePaths: [],
    unchangedModulePaths: [],
    couplingDrift: [],
    boundaryDrift: [],
    classificationDrift: [],
    totalPreviousModules: 0,
    totalCurrentModules: 0,
    hasDrift: false,
  };
}

function makeEmptyImpact(): IncrementalDependencyImpactResult {
  return {
    impactedNodeIds: [],
    impactedFilePaths: [],
    impactedModulePaths: [],
    directImpactCount: 0,
    transitiveImpactCount: 0,
    recomputationScope: 'none',
  };
}

function makeEmptyGraphDiff(): IncrementalGraphDiffResult {
  return {
    addedNodes: [], removedNodes: [], modifiedNodes: [],
    unchangedNodeIds: [],
    addedEdges: [], removedEdges: [],
    totalPreviousNodes: 0, totalCurrentNodes: 0,
    totalPreviousEdges: 0, totalCurrentEdges: 0,
    hasNodeChanges: false, hasEdgeChanges: false,
  };
}
