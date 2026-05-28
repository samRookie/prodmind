import { describe, expect, it } from 'vitest';
import { InsightEngine } from '../../insights/insight-engine.ts';
import type { InsightInput } from '../../insights/insight-types.ts';

function makeMinimalInput(overrides?: Partial<InsightInput>): InsightInput {
  return {
    snapshotId: 'test-snap-1',
    nodes: [
      { id: 'node-a', filePath: 'src/a.ts', nodeType: 'module', symbolName: 'A', language: 'typescript' },
      { id: 'node-b', filePath: 'src/b.ts', nodeType: 'module', symbolName: 'B', language: 'typescript' },
      { id: 'node-c', filePath: 'src/c.ts', nodeType: 'module', symbolName: 'C', language: 'typescript' },
      { id: 'node-d', filePath: 'src/d.ts', nodeType: 'module', symbolName: 'D', language: 'typescript' },
    ],
    edges: [
      { id: 'edge-1', sourceNodeId: 'node-a', targetNodeId: 'node-b', edgeType: 'imports', weight: 1 },
      { id: 'edge-2', sourceNodeId: 'node-b', targetNodeId: 'node-c', edgeType: 'imports', weight: 1 },
      { id: 'edge-3', sourceNodeId: 'node-c', targetNodeId: 'node-a', edgeType: 'imports', weight: 1 },
    ],
    sccData: {
      componentCount: 1,
      componentMap: new Map([['node-a', 0], ['node-b', 0], ['node-c', 0]]),
      condensationDAG: new Map([[0, []]]),
      componentNodes: new Map([[0, ['node-a', 'node-b', 'node-c']]]),
    },
    centrality: [],
    fanMetrics: [],
    instability: [],
    propagationRisk: [],
    depth: { maxDepth: 0, averageDepth: 0, hasExcessivelyDeepChains: false, layeringViolations: [] },
    complexity: { finalScore: 0, complexityLevel: 'SIMPLE', densityScore: 0, entropyScore: 0, fragmentationScore: 0, cycleScore: 0, depthScore: 0, edgeNodeRatio: 0, sccDensity: 0, architecturalEntropy: 0, graphFragmentation: 0 },
    couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 },
    ...overrides,
  };
}

describe('InsightEngine', () => {
  it('produces deterministic output for same input', () => {
    const engine = new InsightEngine();
    const input = makeMinimalInput({
      fanMetrics: [
        { nodeId: 'node-a', fanIn: 30, fanOut: 40, concentration: 0.5, fanLevel: 'HIGH', isUtilityHotspot: true, isGodModule: false },
      ],
    });

    const r1 = engine.analyze(input);
    const r2 = engine.analyze(input);

    expect(r1.insights.length).toBe(r2.insights.length);
    for (let i = 0; i < r1.insights.length; i++) {
      expect(r1.insights[i]!.fingerprint).toBe(r2.insights[i]!.fingerprint);
      expect(r1.insights[i]!.title).toBe(r2.insights[i]!.title);
    }
  });

  it('returns empty insights for empty graph', () => {
    const engine = new InsightEngine();
    const input = makeMinimalInput({
      nodes: [],
      edges: [],
      sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
    });

    const result = engine.analyze(input);
    expect(result.insights).toHaveLength(0);
  });

  it('detects cyclic architecture from SCC data', () => {
    const engine = new InsightEngine();
    const input = makeMinimalInput({
      sccData: {
        componentCount: 2,
        componentMap: new Map([['node-a', 0], ['node-b', 0], ['node-c', 1]]),
        condensationDAG: new Map([[0, [1]], [1, [0]]]),
        componentNodes: new Map([[0, ['node-a', 'node-b']], [1, ['node-c']]]),
      },
    });

    const result = engine.analyze(input);
    const archInsight = result.insights.find((i) => i.type === 'ARCHITECTURE');
    expect(archInsight).toBeDefined();
    expect(archInsight!.title).toContain('Cyclic');
  });

  it('detects hotspots from fan metrics', () => {
    const engine = new InsightEngine();
    const input = makeMinimalInput({
      fanMetrics: [
        { nodeId: 'node-a', fanIn: 50, fanOut: 60, concentration: 0.8, fanLevel: 'CRITICAL', isUtilityHotspot: true, isGodModule: true },
      ],
    });

    const result = engine.analyze(input);
    const hotspotInsights = result.insights.filter((i) => i.type === 'HOTSPOT');
    expect(hotspotInsights.length).toBeGreaterThanOrEqual(1);
    expect(hotspotInsights.some((i) => i.title.includes('Utility hotspot'))).toBe(true);
    expect(hotspotInsights.some((i) => i.title.includes('God module'))).toBe(true);
  });

  it('detects unstable dependencies', () => {
    const engine = new InsightEngine();
    const input = makeMinimalInput({
      instability: [
        { nodeId: 'node-a', instabilityScore: 0.85, instabilityLevel: 'VOLATILE', isUnstableInfrastructure: true, isVolatileCore: false, hasInversionRisk: true },
      ],
    });

    const result = engine.analyze(input);
    const instInsights = result.insights.filter((i) => i.type === 'INSTABILITY');
    expect(instInsights.length).toBeGreaterThanOrEqual(1);
    expect(instInsights.some((i) => i.title.includes('Unstable infrastructure'))).toBe(true);
    expect(instInsights.some((i) => i.title.includes('Dependency inversion'))).toBe(true);
  });

  it('detects propagation choke points', () => {
    const engine = new InsightEngine();
    const input = makeMinimalInput({
      propagationRisk: [
        { nodeId: 'node-a', propagationPressure: 0.9, blastRadiusAmplification: 0.8, cascadeEstimate: 0.7, isChokePoint: true },
      ],
    });

    const result = engine.analyze(input);
    const propInsights = result.insights.filter((i) => i.type === 'PROPAGATION');
    expect(propInsights.length).toBeGreaterThanOrEqual(1);
    expect(propInsights.some((i) => i.title.includes('choke point'))).toBe(true);
  });

  it('detects complexity issues', () => {
    const engine = new InsightEngine();
    const input = makeMinimalInput({
      complexity: { finalScore: 0.85, complexityLevel: 'HIGHLY_COMPLEX', densityScore: 0.7, entropyScore: 0.6, fragmentationScore: 0.5, cycleScore: 0.4, depthScore: 0.3, edgeNodeRatio: 2.5, sccDensity: 0.3, architecturalEntropy: 0.7, graphFragmentation: 0.5 },
    });

    const result = engine.analyze(input);
    const compInsights = result.insights.filter((i) => i.type === 'COMPLEXITY');
    expect(compInsights.length).toBeGreaterThanOrEqual(1);
    expect(compInsights.some((i) => i.title.includes('HIGHLY_COMPLEX'))).toBe(true);
  });

  it('detects coupling issues', () => {
    const engine = new InsightEngine();
    const input = makeMinimalInput({
      couplingDensity: {
        globalDensity: 0.15,
        clusterDensities: [
          { clusterName: 'core', density: 0.2, nodeCount: 5 },
          { clusterName: 'utils', density: 0.12, nodeCount: 3 },
        ],
        edgeConcentration: 0.6,
      },
    });

    const result = engine.analyze(input);
    const coupInsights = result.insights.filter((i) => i.type === 'COUPLING');
    expect(coupInsights.length).toBeGreaterThanOrEqual(1);
  });

  it('stable ordering across runs', () => {
    const engine = new InsightEngine();
    const input = makeMinimalInput({
      fanMetrics: [
        { nodeId: 'node-b', fanIn: 10, fanOut: 15, concentration: 0.3, fanLevel: 'HIGH', isUtilityHotspot: true, isGodModule: false },
        { nodeId: 'node-a', fanIn: 5, fanOut: 8, concentration: 0.2, fanLevel: 'MODERATE', isUtilityHotspot: true, isGodModule: false },
      ],
      instability: [
        { nodeId: 'node-c', instabilityScore: 0.7, instabilityLevel: 'UNSTABLE', isUnstableInfrastructure: true, isVolatileCore: false, hasInversionRisk: false },
      ],
    });

    const r1 = engine.analyze(input);
    const r2 = engine.analyze(input);

    expect(r1.insights.map((i) => i.fingerprint)).toEqual(r2.insights.map((i) => i.fingerprint));
  });

  it('includes evidence in all insights', () => {
    const engine = new InsightEngine();
    const input = makeMinimalInput({
      fanMetrics: [
        { nodeId: 'node-a', fanIn: 40, fanOut: 50, concentration: 0.7, fanLevel: 'HIGH', isUtilityHotspot: true, isGodModule: false },
      ],
    });

    const result = engine.analyze(input);
    for (const insight of result.insights) {
      expect(insight.evidence.length).toBeGreaterThan(0);
    }
  });
});
