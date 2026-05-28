import { describe, expect, it } from 'vitest';
import { RuleRuntime } from '../../rules/rule-runtime.ts';
import type { Rule, RuleEvaluationContext } from '../../rules/rule-types.ts';

function makeContext(overrides?: Partial<RuleEvaluationContext>): RuleEvaluationContext {
  return {
    snapshotId: 'test-snap',
    nodes: [],
    edges: [],
    metrics: { centrality: [], fanMetrics: [], instability: [], propagationRisk: [] },
    sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
    couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 },
    depth: { maxDepth: 0, averageDepth: 0, hasExcessivelyDeepChains: false, layeringViolations: [] },
    complexity: { finalScore: 0.5, complexityLevel: 'MODERATE', densityScore: 0.3, entropyScore: 0.2, fragmentationScore: 0.1, cycleScore: 0, depthScore: 0.1, edgeNodeRatio: 0.5, sccDensity: 0, architecturalEntropy: 0.1, graphFragmentation: 0.1 },
    ...overrides,
  };
}

const alwaysFireRule: Rule = {
  id: 'always-001',
  name: 'Always fires',
  description: '',
  priority: 10,
  category: 'COMPLEXITY',
  conditions: [{
    type: 'METRIC_THRESHOLD' as const,
    metricType: 'COMPLEXITY',
    operator: 'GT' as const,
    value: 0,
    scope: 'GLOBAL',
  }],
  action: {
    type: 'EMIT_INSIGHT',
    insight: { type: 'COMPLEXITY', severity: 'HIGH', scope: 'GLOBAL', titleTemplate: 'Always', summaryTemplate: 'Always fires' },
    evidence: [],
  },
};

describe('RuleRuntime', () => {
  it('evaluates rules and returns results', () => {
    const runtime = new RuleRuntime();
    const result = runtime.evaluate([alwaysFireRule], makeContext());
    expect(result.snapshotId).toBe('test-snap');
    expect(result.totalTriggered).toBe(1);
    expect(result.totalFindings).toBe(1);
  });

  it('handles no rules', () => {
    const runtime = new RuleRuntime();
    const result = runtime.evaluate([], makeContext());
    expect(result.totalTriggered).toBe(0);
    expect(result.totalFindings).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it('handles multiple rules', () => {
    const runtime = new RuleRuntime();
    const rule2: Rule = {
      ...alwaysFireRule,
      id: 'always-002',
      conditions: [{
        type: 'METRIC_THRESHOLD' as const,
        metricType: 'COMPLEXITY',
        operator: 'GT' as const,
        value: 0.8,
        scope: 'GLOBAL',
      }],
    };

    const result = runtime.evaluate([alwaysFireRule, rule2], makeContext());
    expect(result.totalTriggered).toBe(1);
    expect(result.totalFindings).toBe(1);
  });

  it('sorts rules by priority then id', () => {
    const runtime = new RuleRuntime();
    const rules: Rule[] = [
      { ...alwaysFireRule, id: 'z-rule', priority: 20 },
      { ...alwaysFireRule, id: 'a-rule', priority: 10 },
      { ...alwaysFireRule, id: 'b-rule', priority: 10 },
    ];

    const result = runtime.evaluate(rules, makeContext());
    expect(result.results[0]!.ruleId).toBe('a-rule');
    expect(result.results[1]!.ruleId).toBe('b-rule');
    expect(result.results[2]!.ruleId).toBe('z-rule');
  });
});
