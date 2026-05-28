import { describe, expect, it } from 'vitest';
import { RuleEngine } from '../../rules/rule-engine.ts';
import { layeringRules } from '../../rules/builtins/layering-rules.ts';
import type { RuleEvaluationContext } from '../../rules/rule-types.ts';

function makeContext(overrides?: Partial<RuleEvaluationContext>): RuleEvaluationContext {
  return {
    snapshotId: 'test',
    nodes: [],
    edges: [],
    metrics: { centrality: [], fanMetrics: [], instability: [], propagationRisk: [] },
    sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
    couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 },
    depth: { maxDepth: 3, averageDepth: 1.5, hasExcessivelyDeepChains: false, layeringViolations: [{ sourceId: 'n1', targetId: 'n2', reason: 'Layer violation' }] },
    complexity: { finalScore: 0.3, complexityLevel: 'MODERATE', densityScore: 0.2, entropyScore: 0.1, fragmentationScore: 0.1, cycleScore: 0, depthScore: 0.1, edgeNodeRatio: 0.5, sccDensity: 0, architecturalEntropy: 0.1, graphFragmentation: 0.1 },
    ...overrides,
  };
}

describe('LayeringRules', () => {
  it('layer-001 fires for layering violations', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(layeringRules);
    const result = engine.evaluate(makeContext());
    const layerResult = result.results.find((r) => r.ruleId === 'layer-001');
    expect(layerResult?.triggered).toBe(true);
  });

  it('layer-001 does not fire without violations', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(layeringRules);
    const result = engine.evaluate(makeContext({
      depth: { maxDepth: 1, averageDepth: 1, hasExcessivelyDeepChains: false, layeringViolations: [] },
    }));
    const layerResult = result.results.find((r) => r.ruleId === 'layer-001');
    expect(layerResult?.triggered).toBe(false);
  });

  it('layer-002 does not fire without deep chains', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(layeringRules);
    const result = engine.evaluate(makeContext());
    const depthResult = result.results.find((r) => r.ruleId === 'layer-002');
    expect(depthResult?.triggered).toBe(false);
  });
});
