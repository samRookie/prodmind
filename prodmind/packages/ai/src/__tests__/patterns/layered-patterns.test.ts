import { describe, it, expect } from 'vitest';
import { detectLayeredPatterns } from '../../patterns/builtins/layered-patterns.ts';
import type { PatternInput } from '../../patterns/pattern-types.ts';

describe('detectLayeredPatterns', () => {
  it('detects strong layering with no violations', () => {
    const input: PatternInput = {
      snapshotId: 'test', nodes: [{ id: 'a', filePath: '/a.ts', nodeType: 'FILE', symbolName: 'A', language: 'ts' }],
      edges: [], sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
      centrality: [], fanMetrics: [], instability: [], propagationRisk: [],
      couplingDensity: { globalDensity: 0.05, clusterDensities: [], edgeConcentration: 0 },
      complexity: { finalScore: 0.2, complexityLevel: 'LOW', densityScore: 0.2, entropyScore: 0.1, fragmentationScore: 0.1, cycleScore: 0, depthScore: 0.15, sccDensity: 0 },
    };
    const results = detectLayeredPatterns(input);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.patternType).toBe('LAYERED');
  });
});
