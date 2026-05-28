import { describe, expect, it } from 'vitest';
import { RuleExecutor } from '../../rules/rule-executor.ts';
import type { Rule, RuleEvaluationContext } from '../../rules/rule-types.ts';

function makeContext(): RuleEvaluationContext {
  return {
    snapshotId: 'test',
    nodes: [],
    edges: [],
    metrics: { centrality: [], fanMetrics: [], instability: [], propagationRisk: [] },
    sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
    couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 },
    depth: { maxDepth: 0, averageDepth: 0, hasExcessivelyDeepChains: false, layeringViolations: [] },
    complexity: { finalScore: 0.5, complexityLevel: 'MODERATE', densityScore: 0.3, entropyScore: 0.2, fragmentationScore: 0.1, cycleScore: 0, depthScore: 0.1, edgeNodeRatio: 0.5, sccDensity: 0, architecturalEntropy: 0.1, graphFragmentation: 0.1 },
  };
}

const fireRule: Rule = {
  id: 'exec-001',
  name: 'Fire rule',
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
    insight: { type: 'COMPLEXITY', severity: 'HIGH', scope: 'GLOBAL', titleTemplate: 'Fire', summaryTemplate: 'This fires' },
    evidence: [],
  },
};

const noFireRule: Rule = {
  id: 'nofire-001',
  name: 'No fire rule',
  description: '',
  priority: 10,
  category: 'COMPLEXITY',
  conditions: [{
    type: 'METRIC_THRESHOLD' as const,
    metricType: 'COMPLEXITY',
    operator: 'GT' as const,
    value: 0.9,
    scope: 'GLOBAL',
  }],
  action: {
    type: 'EMIT_INSIGHT',
    insight: { type: 'COMPLEXITY', severity: 'HIGH', scope: 'GLOBAL', titleTemplate: 'No Fire', summaryTemplate: 'Does not fire' },
    evidence: [],
  },
};

describe('RuleExecutor', () => {
  it('executes a single rule', () => {
    const executor = new RuleExecutor();
    const result = executor.execute(fireRule, makeContext());
    expect(result.triggered).toBe(true);
    expect(result.findings).toHaveLength(1);
  });

  it('returns triggered=false when conditions not met', () => {
    const executor = new RuleExecutor();
    const result = executor.execute(noFireRule, makeContext());
    expect(result.triggered).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it('executes batch and resets dedup across rules', () => {
    const executor = new RuleExecutor();
    const results = executor.executeBatch([fireRule, noFireRule], makeContext());
    expect(results).toHaveLength(2);
    expect(results[0]!.triggered).toBe(true);
    expect(results[1]!.triggered).toBe(false);
  });

  it('suppresses duplicate findings', () => {
    const executor = new RuleExecutor();
    const result = executor.execute(fireRule, makeContext());
    expect(result.findings).toHaveLength(1);

    const result2 = executor.execute(fireRule, makeContext());
    expect(result2.findings).toHaveLength(0);
  });

  it('resets dedup state between batches', () => {
    const executor = new RuleExecutor();
    executor.executeBatch([fireRule], makeContext());

    const results = executor.executeBatch([fireRule], makeContext());
    expect(results[0]!.findings).toHaveLength(0);
  });

  it('prevents recursion on same rule id', () => {
    const executor = new RuleExecutor();
    const result1 = executor.execute(fireRule, makeContext());
    const result2 = executor.execute(fireRule, makeContext());
    expect(result1.findings).toHaveLength(1);
    expect(result2.findings).toHaveLength(0);
  });

  it('measures execution time', () => {
    const executor = new RuleExecutor();
    const result = executor.execute(fireRule, makeContext());
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });
});
