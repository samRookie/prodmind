import { describe, expect, it } from 'vitest';
import { RuleEngine } from '../../rules/rule-engine.ts';
import { complexityRules } from '../../rules/builtins/complexity-rules.ts';
import type { RuleEvaluationContext } from '../../rules/rule-types.ts';

function makeContext(overrides?: Partial<RuleEvaluationContext>): RuleEvaluationContext {
  return {
    snapshotId: 'test',
    nodes: [],
    edges: [],
    metrics: { centrality: [], fanMetrics: [], instability: [], propagationRisk: [] },
    sccData: { componentCount: 3, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map<number, string[]>([[0, ['n1', 'n2']], [1, ['n3']], [2, ['n4']]]) },
    couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 },
    depth: { maxDepth: 0, averageDepth: 0, hasExcessivelyDeepChains: false, layeringViolations: [] },
    complexity: { finalScore: 0.85, complexityLevel: 'HIGHLY_COMPLEX', densityScore: 0.7, entropyScore: 0.6, fragmentationScore: 0.5, cycleScore: 0.4, depthScore: 0.3, edgeNodeRatio: 2.5, sccDensity: 0.3, architecturalEntropy: 0.7, graphFragmentation: 0.5 },
    ...overrides,
  };
}

describe('ComplexityRules', () => {
  it('complex-001 fires for high complexity', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(complexityRules);
    const result = engine.evaluate(makeContext());
    expect(result.results.find((r) => r.ruleId === 'complex-001')?.triggered).toBe(true);
  });

  it('complex-002 fires for critical complexity', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(complexityRules);
    const result = engine.evaluate(makeContext());
    expect(result.results.find((r) => r.ruleId === 'complex-002')?.triggered).toBe(true);
  });

  it('complex-003 fires for large SCCs', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(complexityRules);
    const result = engine.evaluate(makeContext());
    expect(result.results.find((r) => r.ruleId === 'complex-003')?.triggered).toBe(true);
  });

  it('no rules fire for simple empty graph', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(complexityRules);
    const result = engine.evaluate(makeContext({
      sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
      complexity: { finalScore: 0.1, complexityLevel: 'SIMPLE', densityScore: 0, entropyScore: 0, fragmentationScore: 0, cycleScore: 0, depthScore: 0, edgeNodeRatio: 0, sccDensity: 0, architecturalEntropy: 0, graphFragmentation: 0 },
    }));
    expect(result.totalTriggered).toBe(0);
  });
});
