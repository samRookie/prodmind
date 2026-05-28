import { describe, expect, it } from 'vitest';
import { RuleEngine } from '../../rules/rule-engine.ts';
import type { Rule, RuleEvaluationContext } from '../../rules/rule-types.ts';

function makeContext(overrides?: Partial<RuleEvaluationContext>): RuleEvaluationContext {
  return {
    snapshotId: 'test-snap',
    nodes: [
      { id: 'n1', filePath: 'src/a.ts', nodeType: 'module', symbolName: 'A', language: 'ts' },
      { id: 'n2', filePath: 'src/b.ts', nodeType: 'module', symbolName: 'B', language: 'ts' },
    ],
    edges: [{ id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', edgeType: 'imports', weight: 1 }],
    metrics: { centrality: [], fanMetrics: [], instability: [], propagationRisk: [] },
    sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
    couplingDensity: { globalDensity: 0.02, clusterDensities: [], edgeConcentration: 0 },
    depth: { maxDepth: 1, averageDepth: 1, hasExcessivelyDeepChains: false, layeringViolations: [] },
    complexity: { finalScore: 0.3, complexityLevel: 'MODERATE', densityScore: 0.2, entropyScore: 0.1, fragmentationScore: 0.1, cycleScore: 0, depthScore: 0.1, edgeNodeRatio: 0.5, sccDensity: 0, architecturalEntropy: 0.1, graphFragmentation: 0.1 },
    ...overrides,
  };
}

describe('RuleEngine', () => {
  it('evaluates registered rules', () => {
    const engine = new RuleEngine();
    const rule: Rule = {
      id: 'test-001',
      name: 'Test rule',
      description: 'A test rule',
      priority: 10,
      category: 'COMPLEXITY',
      conditions: [{
        type: 'METRIC_THRESHOLD' as const,
        metricType: 'COMPLEXITY',
        operator: 'GT' as const,
        value: 0.2,
        scope: 'GLOBAL',
      }],
      action: {
        type: 'EMIT_INSIGHT',
        insight: {
          type: 'COMPLEXITY',
          severity: 'HIGH',
          scope: 'GLOBAL',
          titleTemplate: 'Test complexity insight',
          summaryTemplate: 'Complexity {complexityScore} exceeds threshold',
        },
        evidence: [{ metricType: 'COMPLEXITY', descriptionTemplate: 'Score: {complexityScore}' }],
      },
    };

    engine.getRegistry().register(rule);
    const result = engine.evaluate(makeContext());

    expect(result.totalTriggered).toBe(1);
    expect(result.totalFindings).toBe(1);
    expect(result.results[0]!.ruleId).toBe('test-001');
  });

  it('does not fire when conditions not met', () => {
    const engine = new RuleEngine();
    const rule: Rule = {
      id: 'test-002',
      name: 'Should not fire',
      description: 'Condition will not be met',
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
        insight: { type: 'COMPLEXITY', severity: 'HIGH', scope: 'GLOBAL', titleTemplate: 'Should not appear', summaryTemplate: 'N/A' },
        evidence: [],
      },
    };

    engine.getRegistry().register(rule);
    const result = engine.evaluate(makeContext());

    expect(result.totalTriggered).toBe(0);
    expect(result.totalFindings).toBe(0);
  });

  it('executes rules in priority order', () => {
    const engine = new RuleEngine();

    const makeRule = (id: string, priority: number): Rule => ({
      id,
      name: id,
      description: '',
      priority,
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
        insight: { type: 'COMPLEXITY', severity: 'HIGH', scope: 'GLOBAL', titleTemplate: id, summaryTemplate: id },
        evidence: [],
      },
    });

    engine.getRegistry().register(makeRule('rule-c', 30));
    engine.getRegistry().register(makeRule('rule-a', 10));
    engine.getRegistry().register(makeRule('rule-b', 20));

    const result = engine.evaluate(makeContext());
    expect(result.results.map((r) => r.ruleId)).toEqual(['rule-a', 'rule-b', 'rule-c']);
  });

  it('deduplicates findings by fingerprint', () => {
    const engine = new RuleEngine();
    const rule: Rule = {
      id: 'dedup-001',
      name: 'Dedup test',
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
        insight: { type: 'COMPLEXITY', severity: 'HIGH', scope: 'GLOBAL', titleTemplate: 'Same title', summaryTemplate: 'Same summary' },
        evidence: [{ metricType: 'COMPLEXITY', descriptionTemplate: 'Score: {complexityScore}' }],
      },
    };

    engine.getRegistry().register(rule);

    const result = engine.evaluate(makeContext());
    expect(result.totalFindings).toBe(1);
    expect(result.results[0]!.findings).toHaveLength(1);
  });

  it('converts findings to insights', () => {
    const engine = new RuleEngine();
    const rule: Rule = {
      id: 'convert-001',
      name: 'Conversion test',
      description: '',
      priority: 10,
      category: 'COMPLEXITY',
      conditions: [{
        type: 'METRIC_THRESHOLD' as const,
        metricType: 'COMPLEXITY',
        operator: 'GT' as const,
        value: 0.1,
        scope: 'GLOBAL',
      }],
      action: {
        type: 'EMIT_INSIGHT',
        insight: { type: 'COMPLEXITY', severity: 'HIGH', scope: 'GLOBAL', titleTemplate: 'Conversion insight', summaryTemplate: 'From rule' },
        evidence: [{ descriptionTemplate: 'Evidence description' }],
      },
    };

    engine.getRegistry().register(rule);
    const result = engine.evaluate(makeContext());

    const insights = engine.findingsToInsights(
      result.results.flatMap((r) => r.findings),
    );

    expect(insights).toHaveLength(1);
    expect(insights[0]!.fingerprint).toBeTruthy();
    expect(insights[0]!.fingerprint.length).toBe(64);
  });

  it('handles empty rule registry', () => {
    const engine = new RuleEngine();
    const result = engine.evaluate(makeContext());
    expect(result.totalTriggered).toBe(0);
    expect(result.totalFindings).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});
