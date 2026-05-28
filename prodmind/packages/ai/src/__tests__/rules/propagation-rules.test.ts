import { describe, expect, it } from 'vitest';
import { RuleEngine } from '../../rules/rule-engine.ts';
import { propagationRules } from '../../rules/builtins/propagation-rules.ts';
import type { RuleEvaluationContext } from '../../rules/rule-types.ts';

function makeContext(overrides?: Partial<RuleEvaluationContext>): RuleEvaluationContext {
  return {
    snapshotId: 'test',
    nodes: [],
    edges: [],
    metrics: {
      centrality: [],
      fanMetrics: [],
      instability: [],
      propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.9, blastRadiusAmplification: 0.8, cascadeEstimate: 0.7, isChokePoint: true }],
    },
    sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
    couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 },
    depth: { maxDepth: 0, averageDepth: 0, hasExcessivelyDeepChains: false, layeringViolations: [] },
    complexity: { finalScore: 0.3, complexityLevel: 'MODERATE', densityScore: 0.2, entropyScore: 0.1, fragmentationScore: 0.1, cycleScore: 0, depthScore: 0.1, edgeNodeRatio: 0.5, sccDensity: 0, architecturalEntropy: 0.1, graphFragmentation: 0.1 },
    ...overrides,
  };
}

describe('PropagationRules', () => {
  it('prop-001 fires for choke points', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(propagationRules);
    const result = engine.evaluate(makeContext());
    const propResult = result.results.find((r) => r.ruleId === 'prop-001');
    expect(propResult?.triggered).toBe(true);
  });

  it('prop-001 does not fire without choke points', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(propagationRules);
    const result = engine.evaluate(makeContext({
      metrics: {
        centrality: [],
        fanMetrics: [],
        instability: [],
        propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.1, blastRadiusAmplification: 0.1, cascadeEstimate: 0.1, isChokePoint: false }],
      },
    }));
    const propResult = result.results.find((r) => r.ruleId === 'prop-001');
    expect(propResult?.triggered).toBe(false);
  });

  it('prop-002 fires for high propagation pressure', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(propagationRules);
    const result = engine.evaluate(makeContext({
      metrics: {
        centrality: [],
        fanMetrics: [],
        instability: [],
        propagationRisk: [{ nodeId: 'n1', propagationPressure: 0.7, blastRadiusAmplification: 0.6, cascadeEstimate: 0.5, isChokePoint: false }],
      },
    }));
    const propResult = result.results.find((r) => r.ruleId === 'prop-002');
    expect(propResult?.triggered).toBe(true);
  });
});
