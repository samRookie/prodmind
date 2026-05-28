import { describe, it, expect } from 'vitest';
import { PatternEngine } from '../../patterns/pattern-engine.ts';
import type { PatternInput } from '../../patterns/pattern-types.ts';

function makeInput(overrides?: Partial<PatternInput>): PatternInput {
  return {
    snapshotId: 'test-snap-1',
    nodes: [{ id: 'a', filePath: '/a.ts', nodeType: 'FILE', symbolName: 'A', language: 'ts' }],
    edges: [],
    sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
    centrality: [],
    fanMetrics: [],
    instability: [],
    propagationRisk: [],
    couplingDensity: { globalDensity: 0.05, clusterDensities: [{ clusterName: 'core', density: 0.3, nodeCount: 5 }, { clusterName: 'utils', density: 0.02, nodeCount: 3 }], edgeConcentration: 0.1 },
    complexity: { finalScore: 0.3, complexityLevel: 'MODERATE', densityScore: 0.3, entropyScore: 0.2, fragmentationScore: 0.1, cycleScore: 0, depthScore: 0.2, sccDensity: 0 },
    ...overrides,
  };
}

describe('PatternEngine', () => {
  it('detects modular architecture with clusters', () => {
    const engine = new PatternEngine();
    const output = engine.analyze(makeInput());
    const modular = output.detections.find(d => d.patternType === 'MODULAR');
    expect(modular).toBeDefined();
    expect(modular!.confidence).toBeGreaterThan(0);
  });

  it('detects cyclic cluster anti-pattern', () => {
    const compNodes = new Map<number, string[]>();
    compNodes.set(1, ['a', 'b', 'c']);
    compNodes.set(2, ['d']);
    const engine = new PatternEngine();
    const output = engine.analyze(makeInput({ sccData: { componentCount: 2, componentMap: new Map(), condensationDAG: new Map(), componentNodes: compNodes } }));
    const cyclic = output.detections.find(d => d.patternType === 'CYCLIC_CLUSTER');
    expect(cyclic).toBeDefined();
    expect(cyclic!.impactedNodes).toContain('a');
  });

  it('detects god module anti-pattern', () => {
    const engine = new PatternEngine();
    const output = engine.analyze(makeInput({ fanMetrics: [{ nodeId: 'god', fanIn: 40, fanOut: 30, concentration: 0.9, fanLevel: 'HIGH', isUtilityHotspot: false, isGodModule: true }] }));
    const god = output.detections.find(d => d.patternType === 'GOD_MODULE');
    expect(god).toBeDefined();
    expect(god!.severity).toBe('CRITICAL');
  });

  it('detects propagation hub anti-pattern', () => {
    const engine = new PatternEngine();
    const output = engine.analyze(makeInput({ propagationRisk: [{ nodeId: 'hub', propagationPressure: 0.8, blastRadiusAmplification: 0.9, cascadeEstimate: 15, isChokePoint: true }] }));
    const hub = output.detections.find(d => d.patternType === 'PROPAGATION_HUB');
    expect(hub).toBeDefined();
  });

  it('detects dependency mesh anti-pattern', () => {
    const engine = new PatternEngine();
    const output = engine.analyze(makeInput({ couplingDensity: { globalDensity: 0.25, clusterDensities: [], edgeConcentration: 0.5 } }));
    const mesh = output.detections.find(d => d.patternType === 'DEPENDENCY_MESH');
    expect(mesh).toBeDefined();
  });

  it('detects unstable core anti-pattern', () => {
    const engine = new PatternEngine();
    const output = engine.analyze(makeInput({ instability: [{ nodeId: 'core', instabilityScore: 0.85, instabilityLevel: 'HIGH', isUnstableInfrastructure: false, isVolatileCore: true, hasInversionRisk: false }] }));
    const unstable = output.detections.find(d => d.patternType === 'UNSTABLE_CORE');
    expect(unstable).toBeDefined();
  });

  it('produces deterministic output', () => {
    const engine = new PatternEngine();
    const a = engine.analyze(makeInput());
    const b = engine.analyze(makeInput());
    expect(a.detections.map(d => d.fingerprint)).toEqual(b.detections.map(d => d.fingerprint));
  });

  it('handles empty graph', () => {
    const engine = new PatternEngine();
    const empty: PatternInput = { snapshotId: 'empty', nodes: [], edges: [], sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() }, centrality: [], fanMetrics: [], instability: [], propagationRisk: [], couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 }, complexity: { finalScore: 0, complexityLevel: 'LOW', densityScore: 0, entropyScore: 0, fragmentationScore: 0, cycleScore: 0, depthScore: 0, sccDensity: 0 } };
    const output = engine.analyze(empty);
    expect(output.detections).toHaveLength(0);
  });
});
