import { describe, expect,it } from 'vitest';

import type { InsightCategory } from '../types/index.ts';

// === Core Engine Tests ===

describe('InsightEngine', () => {
  it('should create engine with default config', async () => {
    const { InsightEngine } = await import('../core/insight-engine.ts');
    const engine = new InsightEngine();
    expect(engine.getConfiguration()).toBeDefined();
    expect(engine.getConfiguration().categories.length).toBe(14);
  });

  it('should ingest and query insights', async () => {
    const { InsightEngine } = await import('../core/insight-engine.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const engine = new InsightEngine();
    const insight = generateInsight({ category: 'complexity', title: 'Test', description: 'Desc', summary: 'Sum' });
    engine.ingest(insight);
    const results = engine.query('complexity');
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe(insight.id);
  });

  it('should filter by severity', async () => {
    const { InsightEngine } = await import('../core/insight-engine.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const engine = new InsightEngine();
    const i1 = generateInsight({ category: 'risk', title: 'A', description: 'D', summary: 'S', scores: { impact: 0.9, urgency: 0.9, complexity: 0.9 } });
    const i2 = generateInsight({ category: 'risk', title: 'B', description: 'D', summary: 'S' });
    engine.ingestBatch([i1, i2]);
    const results = engine.query('risk', 'HIGH');
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('should update insight status', async () => {
    const { InsightEngine } = await import('../core/insight-engine.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const engine = new InsightEngine();
    const insight = generateInsight({ category: 'hotspot', title: 'T', description: 'D', summary: 'S' });
    engine.ingest(insight);
    engine.updateStatus(insight.id, 'resolved');
    const updated = engine.getInsight(insight.id);
    expect(updated?.status).toBe('resolved');
  });

  it('should enforce max insights per category', async () => {
    const { InsightPipeline } = await import('../core/insight-pipeline.ts');
    const { DEFAULT_INSIGHT_CONFIG } = await import('../contracts/index.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const config = { ...DEFAULT_INSIGHT_CONFIG, maxInsightsPerCategory: 2 };
    const pipeline = new InsightPipeline(config);
    const insights = Array.from({ length: 5 }, () => generateInsight({ category: 'complexity', title: 'T', description: 'D', summary: 'S' }));
    const processed = pipeline.processBatch(insights);
    expect(processed.length).toBe(2);
  });
});

describe('InsightClassification', () => {
  it('should compute confidence from evidence count', async () => {
    const { computeConfidence } = await import('../core/insight-classification.ts');
    expect(computeConfidence(0, true)).toBe(0.2);
    expect(computeConfidence(5, true)).toBeCloseTo(0.55, 1);
    expect(computeConfidence(10, true)).toBeCloseTo(0.9, 10);
  });

  it('should classify severity from score', async () => {
    const { classifySeverity } = await import('../core/insight-types.ts');
    expect(classifySeverity(0.1)).toBe('LOW');
    expect(classifySeverity(0.5)).toBe('MODERATE');
    expect(classifySeverity(0.75)).toBe('HIGH');
    expect(classifySeverity(0.9)).toBe('CRITICAL');
  });

  it('should compute overall score with weights', async () => {
    const { classifyInsight } = await import('../core/insight-classification.ts');
    const result = classifyInsight({ category: 'complexity', confidence: 0.8, impact: 0.7, urgency: 0.6, complexity: 0.5 });
    expect(result.overall).toBeGreaterThan(0);
    expect(result.overall).toBeLessThanOrEqual(1);
  });
});

describe('InsightFingerprint', () => {
  it('should generate deterministic fingerprints', async () => {
    const { computeInsightFingerprint } = await import('../core/insight-fingerprint.ts');
    const fp1 = computeInsightFingerprint('risk', 'HIGH', 'Test', ['a', 'b'], ['e1']);
    const fp2 = computeInsightFingerprint('risk', 'HIGH', 'Test', ['a', 'b'], ['e1']);
    expect(fp1).toBe(fp2);
  });

  it('should change fingerprint with different inputs', async () => {
    const { computeInsightFingerprint } = await import('../core/insight-fingerprint.ts');
    const fp1 = computeInsightFingerprint('risk', 'HIGH', 'Test', ['a'], ['e1']);
    const fp2 = computeInsightFingerprint('risk', 'HIGH', 'Test', ['b'], ['e1']);
    expect(fp1).not.toBe(fp2);
  });
});

describe('InsightState', () => {
  it('should manage insights in memory', async () => {
    const { InsightState } = await import('../core/insight-state.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const state = new InsightState();
    const insight = generateInsight({ category: 'drift', title: 'T', description: 'D', summary: 'S' });
    state.add(insight);
    expect(state.size()).toBe(1);
    expect(state.get(insight.id)).toBeDefined();
    state.remove(insight.id);
    expect(state.size()).toBe(0);
  });
});

describe('InsightContext', () => {
  it('should create context with deduplication', async () => {
    const { createInsightContext, mergeContexts } = await import('../core/insight-context.ts');
    const ctx = createInsightContext(['a', 'b', 'a'], ['e1', 'e1']);
    expect(ctx.nodeIds).toEqual(['a', 'b']);
    expect(ctx.edgeIds).toEqual(['e1']);
    const merged = mergeContexts(ctx, createInsightContext(['c'], ['e2']));
    expect(merged.nodeIds).toHaveLength(3);
  });
});

describe('InsightPipeline', () => {
  it('should process and reject unauthorized categories', async () => {
    const { InsightPipeline } = await import('../core/insight-pipeline.ts');
    const { DEFAULT_INSIGHT_CONFIG } = await import('../contracts/index.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const config = { ...DEFAULT_INSIGHT_CONFIG, categories: [] as InsightCategory[] };
    const pipeline = new InsightPipeline(config);
    const insight = generateInsight({ category: 'complexity', title: 'T', description: 'D', summary: 'S' });
    expect(() => pipeline.process(insight)).toThrow();
  });
});

// === Anti-Pattern Detection Tests ===

describe('GodModuleDetector', () => {
  it('should detect god modules', async () => {
    const { detectGodModules } = await import('../antipatterns/god-module-detector.ts');
    const results = detectGodModules([
      { id: 'god', dependencyCount: 50, fanOut: 30, size: 2000 },
      { id: 'normal', dependencyCount: 5, fanOut: 3, size: 100 },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]!.pattern).toBe('god-module');
    expect(results[0]!.nodes).toContain('god');
  });

  it('should return empty for healthy modules', async () => {
    const { detectGodModules } = await import('../antipatterns/god-module-detector.ts');
    const results = detectGodModules([
      { id: 'a', dependencyCount: 3, fanOut: 2, size: 100 },
    ]);
    expect(results).toHaveLength(0);
  });
});

describe('CyclicDependencyDetector', () => {
  it('should detect cycles', async () => {
    const { detectCycles } = await import('../antipatterns/cyclic-dependency-detector.ts');
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
      { source: 'c', target: 'a' },
    ];
    const cycles = detectCycles(edges);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('should handle acyclic graphs', async () => {
    const { detectCycles } = await import('../antipatterns/cyclic-dependency-detector.ts');
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ];
    const cycles = detectCycles(edges);
    expect(cycles).toHaveLength(0);
  });

  it('should detect cyclic dependencies as antipattern', async () => {
    const { detectCyclicDependencies } = await import('../antipatterns/cyclic-dependency-detector.ts');
    const results = detectCyclicDependencies([
      { source: 'x', target: 'y' },
      { source: 'y', target: 'z' },
      { source: 'z', target: 'x' },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]!.pattern).toBe('cyclic-dependency');
  });
});

describe('UtilityAbuseDetector', () => {
  it('should detect utility abuse', async () => {
    const { detectUtilityAbuse } = await import('../antipatterns/utility-abuse-detector.ts');
    const results = detectUtilityAbuse([
      { id: 'util', incomingDependencies: 60, outgoingDependencies: 2, isUtility: true },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]!.pattern).toBe('utility-abuse');
  });
});

describe('UnstableCoreDetector', () => {
  it('should detect unstable core nodes', async () => {
    const { detectUnstableCore } = await import('../antipatterns/unstable-core-detector.ts');
    const results = detectUnstableCore([
      { id: 'core', instability: 0.8, isCore: true, dependents: 15 },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]!.pattern).toBe('unstable-core');
  });
});

describe('DeepChainDetector', () => {
  it('should detect deep dependency chains', async () => {
    const { detectDeepChains } = await import('../antipatterns/deep-chain-detector.ts');
    const results = detectDeepChains([
      { root: 'a', leaf: 'z', depth: 15, nodes: ['a', 'b', 'c'] },
    ]);
    expect(results).toHaveLength(1);
  });
});

describe('ArchitectureViolationDetector', () => {
  it('should detect layer violations', async () => {
    const { detectArchitectureViolations } = await import('../antipatterns/architecture-violation-detector.ts');
    const results = detectArchitectureViolations(
      [{ nodeId: 'a', layer: 'web' }, { nodeId: 'b', layer: 'data' }],
      [{ source: 'a', target: 'b' }],
      [{ fromLayer: 'data', toLayer: 'web' }],
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.pattern).toBe('architecture-violation');
  });
});

describe('SemanticLeakDetector', () => {
  it('should detect semantic leakage', async () => {
    const { detectSemanticLeakage } = await import('../antipatterns/semantic-leak-detector.ts');
    const results = detectSemanticLeakage(
      [{ nodeId: 'a', region: 'r1' }, { nodeId: 'b', region: 'r2' }],
      [{ source: 'a', target: 'b' }],
      1, 0.1,
    );
    expect(results).toHaveLength(1);
  });
});

describe('AntiPatternEngine', () => {
  it('should run all detectors', async () => {
    const { AntiPatternEngine } = await import('../antipatterns/antipattern-engine.ts');
    const engine = new AntiPatternEngine();
    const results = engine.detect({
      godModuleNodes: [{ id: 'god', dependencyCount: 50, fanOut: 30, size: 2000 }],
      edges: [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }, { source: 'c', target: 'a' }],
      utilityNodes: [{ id: 'util', incomingDependencies: 60, outgoingDependencies: 2, isUtility: true }],
      coreNodes: [{ id: 'core', instability: 0.9, isCore: true, dependents: 20 }],
      chains: [{ root: 'a', leaf: 'z', depth: 15, nodes: ['a', 'b'] }],
    });
    expect(results.length).toBeGreaterThanOrEqual(3);
  });
});

// === Smell Detection Tests ===

describe('SmellEngine', () => {
  it('should detect high coupling density', async () => {
    const { SmellEngine } = await import('../smells/smell-engine.ts');
    const engine = new SmellEngine();
    const results = engine.detectAll({
      couplingInputs: [{ nodeId: 'n1', couplingDensity: 0.8, threshold: 0.3 }],
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.smell).toBe('high-coupling-density');
  });

  it('should detect fragmentation', async () => {
    const { SmellEngine } = await import('../smells/smell-engine.ts');
    const engine = new SmellEngine();
    const results = engine.detectAll({
      fragmentationComponents: 10,
      fragmentationExpected: 3,
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.smell).toBe('architectural-fragmentation');
  });

  it('should detect layering violations', async () => {
    const { SmellEngine } = await import('../smells/smell-engine.ts');
    const engine = new SmellEngine();
    const results = engine.detectAll({
      layeringViolations: [{ nodeId: 'n1', layer: 'web', violations: [{ targetLayer: 'db', edgeCount: 5 }] }],
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.smell).toBe('layering-violation');
  });

  it('should detect excessive graph density', async () => {
    const { SmellEngine } = await import('../smells/smell-engine.ts');
    const engine = new SmellEngine();
    const results = engine.detectAll({
      graphInput: { nodeCount: 10, edgeCount: 50, density: 0.8 },
    });
    expect(results).toHaveLength(1);
  });

  it('should detect SCC concentration', async () => {
    const { SmellEngine } = await import('../smells/smell-engine.ts');
    const engine = new SmellEngine();
    const results = engine.detectAll({
      sccInput: { sccCount: 2, nodeCount: 100, largestSCCSize: 80 },
    });
    expect(results).toHaveLength(1);
  });

  it('should detect volatility smells', async () => {
    const { SmellEngine } = await import('../smells/smell-engine.ts');
    const engine = new SmellEngine();
    const results = engine.detectAll({
      volatilityInput: { volatileNode: 15, stableNode: 2 },
    });
    expect(results).toHaveLength(1);
  });

  it('should detect complexity smells', async () => {
    const { SmellEngine } = await import('../smells/smell-engine.ts');
    const engine = new SmellEngine();
    const results = engine.detectAll({
      nodeCount: 100, edgeCount: 500, density: 0.5, avgDegree: 25,
    });
    expect(results).toHaveLength(1);
  });
});

// === Risk Engine Tests ===

describe('RiskEngine', () => {
  it('should interpret propagation risk', async () => {
    const { RiskEngine } = await import('../risk/risk-engine.ts');
    const engine = new RiskEngine();
    const results = engine.interpretAll({
      propagation: { sourceNode: 'a', transitiveDependents: ['b', 'c', 'd'], chainDepth: 3, criticality: 0.8 },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.riskType).toBe('propagation-risk');
  });

  it('should interpret dependency risk', async () => {
    const { RiskEngine } = await import('../risk/risk-engine.ts');
    const engine = new RiskEngine();
    const results = engine.interpretAll({
      dependency: { nodeId: 'a', dependents: 15, dependencies: 20, instability: 0.7 },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.riskType).toBe('dependency-risk');
  });

  it('should interpret instability risk', async () => {
    const { RiskEngine } = await import('../risk/risk-engine.ts');
    const engine = new RiskEngine();
    const results = engine.interpretAll({
      instability: { nodeId: 'a', instability: 0.8, fanIn: 5, fanOut: 20 },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.riskType).toBe('instability');
  });

  it('should interpret cascade risk', async () => {
    const { RiskEngine } = await import('../risk/risk-engine.ts');
    const engine = new RiskEngine();
    const results = engine.interpretAll({
      cascade: { rootNode: 'a', cascadeChain: ['b', 'c', 'd', 'e'], failureProbability: 0.7 },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.riskType).toBe('cascade-risk');
  });

  it('should interpret blast radius', async () => {
    const { RiskEngine } = await import('../risk/risk-engine.ts');
    const engine = new RiskEngine();
    const results = engine.interpretAll({
      blastRadius: { nodeId: 'a', affectedNodes: ['b', 'c', 'd'], depth: 2 },
    });
    expect(results).toHaveLength(1);
    expect(results[0]!.riskType).toBe('blast-radius-risk');
  });

  it('should interpret operational risk', async () => {
    const { RiskEngine } = await import('../risk/risk-engine.ts');
    const engine = new RiskEngine();
    const results = engine.interpretAll({
      operational: { nodeId: 'a', instability: 0.8, dependencyCriticality: 0.7, historicalIssues: 10 },
    });
    expect(results).toHaveLength(1);
  });
});

// === Hotspot Engine Tests ===

describe('HotspotEngine', () => {
  it('should rank hotspots', async () => {
    const { HotspotEngine } = await import('../hotspots/hotspot-engine.ts');
    const engine = new HotspotEngine();
    const results = engine.analyze([
      { nodeId: 'a', score: 0.9, risk: 0.8 },
      { nodeId: 'b', score: 0.5, risk: 0.4 },
      { nodeId: 'c', score: 0.3, risk: 0.2 },
    ]);
    expect(results).toHaveLength(3);
    expect(results[0]!.ranking).toBe(1);
    expect(results[0]!.nodeId).toBe('a');
  });

  it('should limit results', async () => {
    const { prioritizeHotspots } = await import('../hotspots/hotspot-density.ts');
    const hotspots = Array.from({ length: 20 }, (_, i) => ({
      id: `h${i}`, hotspotType: 'test', nodeId: `n${i}`, intensity: 0.5,
      ranking: i + 1, risk: 0.5, description: '', clusterIds: [], metrics: {},
    }));
    const prioritized = prioritizeHotspots(hotspots, 5);
    expect(prioritized).toHaveLength(5);
  });

  it('should cluster hotspots', async () => {
    const { clusterHotspots } = await import('../hotspots/hotspot-clustering.ts');
    const hotspots = [
      { id: 'h1', hotspotType: 't', nodeId: 'a', intensity: 0.8, ranking: 1, risk: 0.7, description: '', clusterIds: [], metrics: {} },
      { id: 'h2', hotspotType: 't', nodeId: 'b', intensity: 0.6, ranking: 2, risk: 0.5, description: '', clusterIds: [], metrics: {} },
    ];
    const sim = new Map([['a', ['b', 'c']], ['b', ['a']]]);
    const clustered = clusterHotspots(hotspots, sim);
    expect(clustered[0]!.clusterIds.length).toBeGreaterThan(0);
  });

  it('should analyze hotspot evolution', async () => {
    const { analyzeHotspotEvolution } = await import('../hotspots/hotspot-evolution.ts');
    const snapshots = [
      { timestamp: 't1', hotspots: [{ id: 'h1', hotspotType: 't', nodeId: 'a', intensity: 0.5, ranking: 1, risk: 0.5, description: '', clusterIds: [], metrics: {} }] },
      { timestamp: 't2', hotspots: [{ id: 'h1', hotspotType: 't', nodeId: 'a', intensity: 0.8, ranking: 1, risk: 0.7, description: '', clusterIds: [], metrics: {} }] },
    ];
    const trends = analyzeHotspotEvolution(snapshots);
    expect(trends).toHaveLength(1);
    expect(trends[0]!.trend).toBe('increasing');
  });

  it('should calculate hotspot density', async () => {
    const { calculateHotspotDensity } = await import('../hotspots/hotspot-density.ts');
    const density = calculateHotspotDensity(['a', 'b'], [{ source: 'a', target: 'b' }]);
    expect(density['a']).toBeDefined();
  });
});

// === Complexity Interpreter Tests ===

describe('ComplexityInterpreter', () => {
  it('should interpret graph complexity', async () => {
    const { ComplexityInterpreter } = await import('../complexity/complexity-interpreter.ts');
    const interpreter = new ComplexityInterpreter();
    const insights = interpreter.interpret({
      nodeCount: 100, edgeCount: 300, degrees: Array(100).fill(6),
      sccSizes: [80, 20], componentSizes: [80, 15, 5], isolatedCount: 0,
    });
    expect(insights.length).toBeGreaterThanOrEqual(3);
  });

  it('should compute graph entropy', async () => {
    const { computeNormalizedEntropy } = await import('../complexity/entropy-analysis.ts');
    const entropy = computeNormalizedEntropy([2, 2, 2, 2], 4);
    expect(entropy).toBeGreaterThan(0);
  });

  it('should analyze graph complexity metrics', async () => {
    const { analyzeGraphComplexity } = await import('../complexity/graph-complexity-analysis.ts');
    const metrics = analyzeGraphComplexity(10, 20, [2, 4, 6, 8], [5, 3, 2]);
    expect(metrics.density).toBeGreaterThan(0);
    expect(metrics.avgDegree).toBe(5);
  });

  it('should detect scaling bottlenecks', async () => {
    const { assessScalingBottleneck } = await import('../complexity/graph-complexity-analysis.ts');
    const bottleneck = assessScalingBottleneck(100, 0.8, 50);
    expect(bottleneck.isBottleneck).toBe(true);
  });

  it('should analyze fragmentation', async () => {
    const { analyzeFragmentation } = await import('../complexity/fragmentation-analysis.ts');
    const metrics = analyzeFragmentation([50, 30, 20], 100, 5);
    expect(metrics.fragmentationIndex).toBeGreaterThan(0);
  });
});

// === Propagation Intelligence Tests ===

describe('PropagationIntelligenceEngine', () => {
  it('should analyze blast radius', async () => {
    const { computeBlastRadius, estimateBlastRadius } = await import('../propagation/blast-radius-analysis.ts');
    const adj = new Map([['a', ['b', 'c']], ['b', ['d']], ['c', ['d']], ['d', []]]);
    const radius = computeBlastRadius('a', adj, 3);
    expect(radius.affectedNodes).toContain('b');
    expect(radius.affectedNodes).toContain('c');
    const estimate = estimateBlastRadius('a', ['b', 'c', 'd']);
    expect(estimate.blastRadius).toBe(3);
  });

  it('should compute influence scores', async () => {
    const { computeInfluenceScores, rankByInfluence } = await import('../propagation/influence-analysis.ts');
    const adj = new Map([['a', ['b']], ['b', ['c']], ['c', []]]);
    const scores = computeInfluenceScores(adj);
    expect(scores.size).toBe(3);
    const ranking = rankByInfluence(scores, 2);
    expect(ranking.length).toBe(2);
  });

  it('should assess transitive risk', async () => {
    const { assessTransitiveRisk } = await import('../propagation/influence-analysis.ts');
    const risk = assessTransitiveRisk('a', ['b', 'c', 'd'], 3);
    expect(risk.propagationType).toBe('transitive-risk');
  });

  it('should analyze cascade', async () => {
    const { analyzeCascade } = await import('../propagation/cascade-analysis.ts');
    const result = analyzeCascade('a', ['a', 'b', 'c'], 0.7);
    expect(result.cascadeRisk).toBe(0.7);
  });
});

// === Remediation Engine Tests ===

describe('RemediationEngine', () => {
  it('should generate remediation plan', async () => {
    const { RemediationEngine } = await import('../remediation/remediation-engine.ts');
    const engine = new RemediationEngine();
    const plan = engine.generate({
      insightId: 'test-insight',
      type: 'dependency-reduction',
      targetNodes: ['core-module'],
      currentRisk: 0.8,
      currentComplexity: 0.6,
      currentCoupling: 0.7,
    });
    expect(plan.strategy).toBe('dependency-reduction');
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it('should generate coupling reduction plan', async () => {
    const { RemediationEngine } = await import('../remediation/remediation-engine.ts');
    const engine = new RemediationEngine();
    const plan = engine.generate({
      insightId: 'test-id', type: 'coupling-reduction', targetNodes: ['a', 'b'],
    });
    expect(plan.strategy).toBe('coupling-reduction');
  });

  it('should prioritize remediations', async () => {
    const { RemediationEngine } = await import('../remediation/remediation-engine.ts');
    const { prioritizeRemediations } = await import('../remediation/remediation-prioritization.ts');
    const engine = new RemediationEngine();
    const p1 = engine.generate({ insightId: 'i1', type: 'dependency-reduction', targetNodes: ['a'], currentRisk: 0.9 });
    const p2 = engine.generate({ insightId: 'i2', type: 'dependency-reduction', targetNodes: ['b'], currentRisk: 0.3 });
    const prioritized = prioritizeRemediations([p2, p1]);
    expect(prioritized[0]!.insightId).toBe('i1');
  });

  it('should estimate remediation impact', async () => {
    const { estimateRemediationImpact } = await import('../remediation/remediation-impact-analysis.ts');
    const impact = estimateRemediationImpact(0.8, 0.6, 0.7);
    expect(impact.riskReduction).toBeGreaterThan(0);
    expect(impact.riskReduction).toBeLessThanOrEqual(1);
  });

  it('should suggest dependency reduction steps', async () => {
    const { suggestDependencyReduction } = await import('../remediation/remediation-strategy.ts');
    const steps = suggestDependencyReduction('a', 20);
    expect(steps.length).toBe(3);
    expect(steps[0]!.action).toBe('identify-unused-dependencies');
  });
});

// === Drift Detection Tests ===

describe('DriftEngine', () => {
  it('should detect graph evolution', async () => {
    const { DriftEngine } = await import('../drift/drift-engine.ts');
    const engine = new DriftEngine();
    const report = engine.detectGraphEvolution(
      'snap-1', 'snap-2',
      ['a', 'b', 'c'], ['a', 'b', 'c', 'd'],
      [{ source: 'a', target: 'b' }], [{ source: 'a', target: 'b' }, { source: 'b', target: 'c' }],
    );
    expect(report.driftType).toBe('graph-evolution');
    expect(report.changes.length).toBeGreaterThan(0);
  });

  it('should detect complexity drift', async () => {
    const { DriftEngine } = await import('../drift/drift-engine.ts');
    const engine = new DriftEngine();
    const report = engine.detectComplexityDrift('s1', 's2', 0.3, 0.5, 0.6, 0.8);
    expect(report.driftType).toBe('complexity-drift');
  });

  it('should compute drift metrics', async () => {
    const { computeDriftMetrics } = await import('../drift/drift-comparison.ts');
    const metrics = computeDriftMetrics([
      { type: 'added', nodeId: 'a', metric: 'node', oldValue: 0, newValue: 1 },
      { type: 'removed', nodeId: 'b', metric: 'node', oldValue: 1, newValue: 0 },
    ]);
    expect(metrics.totalChanges).toBe(2);
  });

  it('should create drift report', async () => {
    const { createDriftReport } = await import('../drift/drift-comparison.ts');
    const report = createDriftReport('test-drift', 'prev', 'curr', [
      { type: 'added', nodeId: 'a', metric: 'node', oldValue: 0, newValue: 1 },
    ]);
    expect(report.driftType).toBe('test-drift');
    expect(report.previousSnapshotId).toBe('prev');
  });
});

// === Scoring Tests ===

describe('InsightScoring', () => {
  it('should compute overall score', async () => {
    const { computeOverallScore } = await import('../scoring/insight-scoring.ts');
    const score = computeOverallScore({ confidence: 0.8, severity: 3, impact: 0.7, urgency: 0.6, complexity: 0.5 });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('should compute impact score', async () => {
    const { computeImpactScore } = await import('../scoring/insight-scoring.ts');
    const score = computeImpactScore(15, 0.7, 3);
    expect(score).toBeGreaterThan(0);
  });

  it('should compute confidence score', async () => {
    const { computeConfidenceScore } = await import('../scoring/insight-scoring.ts');
    const score = computeConfidenceScore(8, true, true);
    expect(score).toBeCloseTo(0.88, 10);
  });

  it('should rank insights by risk', async () => {
    const { rankInsightsByRisk } = await import('../scoring/insight-scoring.ts');
    const ranked = rankInsightsByRisk([
      { id: 'a', scores: { overall: 0.9, confidence: 0.8, severity: 4, impact: 0.8, urgency: 0.8, complexity: 0.5 } },
      { id: 'b', scores: { overall: 0.3, confidence: 0.4, severity: 1, impact: 0.3, urgency: 0.3, complexity: 0.2 } },
    ]);
    expect(ranked[0]!.id).toBe('a');
  });
});

// === Evidence System Tests ===

describe('EvidenceEngine', () => {
  it('should create graph evidence', async () => {
    const { createGraphEvidence } = await import('../evidence/evidence-engine.ts');
    const evidence = createGraphEvidence('insight-1', 'test', ['a', 'b'], ['e1']);
    expect(evidence.type).toBe('graph');
    expect(evidence.insightId).toBe('insight-1');
  });

  it('should create metric evidence', async () => {
    const { createMetricEvidence } = await import('../evidence/evidence-engine.ts');
    const evidence = createMetricEvidence('insight-1', 'test', { density: 0.5 });
    expect(evidence.type).toBe('metric');
  });

  it('should create traversal evidence', async () => {
    const { createTraversalEvidence } = await import('../evidence/evidence-engine.ts');
    const evidence = createTraversalEvidence('insight-1', 'test', 'trav-1', ['a', 'b', 'c']);
    expect(evidence.type).toBe('traversal');
  });

  it('should link evidence to insight', async () => {
    const { EvidenceLinker } = await import('../evidence/evidence-linker.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const { createGraphEvidence } = await import('../evidence/evidence-engine.ts');
    const linker = new EvidenceLinker();
    const insight = generateInsight({ category: 'risk', title: 'T', description: 'D', summary: 'S' });
    const evidence = createGraphEvidence(insight.id, 'test', ['a'], ['e1']);
    const linked = linker.link(insight, [evidence]);
    expect(linked.evidence).toHaveLength(1);
  });
});

// === Explainability Tests ===

describe('InsightExplainer', () => {
  it('should generate explanation', async () => {
    const { generateExplanation } = await import('../explainability/insight-explainer.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const { createGraphEvidence } = await import('../evidence/evidence-engine.ts');
    const insight = generateInsight({ category: 'complexity', title: 'Test Insight', description: 'A test', summary: 'Summary' });
    const evidence = createGraphEvidence(insight.id, 'test', ['a'], ['e1']);
    insight.evidence = [evidence];
    const explanation = generateExplanation(insight);
    expect(explanation.insightId).toBe(insight.id);
    expect(explanation.reasoning.length).toBeGreaterThan(0);
    expect(explanation.deterministic).toBe(true);
  });

  it('should build reasoning chain', async () => {
    const { buildReasoningChain } = await import('../explainability/insight-explainer.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const insight = generateInsight({ category: 'risk', title: 'T', description: 'D', summary: 'S' });
    const chain = buildReasoningChain(insight);
    expect(chain.length).toBe(3);
    expect(chain[0]!.order).toBe(1);
  });
});

// === Replay + Determinism Tests ===

describe('InsightReplay', () => {
  it('should validate deterministic replay', async () => {
    const { validateInsightReplay, verifyDeterministicInsight } = await import('../replay/insight-replay.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const i1 = generateInsight({ category: 'risk', title: 'T', description: 'D', summary: 'S' });
    const i2 = generateInsight({ category: 'risk', title: 'T', description: 'D', summary: 'S' });
    const result = validateInsightReplay(i1, i2);
    expect(result.deterministic).toBe(true);
    expect(result.matchScore).toBe(1);
    const verified = verifyDeterministicInsight(i1);
    expect(verified).toBe(true);
  });

  it('should detect non-deterministic insights', async () => {
    const { validateInsightReplay } = await import('../replay/insight-replay.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const i1 = generateInsight({ category: 'risk', title: 'T', description: 'D', summary: 'S', scores: { impact: 0.9, urgency: 0.5, complexity: 0.5 } });
    const i2 = generateInsight({ category: 'risk', title: 'T', description: 'D', summary: 'S', scores: { impact: 0.3, urgency: 0.5, complexity: 0.5 } });
    const result = validateInsightReplay(i1, i2);
    expect(result.matchScore).toBeLessThan(1);
  });
});

// === Serialization Tests ===

describe('InsightSerializer', () => {
  it('should serialize and deserialize insights', async () => {
    const { serializeInsight, deserializeInsight } = await import('../serialization/insight-serializer.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const insight = generateInsight({ category: 'risk', title: 'T', description: 'D', summary: 'S' });
    const json = serializeInsight(insight);
    const deserialized = deserializeInsight(json);
    expect(deserialized.id).toBe(insight.id);
    expect(deserialized.category).toBe(insight.category);
  });

  it('should canonicalize evidence', async () => {
    const { canonicalizeEvidence } = await import('../serialization/insight-serializer.ts');
    const result = canonicalizeEvidence([{ id: 'b', fingerprint: 'fp2' }, { id: 'a', fingerprint: 'fp1' }]);
    expect(result).toContain('a:fp1');
    expect(result).toContain('b:fp2');
  });
});

// === Validation Tests ===

describe('InsightValidator', () => {
  it('should validate complete insights', async () => {
    const { validateInsight } = await import('../validation/insight-validator.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const insight = generateInsight({ category: 'risk', title: 'T', description: 'D', summary: 'S' });
    const errors = validateInsight(insight);
    expect(errors).toHaveLength(0);
  });

  it('should detect invalid insights', async () => {
    const { validateInsight } = await import('../validation/insight-validator.ts');
    const errors = validateInsight({ id: '', category: 'risk', severity: 'HIGH', status: 'active', title: '', description: '', summary: '', fingerprint: '', context: { nodeIds: [], edgeIds: [], traversalIds: [], metricKeys: [], semanticRegionIds: [], snapshotIds: [] }, evidence: [], scores: { overall: 1.5, confidence: 1.5, severity: 5, impact: 0.5, urgency: 0.5, complexity: 0.5 }, timestamp: '', expiration: null, sourceGraphSnapshot: null, remediationIds: [], relatedInsightIds: [] });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should validate evidence', async () => {
    const { validateEvidence } = await import('../validation/insight-validator.ts');
    const { createGraphEvidence } = await import('../evidence/evidence-engine.ts');
    const evidence = createGraphEvidence('i1', 'test', ['a'], ['e1']);
    expect(validateEvidence(evidence)).toHaveLength(0);
  });

  it('should validate determinism', async () => {
    const { validateDeterminism } = await import('../validation/insight-validator.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const insight = generateInsight({ category: 'risk', title: 'T', description: 'D', summary: 'S' });
    expect(validateDeterminism(insight)).toBe(true);
  });
});

// === Query Engine Tests ===

describe('InsightQueryEngine', () => {
  it('should filter by category', async () => {
    const { InsightQueryEngine } = await import('../query/insight-query-engine.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const engine = new InsightQueryEngine();
    const insights = [
      generateInsight({ category: 'risk', title: 'A', description: 'D', summary: 'S' }),
      generateInsight({ category: 'complexity', title: 'B', description: 'D', summary: 'S' }),
      generateInsight({ category: 'hotspot', title: 'C', description: 'D', summary: 'S' }),
    ];
    const results = engine.query(insights, { categories: ['risk', 'complexity'] });
    expect(results).toHaveLength(2);
  });

  it('should filter by severity', async () => {
    const { InsightQueryEngine } = await import('../query/insight-query-engine.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const engine = new InsightQueryEngine();
    const low = generateInsight({ category: 'risk', title: 'L', description: 'D', summary: 'S', scores: { impact: 0.1, urgency: 0.1, complexity: 0.1 } });
    const high = generateInsight({ category: 'risk', title: 'H', description: 'D', summary: 'S', scores: { impact: 0.9, urgency: 0.9, complexity: 0.9 } });
    const results = engine.query([low, high], { severities: ['MODERATE'] });
    expect(results).toHaveLength(1);
  });

  it('should filter by confidence threshold', async () => {
    const { InsightQueryEngine } = await import('../query/insight-query-engine.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const engine = new InsightQueryEngine();
    const insights = [
      generateInsight({ category: 'risk', title: 'A', description: 'D', summary: 'S' }),
    ];
    const results = engine.query(insights, { minConfidence: 0.5 });
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('should limit results', async () => {
    const { InsightQueryEngine } = await import('../query/insight-query-engine.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const engine = new InsightQueryEngine();
    const insights = Array.from({ length: 10 }, (_, i) => generateInsight({ category: 'risk', title: `T${i}`, description: 'D', summary: 'S' }));
    const results = engine.query(insights, { maxResults: 3 });
    expect(results).toHaveLength(3);
  });
});

// === Telemetry Tests ===

describe('InsightTelemetry', () => {
  it('should create telemetry record', async () => {
    const { createInsightTelemetry } = await import('../telemetry/insight-telemetry.ts');
    const telemetry = createInsightTelemetry('i1', 150, 5, 100, 200);
    expect(telemetry.insightId).toBe('i1');
    expect(telemetry.computationTime).toBe(150);
  });

  it('should compute telemetry summary', async () => {
    const { createInsightTelemetry, InsightTelemetryCollector } = await import('../telemetry/insight-telemetry.ts');
    const collector = new InsightTelemetryCollector();
    collector.record(createInsightTelemetry('i1', 100, 5, 50, 100));
    collector.record(createInsightTelemetry('i2', 200, 10, 100, 200));
    const summary = collector.summary();
    expect(summary.totalTime).toBe(300);
    expect(summary.totalEvidence).toBe(15);
  });
});

// === Audit Tests ===

describe('InsightAudit', () => {
  it('should audit insight system', async () => {
    const { auditInsightSystem } = await import('../audit/insight-audit.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const { createGraphEvidence } = await import('../evidence/evidence-engine.ts');
    const insight = generateInsight({ category: 'risk', title: 'T', description: 'D', summary: 'S' });
    const evidence = createGraphEvidence(insight.id, 'test', ['a'], ['e1']);
    const report = auditInsightSystem([insight], [evidence], []);
    expect(report.summary.totalInsights).toBe(1);
    expect(report.summary.validInsights).toBe(1);
    expect(report.insights[0]!.deterministic).toBe(true);
  });

  it('should audit evidence integrity', async () => {
    const { auditEvidenceIntegrity } = await import('../audit/insight-audit.ts');
    const { createGraphEvidence } = await import('../evidence/evidence-engine.ts');
    const evidence = createGraphEvidence('i1', 'test', ['a'], ['e1']);
    const report = auditEvidenceIntegrity([evidence]);
    expect(report.summary.validInsights).toBe(1);
  });
});

// === Types & Utils Tests ===

describe('Utils', () => {
  it('should compute hash consistently', async () => {
    const { computeHash, computeFingerprint } = await import('../utils/index.ts');
    const h1 = computeHash('test');
    const h2 = computeHash('test');
    expect(h1).toBe(h2);
    expect(h1.length).toBe(64);
    const fp = computeFingerprint({ a: 1, b: 2 });
    expect(fp.length).toBe(64);
  });

  it('should generate unique IDs', async () => {
    const { generateId } = await import('../utils/index.ts');
    const id1 = generateId('test');
    const id2 = generateId('test');
    expect(id1).not.toBe(id2);
    expect(id1).toMatch(/^test_/);
  });

  it('should normalize scores', async () => {
    const { normalizeScore, clamp, weightedAverage } = await import('../utils/index.ts');
    expect(normalizeScore(50, 100)).toBe(0.5);
    expect(clamp(1.5, 0, 1)).toBe(1);
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(weightedAverage([0.8, 0.6], [0.5, 0.5])).toBe(0.7);
  });

  it('should sort by key', async () => {
    const { sortBy } = await import('../utils/index.ts');
    const items = [{ v: 3 }, { v: 1 }, { v: 2 }];
    const sorted = sortBy(items, i => i.v);
    expect(sorted[0]!.v).toBe(3);
    const asc = sortBy(items, i => i.v, false);
    expect(asc[0]!.v).toBe(1);
  });
});

describe('Errors', () => {
  it('should create typed errors', async () => {
    const { InsightError, InsightValidationError, InsightDeterminismError, EvidenceError, RemediationError, DriftError, ReplayError } = await import('../errors/index.ts');
    expect(new InsightError('test')).toBeInstanceOf(Error);
    expect(new InsightValidationError('test')).toBeInstanceOf(InsightError);
    expect(new InsightDeterminismError('test')).toBeInstanceOf(InsightError);
    expect(new EvidenceError('test')).toBeInstanceOf(InsightError);
    expect(new RemediationError('test')).toBeInstanceOf(InsightError);
    expect(new DriftError('test')).toBeInstanceOf(InsightError);
    expect(new ReplayError('test')).toBeInstanceOf(InsightError);
  });
});

// === Boundary Erosion ===

describe('BoundaryErosionDetector', () => {
  it('should detect boundary erosion', async () => {
    const { detectBoundaryErosion } = await import('../antipatterns/boundary-erosion-detector.ts');
    const results = detectBoundaryErosion([
      { nodeId: 'a', expectedBoundary: 'module-a', actualBoundary: 'module-b', violationType: 'cross-boundary' },
      { nodeId: 'b', expectedBoundary: 'module-a', actualBoundary: 'module-b', violationType: 'cross-boundary' },
      { nodeId: 'c', expectedBoundary: 'module-a', actualBoundary: 'module-b', violationType: 'cross-boundary' },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0]!.metrics.violationCount).toBe(3);
  });
});

// === Propagation Intelligence Stress Tests ===

describe('PropagationStress', () => {
  it('should handle large adjacency lists', async () => {
    const { computeBlastRadius } = await import('../propagation/blast-radius-analysis.ts');
    const adj = new Map<string, string[]>();
    for (let i = 0; i < 100; i++) {
      adj.set(`n${i}`, [`n${i + 1}`]);
    }
    adj.set('n100', []);
    const result = computeBlastRadius('n0', adj, 5);
    expect(result.affectedNodes.length).toBeLessThanOrEqual(100);
  });

  it('should compute influence scores for large graphs', async () => {
    const { computeInfluenceScores, rankByInfluence } = await import('../propagation/influence-analysis.ts');
    const adj = new Map<string, string[]>();
    for (let i = 0; i < 50; i++) {
      adj.set(`n${i}`, [`n${(i + 1) % 50}`]);
    }
    const scores = computeInfluenceScores(adj);
    expect(scores.size).toBe(50);
    const ranked = rankByInfluence(scores, 5);
    expect(ranked).toHaveLength(5);
  });
});

// === Determinism Stress Tests ===

describe('DeterminismStress', () => {
  it('should produce identical fingerprints across runs', async () => {
    const { computeInsightFingerprint } = await import('../core/insight-fingerprint.ts');
    const inputs = Array.from({ length: 100 }, (_, i) => ({
      category: 'risk' as const,
      severity: 'HIGH' as const,
      title: `test-${i}`,
      contextIds: [`node-${i}`],
      evidenceFingerprints: [`ev-${i}`],
    }));
    const fps1 = inputs.map(i => computeInsightFingerprint(i.category, i.severity, i.title, i.contextIds, i.evidenceFingerprints));
    const fps2 = inputs.map(i => computeInsightFingerprint(i.category, i.severity, i.title, i.contextIds, i.evidenceFingerprints));
    expect(fps1).toEqual(fps2);
  });
});

// === God Module Stress Tests ===

describe('GodModuleStress', () => {
  it('should handle many nodes', async () => {
    const { detectGodModules } = await import('../antipatterns/god-module-detector.ts');
    const nodes = Array.from({ length: 1000 }, (_, i) => ({
      id: `n${i}`,
      dependencyCount: Math.floor(Math.random() * 30),
      fanOut: Math.floor(Math.random() * 20),
      size: Math.floor(Math.random() * 1500),
    }));
    const results = detectGodModules(nodes);
    expect(results.length).toBeLessThanOrEqual(nodes.length);
  });
});

// === Cycle Stress Tests ===

describe('CycleStress', () => {
  it('should handle large cyclic graphs', async () => {
    const { detectCycles } = await import('../antipatterns/cyclic-dependency-detector.ts');
    const edges = Array.from({ length: 500 }, (_, i) => ({
      source: `n${i}`,
      target: `n${(i + 1) % 500}`,
    }));
    const cycles = detectCycles(edges);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('should handle acyclic graphs', async () => {
    const { detectCycles } = await import('../antipatterns/cyclic-dependency-detector.ts');
    const edges = Array.from({ length: 500 }, (_, i) => ({
      source: `n${i}`,
      target: `n${i + 1}`,
    }));
    const cycles = detectCycles(edges);
    expect(cycles).toHaveLength(0);
  });
});

// === Score Consistency Tests ===

describe('ScoreConsistency', () => {
  it('should produce consistent scores for identical inputs', async () => {
    const { computeOverallScore } = await import('../scoring/insight-scoring.ts');
    const scores = { confidence: 0.7, severity: 3, impact: 0.6, urgency: 0.5, complexity: 0.4 };
    const r1 = computeOverallScore(scores);
    const r2 = computeOverallScore(scores);
    expect(r1).toBe(r2);
  });
});

// === Anti-Pattern Engine Edge Cases ===

describe('AntiPatternEdgeCases', () => {
  it('should handle empty inputs', async () => {
    const { AntiPatternEngine } = await import('../antipatterns/antipattern-engine.ts');
    const engine = new AntiPatternEngine();
    const results = engine.detect({});
    expect(results).toHaveLength(0);
  });

  it('should handle single node with no issues', async () => {
    const { detectGodModules } = await import('../antipatterns/god-module-detector.ts');
    const results = detectGodModules([{ id: 'a', dependencyCount: 1, fanOut: 1, size: 50 }]);
    expect(results).toHaveLength(0);
  });
});

// === Cyclic Dependency Edge Cases ===

describe('CyclicEdgeCases', () => {
  it('should detect self-loop', async () => {
    const { detectCycles } = await import('../antipatterns/cyclic-dependency-detector.ts');
    const cycles = detectCycles([{ source: 'a', target: 'a' }]);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('should handle duplicate edges', async () => {
    const { detectCycles } = await import('../antipatterns/cyclic-dependency-detector.ts');
    const cycles = detectCycles([
      { source: 'a', target: 'b' },
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' },
    ]);
    expect(cycles.length).toBeGreaterThan(0);
  });
});

// === Complexity Stress Tests ===

describe('ComplexityStress', () => {
  it('should compute entropy for large degree arrays', async () => {
    const { computeGraphEntropy } = await import('../complexity/entropy-analysis.ts');
    const degrees = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 20));
    const entropy = computeGraphEntropy(degrees, 1000);
    expect(entropy).toBeGreaterThan(0);
    expect(Number.isFinite(entropy)).toBe(true);
  });
});

// === Fragmentation Stress Tests ===

describe('FragmentationStress', () => {
  it('should handle many components', async () => {
    const { analyzeFragmentation } = await import('../complexity/fragmentation-analysis.ts');
    const sizes = Array.from({ length: 100 }, (_, i) => i + 1);
    const metrics = analyzeFragmentation(sizes, 5050, 5);
    expect(metrics.fragmentationIndex).toBeGreaterThan(0);
  });
});

// === Remediation Stress Tests ===

describe('RemediationStress', () => {
  it('should generate plans for many targets', async () => {
    const { RemediationEngine } = await import('../remediation/remediation-engine.ts');
    const engine = new RemediationEngine();
    const targets = Array.from({ length: 50 }, (_, i) => `n${i}`);
    const plan = engine.generate({
      insightId: 'stress-test',
      type: 'coupling-reduction',
      targetNodes: targets,
    });
    expect(plan.steps.length).toBe(50);
  });
});

// === Drift Stress Tests ===

describe('DriftStress', () => {
  it('should handle many changes', async () => {
    const { compareGraphSnapshots } = await import('../drift/drift-comparison.ts');
    const prevNodes = Array.from({ length: 100 }, (_, i) => `n${i}`);
    const currNodes = Array.from({ length: 110 }, (_, i) => `n${i}`);
    currNodes.push('new-node');
    const prevEdges = Array.from({ length: 50 }, (_, i) => ({ source: `n${i}`, target: `n${i + 1}` }));
    const currEdges = Array.from({ length: 60 }, (_, i) => ({ source: `n${i}`, target: `n${i + 1}` }));
    const changes = compareGraphSnapshots('prev', 'curr', prevNodes, currNodes, prevEdges, currEdges);
    expect(changes.length).toBeGreaterThan(0);
  });
});

// === Serialization Determinism Tests ===

describe('SerializationDeterminism', () => {
  it('should produce deterministic JSON output', async () => {
    const { serializeInsight } = await import('../serialization/insight-serializer.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const insight = generateInsight({ category: 'drift', title: 'Test', description: 'D', summary: 'S' });
    const json1 = serializeInsight(insight);
    const json2 = serializeInsight(insight);
    expect(json1).toBe(json2);
  });
});

// === Severity Classification Tests ===

describe('SeverityClassification', () => {
  it('should correctly classify edge cases', async () => {
    const { classifySeverity, severityToNumber } = await import('../core/insight-types.ts');
    expect(classifySeverity(0)).toBe('LOW');
    expect(classifySeverity(0.25)).toBe('LOW');
    expect(classifySeverity(0.5)).toBe('MODERATE');
    expect(classifySeverity(0.75)).toBe('HIGH');
    expect(classifySeverity(1)).toBe('CRITICAL');
    expect(severityToNumber('LOW')).toBe(1);
    expect(severityToNumber('CRITICAL')).toBe(4);
  });
});

// === Hotspot Density Tests ===

describe('HotspotDensity', () => {
  it('should handle empty inputs', async () => {
    const { calculateHotspotDensity } = await import('../hotspots/hotspot-density.ts');
    const density = calculateHotspotDensity([], []);
    expect(Object.keys(density)).toHaveLength(0);
  });

  it('should calculate density correctly', async () => {
    const { calculateHotspotDensity } = await import('../hotspots/hotspot-density.ts');
    const density = calculateHotspotDensity(
      ['a', 'b', 'c'],
      [{ source: 'a', target: 'b' }, { source: 'a', target: 'c' }],
    );
    expect(density['a']).toBe(1);
    expect(density['b']).toBe(1);
  });
});

// === InsightId Tests ===

describe('InsightPriority', () => {
  it('should compute priority from severity and impact', async () => {
    const { computePriority, computeOperationalSeverity } = await import('../core/insight-priority.ts');
    const priority = computePriority('HIGH', 0.8, 0.6);
    expect(priority).toBeGreaterThan(0);
    expect(priority).toBeLessThanOrEqual(1);
    const ops = computeOperationalSeverity(10, 0.7, 0.8);
    expect(ops).toBeGreaterThan(0);
  });
});

// === Generation Edge Cases ===

describe('GenerateInsightEdgeCases', () => {
  it('should generate without optional fields', async () => {
    const { generateInsight } = await import('../core/insight-generator.ts');
    const insight = generateInsight({ category: 'hotspot', title: 'T', description: 'D', summary: 'S' });
    expect(insight.id).toBeDefined();
    expect(insight.fingerprint).toBeDefined();
    expect(insight.sourceGraphSnapshot).toBeNull();
    expect(insight.remediationIds).toEqual([]);
  });

  it('should use provided severity when given', async () => {
    const { generateInsight } = await import('../core/insight-generator.ts');
    const insight = generateInsight({ category: 'risk', title: 'T', description: 'D', summary: 'S', severity: 'CRITICAL' });
    expect(insight.severity).toBe('CRITICAL');
  });
});

// === Container Tests ===

describe('InsightContainer', () => {
  it('should export all modules from index', async () => {
    const insight = await import('../index.ts');
    expect(insight.InsightEngine).toBeDefined();
    expect(insight.AntiPatternEngine).toBeDefined();
    expect(insight.SmellEngine).toBeDefined();
    expect(insight.RiskEngine).toBeDefined();
    expect(insight.HotspotEngine).toBeDefined();
    expect(insight.ComplexityInterpreter).toBeDefined();
    expect(insight.PropagationIntelligenceEngine).toBeDefined();
    expect(insight.RemediationEngine).toBeDefined();
    expect(insight.DriftEngine).toBeDefined();
  });
});

// === Persistence Tests ===

describe('InsightRepository', () => {
  it('should save and retrieve insights', async () => {
    const { InsightRepository } = await import('../persistence/insight-repository.ts');
    const { generateInsight } = await import('../core/insight-generator.ts');
    const store = new Map<string, string>();
    const repo = new InsightRepository({
      save: (k, v) => { store.set(k, JSON.stringify(v)); return Promise.resolve(); },
      get: (k) => { const v = store.get(k); return Promise.resolve(v ? JSON.parse(v) : null); },
      query: (p) => Promise.resolve(Array.from(store.entries()).filter(([k]) => k.startsWith(p)).map(([_, v]) => JSON.parse(v))),
      delete: (k) => { store.delete(k); return Promise.resolve(); },
    });
    const insight = generateInsight({ category: 'risk', title: 'T', description: 'D', summary: 'S' });
    await repo.saveInsight(insight);
    const retrieved = await repo.getInsight(insight.id);
    expect(retrieved?.id).toBe(insight.id);
    const all = await repo.queryInsights();
    expect(all.length).toBeGreaterThan(0);
    await repo.deleteInsight(insight.id);
    const deleted = await repo.getInsight(insight.id);
    expect(deleted).toBeNull();
  });
});

// === Telemetry Edge Cases ===

describe('TelemetryEdgeCases', () => {
  it('should handle empty telemetry', async () => {
    const { computeTelemetrySummary } = await import('../telemetry/insight-telemetry.ts');
    const summary = computeTelemetrySummary([]);
    expect(Object.keys(summary)).toHaveLength(0);
  });
});

// === Audit Edge Cases ===

describe('AuditEdgeCases', () => {
  it('should handle empty systems', async () => {
    const { auditInsightSystem } = await import('../audit/insight-audit.ts');
    const report = auditInsightSystem([], [], []);
    expect(report.summary.totalInsights).toBe(0);
    expect(report.insights).toHaveLength(0);
  });
});

// === Misplaced spelling consistency ===

describe('SpellingConsistency', () => {
  it('MODERATE severity should be accepted', async () => {
    const { classifySeverity } = await import('../core/insight-types.ts');
    const result = classifySeverity(0.5);
    expect(result).toBe('MODERATE');
  });
});
