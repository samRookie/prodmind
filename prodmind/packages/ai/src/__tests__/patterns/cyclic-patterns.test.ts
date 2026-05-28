import { describe, it, expect } from 'vitest';
import { detectCyclicPatterns } from '../../patterns/builtins/cyclic-patterns.ts';
import type { PatternInput } from '../../patterns/pattern-types.ts';

describe('detectCyclicPatterns', () => {
  it('detects cyclic dependency groups', () => {
    const compNodes = new Map<number, string[]>();
    compNodes.set(1, ['a', 'b', 'c', 'd']);
    compNodes.set(2, ['e']);
    const input: PatternInput = {
      snapshotId: 'test', nodes: [], edges: [],
      sccData: { componentCount: 2, componentMap: new Map(), condensationDAG: new Map(), componentNodes: compNodes },
      centrality: [], fanMetrics: [], instability: [], propagationRisk: [],
      couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 },
      complexity: { finalScore: 0, complexityLevel: 'LOW', densityScore: 0, entropyScore: 0, fragmentationScore: 0, cycleScore: 0.5, depthScore: 0, sccDensity: 0.3 },
    };
    const results = detectCyclicPatterns(input);
    expect(results).toHaveLength(1);
    expect(results[0]!.patternType).toBe('CYCLIC_CLUSTER');
    expect(results[0]!.impactedNodes).toEqual(['a', 'b', 'c', 'd']);
  });

  it('skips single-node components', () => {
    const compNodes = new Map<number, string[]>();
    compNodes.set(1, ['a']);
    const input: PatternInput = {
      snapshotId: 'test', nodes: [], edges: [], sccData: { componentCount: 1, componentMap: new Map(), condensationDAG: new Map(), componentNodes: compNodes },
      centrality: [], fanMetrics: [], instability: [], propagationRisk: [],
      couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 },
      complexity: { finalScore: 0, complexityLevel: 'LOW', densityScore: 0, entropyScore: 0, fragmentationScore: 0, cycleScore: 0, depthScore: 0, sccDensity: 0 },
    };
    const results = detectCyclicPatterns(input);
    expect(results).toHaveLength(0);
  });
});
