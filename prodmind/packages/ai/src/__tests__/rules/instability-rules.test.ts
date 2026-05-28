import { describe, expect, it } from 'vitest';
import { RuleEngine } from '../../rules/rule-engine.ts';
import { instabilityRules } from '../../rules/builtins/instability-rules.ts';
import type { RuleEvaluationContext } from '../../rules/rule-types.ts';

function makeContext(overrides?: Partial<RuleEvaluationContext>): RuleEvaluationContext {
  return {
    snapshotId: 'test',
    nodes: [],
    edges: [],
    metrics: {
      centrality: [],
      fanMetrics: [],
      instability: [{ nodeId: 'n1', instabilityScore: 0.7, instabilityLevel: 'UNSTABLE', isUnstableInfrastructure: true, isVolatileCore: false, hasInversionRisk: false }],
      propagationRisk: [],
    },
    sccData: { componentCount: 0, componentMap: new Map(), condensationDAG: new Map(), componentNodes: new Map() },
    couplingDensity: { globalDensity: 0, clusterDensities: [], edgeConcentration: 0 },
    depth: { maxDepth: 0, averageDepth: 0, hasExcessivelyDeepChains: false, layeringViolations: [] },
    complexity: { finalScore: 0.3, complexityLevel: 'MODERATE', densityScore: 0.2, entropyScore: 0.1, fragmentationScore: 0.1, cycleScore: 0, depthScore: 0.1, edgeNodeRatio: 0.5, sccDensity: 0, architecturalEntropy: 0.1, graphFragmentation: 0.1 },
    ...overrides,
  };
}

describe('InstabilityRules', () => {
  it('inst-001 fires for high instability', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(instabilityRules);
    const result = engine.evaluate(makeContext());
    const instResult = result.results.find((r) => r.ruleId === 'inst-001');
    expect(instResult?.triggered).toBe(true);
  });

  it('inst-001 does not fire for low instability', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(instabilityRules);
    const result = engine.evaluate(makeContext({
      metrics: {
        centrality: [],
        fanMetrics: [],
        instability: [{ nodeId: 'n1', instabilityScore: 0.1, instabilityLevel: 'STABLE', isUnstableInfrastructure: false, isVolatileCore: false, hasInversionRisk: false }],
        propagationRisk: [],
      },
    }));
    const instResult = result.results.find((r) => r.ruleId === 'inst-001');
    expect(instResult?.triggered).toBe(false);
  });

  it('inst-002 fires for unstable utility hotspots', () => {
    const engine = new RuleEngine();
    engine.getRegistry().registerBatch(instabilityRules);
    const result = engine.evaluate(makeContext({
      metrics: {
        centrality: [],
        fanMetrics: [{ nodeId: 'n1', fanIn: 10, fanOut: 5, concentration: 0.3, fanLevel: 'MODERATE', isUtilityHotspot: true, isGodModule: false }],
        instability: [{ nodeId: 'n1', instabilityScore: 0.5, instabilityLevel: 'UNSTABLE', isUnstableInfrastructure: true, isVolatileCore: false, hasInversionRisk: false }],
        propagationRisk: [],
      },
    }));
    const instResult = result.results.find((r) => r.ruleId === 'inst-002');
    expect(instResult?.triggered).toBe(true);
  });
});
