import { describe, it, expect } from 'vitest';
import { detectUtilityPatterns } from '../../patterns/builtins/utility-patterns.ts';
import type { PatternInput } from '../../patterns/pattern-types.ts';

describe('detectUtilityPatterns', () => {
  it('detects utility gravity well', () => {
    const input: PatternInput = {
      snapshotId: 'test', nodes: [], edges: [], sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
      centrality: [{ nodeId: 'util', inDegree: 30, outDegree: 5, reachabilityCount: 40, dependencyInfluenceScore: 0.8, isUtilityHub: true }],
      fanMetrics: [{ nodeId: 'util', fanIn: 30, fanOut: 5, concentration: 0.85, fanLevel: 'HIGH', isUtilityHotspot: true, isGodModule: false }],
      instability: [], propagationRisk: [],
      couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 },
      complexity: { finalScore: 0, complexityLevel: 'LOW', densityScore: 0, entropyScore: 0, fragmentationScore: 0, cycleScore: 0, depthScore: 0, sccDensity: 0 },
    };
    const results = detectUtilityPatterns(input);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.patternType).toBe('UTILITY_GRAVITY_WELL');
  });
});
