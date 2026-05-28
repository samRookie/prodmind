import { describe, it, expect } from 'vitest';
import { detectAntiPatterns } from '../../patterns/anti-pattern-detectors.ts';
import type { PatternInput } from '../../patterns/pattern-types.ts';

function makeInput(overrides?: Partial<PatternInput>): PatternInput {
  return {
    snapshotId: 'test', nodes: [{ id: 'a', filePath: '/a.ts', nodeType: 'FILE', symbolName: 'A', language: 'ts' }],
    edges: [], sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
    centrality: [], fanMetrics: [], instability: [], propagationRisk: [],
    couplingDensity: { globalDensity: 0.05, clusterDensities: [], edgeConcentration: 0 },
    complexity: { finalScore: 0, complexityLevel: 'LOW', densityScore: 0, entropyScore: 0, fragmentationScore: 0, cycleScore: 0, depthScore: 0, sccDensity: 0 },
    ...overrides,
  };
}

describe('detectAntiPatterns', () => {
  it('detects layer leakage', () => {
    const result = detectAntiPatterns(makeInput({ edges: [{ id: 'e1', sourceNodeId: 'a', targetNodeId: 'b', edgeType: 'CROSS_LAYER', weight: 1 }, { id: 'e2', sourceNodeId: 'b', targetNodeId: 'c', edgeType: 'BACK_EDGE', weight: 1 }] }));
    const leakage = result.find(d => d.patternType === 'LAYER_LEAKAGE');
    expect(leakage).toBeDefined();
  });

  it('detects utility gravity well', () => {
    const result = detectAntiPatterns(makeInput({ fanMetrics: [{ nodeId: 'util', fanIn: 40, fanOut: 5, concentration: 0.9, fanLevel: 'HIGH', isUtilityHotspot: true, isGodModule: false }] }));
    const well = result.find(d => d.patternType === 'UTILITY_GRAVITY_WELL');
    expect(well).toBeDefined();
  });

  it('detects architectural fragmentation', () => {
    const result = detectAntiPatterns(makeInput({ couplingDensity: { globalDensity: 0.02, clusterDensities: [{ clusterName: 'a', density: 0.01, nodeCount: 2 }, { clusterName: 'b', density: 0.02, nodeCount: 3 }, { clusterName: 'c', density: 0.03, nodeCount: 2 }, { clusterName: 'd', density: 0.04, nodeCount: 2 }, { clusterName: 'e', density: 0.05, nodeCount: 2 }, { clusterName: 'f', density: 0.3, nodeCount: 5 }], edgeConcentration: 0.1 }, complexity: { finalScore: 0.5, complexityLevel: 'HIGH', densityScore: 0.5, entropyScore: 0.5, fragmentationScore: 0.6, cycleScore: 0, depthScore: 0, sccDensity: 0 } }));
    const frag = result.find(d => d.patternType === 'ARCHITECTURAL_FRAGMENTATION');
    expect(frag).toBeDefined();
  });

  it('does not detect fragmentation with few low-cohesion clusters', () => {
    const result = detectAntiPatterns(makeInput({ couplingDensity: { globalDensity: 0.1, clusterDensities: [{ clusterName: 'a', density: 0.04, nodeCount: 2 }, { clusterName: 'b', density: 0.3, nodeCount: 5 }], edgeConcentration: 0.1 } }));
    const frag = result.find(d => d.patternType === 'ARCHITECTURAL_FRAGMENTATION');
    expect(frag).toBeUndefined();
  });
});
