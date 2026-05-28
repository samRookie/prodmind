import { describe, expect, it } from 'vitest';
import { RuleEngine } from '../../rules/rule-engine.ts';
import { dependencyRules } from '../../rules/builtins/dependency-rules.ts';
import type { RuleEvaluationContext } from '../../rules/rule-types.ts';

function makeContext(overrides?: Partial<RuleEvaluationContext>): RuleEvaluationContext {
  return {
    snapshotId: 'test',
    nodes: [
      { id: 'n1', filePath: 'src/a.ts', nodeType: 'module', symbolName: 'A', language: 'ts' },
      { id: 'n2', filePath: 'src/b.ts', nodeType: 'module', symbolName: 'B', language: 'ts' },
    ],
    edges: [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', edgeType: 'imports', weight: 1 }],
    metrics: {
      centrality: [{ nodeId: 'n1', inDegree: 10, outDegree: 5, reachabilityCount: 20, dependencyInfluenceScore: 0.85, isUtilityHub: true }],
      fanMetrics: [],
      instability: [],
      propagationRisk: [],
    },
    sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
    couplingDensity: { globalDensity: 0.02, clusterDensities: [], edgeConcentration: 0 },
    depth: { maxDepth: 0, averageDepth: 0, hasExcessivelyDeepChains: false, layeringViolations: [] },
    complexity: { finalScore: 0.3, complexityLevel: 'MODERATE', densityScore: 0.2, entropyScore: 0.1, fragmentationScore: 0.1, cycleScore: 0, depthScore: 0.1, edgeNodeRatio: 0.5, sccDensity: 0, architecturalEntropy: 0.1, graphFragmentation: 0.1 },
    ...overrides,
  };
}

describe('DependencyRules', () => {
  it('dep-001 fires for high centrality', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(dependencyRules);
    const result = engine.evaluate(makeContext());
    const depResult = result.results.find((r) => r.ruleId === 'dep-001');
    expect(depResult?.triggered).toBe(true);
  });

  it('dep-001 does not fire for low centrality', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(dependencyRules);
    const result = engine.evaluate(makeContext({
      metrics: {
        centrality: [{ nodeId: 'n1', inDegree: 1, outDegree: 0, reachabilityCount: 1, dependencyInfluenceScore: 0.1, isUtilityHub: false }],
        fanMetrics: [],
        instability: [],
        propagationRisk: [],
      },
    }));
    const depResult = result.results.find((r) => r.ruleId === 'dep-001');
    expect(depResult?.triggered).toBe(false);
  });

  it('dep-002 does not fire for low coupling density', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(dependencyRules);
    const result = engine.evaluate(makeContext({
      couplingDensity: { globalDensity: 0.01, clusterDensities: [], edgeConcentration: 0 },
    }));
    const coupResult = result.results.find((r) => r.ruleId === 'dep-002');
    expect(coupResult?.triggered).toBe(false);
  });
});
