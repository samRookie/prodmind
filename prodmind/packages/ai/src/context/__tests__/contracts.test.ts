import { beforeEach,describe, expect, it } from 'vitest';

import {
  contextConfigSchema,
  contextWeightsSchema,
  resetContextConfig,
  resolveContextConfig,
  tokenBudgetSchema,
} from '../config.ts';
import {
  createAssemblyMetrics,
  createAssemblyTrace,
  createAssemblyTraceEntry,
  createContextAssemblyResult,
  createContextBudget,
  createContextCompressionEnvelope,
  createContextDependencyChain,
  createContextDependencyEdge,
  createContextNode,
  createContextRegion,
  createContextReplayEnvelope,
  createContextSlice,
  createRankedContextResult,
  createRetrievalCandidate,
} from '../contracts.ts';
import {
  BudgetExceededError,
  CompressionError,
  ContextAssemblyError,
  DedupError,
  InvalidRegionError,
  RankingError,
  ReplayMismatchError,
  RetrievalPhaseError,
  SlicingError,
  TokenBudgetError,
} from '../errors.ts';

describe('ContextNode', () => {
  it('creates frozen ContextNode with all fields', () => {
    const node = createContextNode({
      nodeId: 'n1',
      filePath: 'src/main.ts',
      depth: 2,
      nodeType: 'class',
      language: 'typescript',
      symbolName: 'App',
      centralityScore: 0.8,
      instabilityScore: 0.3,
      propagationRiskScore: 0.5,
      fanIn: 5,
      fanOut: 3,
      semanticType: 'API_LAYER',
    });

    expect(node.nodeId).toBe('n1');
    expect(node.filePath).toBe('src/main.ts');
    expect(node.depth).toBe(2);
    expect(node.symbolName).toBe('App');
    expect(Object.isFrozen(node)).toBe(true);
  });

  it('allows null fields', () => {
    const node = createContextNode({
      nodeId: 'n2',
      filePath: 'src/utils.ts',
      depth: 0,
      nodeType: 'function',
      language: null,
      symbolName: null,
      centralityScore: null,
      instabilityScore: null,
      propagationRiskScore: null,
      fanIn: null,
      fanOut: null,
      semanticType: null,
    });

    expect(node.language).toBeNull();
    expect(node.symbolName).toBeNull();
    expect(node.centralityScore).toBeNull();
  });
});

describe('ContextDependencyEdge', () => {
  it('creates frozen edge', () => {
    const edge = createContextDependencyEdge({
      sourceNodeId: 'n1',
      targetNodeId: 'n2',
      edgeType: 'IMPORTS',
      weight: 1.0,
    });

    expect(edge.sourceNodeId).toBe('n1');
    expect(edge.targetNodeId).toBe('n2');
    expect(edge.weight).toBe(1.0);
    expect(Object.isFrozen(edge)).toBe(true);
  });
});

describe('ContextRegion', () => {
  it('creates frozen region with sorted nodeIds', () => {
    const region = createContextRegion({
      regionName: 'api-layer',
      nodeIds: ['n3', 'n1', 'n2'],
      semanticType: 'API_LAYER',
      clusterName: 'core',
    });

    expect(region.regionName).toBe('api-layer');
    expect(region.nodeIds).toEqual(['n1', 'n2', 'n3']);
    expect(region.nodeCount).toBe(3);
    expect(Object.isFrozen(region)).toBe(true);
    expect(Object.isFrozen(region.nodeIds)).toBe(true);
  });

  it('handles null semanticType and clusterName', () => {
    const region = createContextRegion({
      regionName: 'unknown',
      nodeIds: [],
      semanticType: null,
      clusterName: null,
    });

    expect(region.nodeCount).toBe(0);
    expect(region.nodeIds).toEqual([]);
  });
});

describe('ContextDependencyChain', () => {
  it('creates frozen chain with generated id', () => {
    const node = createContextNode({
      nodeId: 'n1',
      filePath: 'a.ts',
      depth: 0,
      nodeType: 'module',
      language: 'typescript',
      symbolName: null,
      centralityScore: null,
      instabilityScore: null,
      propagationRiskScore: null,
      fanIn: null,
      fanOut: null,
      semanticType: null,
    });

    const edge = createContextDependencyEdge({
      sourceNodeId: 'n1',
      targetNodeId: 'n2',
      edgeType: 'IMPORTS',
      weight: null,
    });

    const chain = createContextDependencyChain({
      direction: 'upstream',
      nodes: [node],
      edges: [edge],
      totalRisk: 0.5,
      maxDepth: 1,
    });

    expect(chain.chainId).toBeTruthy();
    expect(chain.direction).toBe('upstream');
    expect(chain.totalRisk).toBe(0.5);
    expect(chain.maxDepth).toBe(1);
    expect(chain.nodes).toHaveLength(1);
    expect(chain.edges).toHaveLength(1);
    expect(Object.isFrozen(chain)).toBe(true);
    expect(Object.isFrozen(chain.nodes)).toBe(true);
    expect(Object.isFrozen(chain.edges)).toBe(true);
  });
});

describe('ContextSlice', () => {
  it('creates frozen slice with generated id', () => {
    const slice = createContextSlice({
      kind: 'local_neighborhood',
      strategy: 'DEPENDENCY_NEIGHBORHOOD',
      nodes: [],
      edges: [],
      regions: [],
      chains: [],
      tokenCount: 500,
      metadata: { source: 'test' },
    });

    expect(slice.id).toBeTruthy();
    expect(slice.kind).toBe('local_neighborhood');
    expect(slice.strategy).toBe('DEPENDENCY_NEIGHBORHOOD');
    expect(slice.tokenCount).toBe(500);
    expect(Object.isFrozen(slice)).toBe(true);
    expect(Object.isFrozen(slice.metadata)).toBe(true);
  });
});

describe('ContextCompressionEnvelope', () => {
  it('calculates ratio correctly', () => {
    const envelope = createContextCompressionEnvelope({
      kind: 'compressed',
      originalTokenCount: 1000,
      compressedTokenCount: 300,
      contextType: 'file',
      sourcePath: 'src/main.ts',
    });

    expect(envelope.ratio).toBeCloseTo(0.3, 5);
    expect(envelope.kind).toBe('compressed');
  });

  it('returns ratio of 1 for zero original tokens', () => {
    const envelope = createContextCompressionEnvelope({
      kind: 'raw',
      originalTokenCount: 0,
      compressedTokenCount: 0,
      contextType: 'empty',
      sourcePath: '',
    });

    expect(envelope.ratio).toBe(1);
  });
});

describe('ContextBudget', () => {
  it('calculates remaining and flags', () => {
    const budget = createContextBudget({
      total: 16000,
      used: 8000,
      reserved: 1000,
      hardLimit: 16000,
      softLimit: 12000,
    });

    expect(budget.remaining).toBe(8000);
    expect(budget.isOverHard).toBe(false);
    expect(budget.isOverSoft).toBe(false);
  });

  it('flags over-soft when used exceeds soft limit', () => {
    const budget = createContextBudget({
      total: 16000,
      used: 14000,
      reserved: 1000,
      hardLimit: 16000,
      softLimit: 12000,
    });

    expect(budget.isOverSoft).toBe(true);
    expect(budget.isOverHard).toBe(false);
  });

  it('flags over-hard when used exceeds hard limit', () => {
    const budget = createContextBudget({
      total: 16000,
      used: 17000,
      reserved: 1000,
      hardLimit: 16000,
      softLimit: 12000,
    });

    expect(budget.isOverHard).toBe(true);
    expect(budget.isOverSoft).toBe(true);
  });
});

describe('RetrievalCandidate', () => {
  it('creates frozen candidate', () => {
    const node = createContextNode({
      nodeId: 'n1', filePath: 'a.ts', depth: 0, nodeType: 'module',
      language: 'typescript', symbolName: null,
      centralityScore: null, instabilityScore: null, propagationRiskScore: null,
      fanIn: null, fanOut: null, semanticType: null,
    });

    const candidate = createRetrievalCandidate({
      node,
      compositeScore: 0.85,
      centralityScore: 0.9,
      proximityScore: 0.7,
      semanticScore: 0.8,
      riskScore: 0.5,
      source: 'DEPENDENCY_NEIGHBORHOOD',
      reason: 'high centrality',
    });

    expect(candidate.compositeScore).toBe(0.85);
    expect(candidate.source).toBe('DEPENDENCY_NEIGHBORHOOD');
    expect(Object.isFrozen(candidate)).toBe(true);
  });
});

describe('RankedContextResult', () => {
  it('creates frozen result with totals', () => {
    const result = createRankedContextResult({
      candidates: [],
      strategy: 'METRIC_WEIGHTED',
      weightsUsed: { centrality: 0.25, proximity: 0.25, semantic: 0.25, risk: 0.25 },
      discardedCount: 5,
    });

    expect(result.totalCandidates).toBe(0);
    expect(result.discardedCount).toBe(5);
    expect(result.strategy).toBe('METRIC_WEIGHTED');
    expect(Object.isFrozen(result.weightsUsed)).toBe(true);
  });
});

describe('AssemblyTraceEntry', () => {
  it('creates frozen trace entry with timestamp', () => {
    const entry = createAssemblyTraceEntry({
      operation: 'retrieve',
      details: { strategy: 'DEPENDENCY_NEIGHBORHOOD' },
      durationMs: 42,
      resultCount: 10,
    });

    expect(entry.operation).toBe('retrieve');
    expect(entry.timestamp).toBeTruthy();
    expect(entry.durationMs).toBe(42);
    expect(entry.resultCount).toBe(10);
    expect(Object.isFrozen(entry)).toBe(true);
  });
});

describe('AssemblyTrace', () => {
  it('sorts entries by timestamp and sums duration', () => {
    const e1 = createAssemblyTraceEntry({
      operation: 'retrieve', details: {}, durationMs: 10, resultCount: 5,
    });

    const e2 = createAssemblyTraceEntry({
      operation: 'rank', details: {}, durationMs: 20, resultCount: 5,
    });

    const trace = createAssemblyTrace([e2, e1]);
    expect(trace.entries).toHaveLength(2);
    expect(trace.totalDurationMs).toBe(30);
    expect(trace.operationCount).toBe(2);
    expect(Object.isFrozen(trace)).toBe(true);
    expect(Object.isFrozen(trace.entries)).toBe(true);
  });
});

describe('AssemblyMetrics', () => {
  it('creates frozen metrics', () => {
    const metrics = createAssemblyMetrics({
      totalRetrieved: 100,
      totalRanked: 50,
      totalSliced: 5,
      totalCompressed: 3,
      totalDeduped: 1,
      totalDiscarded: 10,
      finalTokenCount: 8000,
      budgetUtilization: 0.5,
      assemblyDurationMs: 200,
    });

    expect(metrics.totalRetrieved).toBe(100);
    expect(metrics.finalTokenCount).toBe(8000);
    expect(Object.isFrozen(metrics)).toBe(true);
  });
});

describe('ContextAssemblyResult', () => {
  it('creates frozen result with generated timestamp', () => {
    const slice = createContextSlice({
      kind: 'local_neighborhood', strategy: 'DEPENDENCY_NEIGHBORHOOD',
      nodes: [], edges: [], regions: [], chains: [], tokenCount: 0,
    });

    const budget = createContextBudget({
      total: 16000, used: 0, reserved: 1000, hardLimit: 16000, softLimit: 12000,
    });

    const trace = createAssemblyTrace([]);

    const metrics = createAssemblyMetrics({
      totalRetrieved: 0, totalRanked: 0, totalSliced: 0, totalCompressed: 0,
      totalDeduped: 0, totalDiscarded: 0, finalTokenCount: 0, budgetUtilization: 0,
      assemblyDurationMs: 0,
    });

    const result = createContextAssemblyResult({
      request: { snapshotId: 'snap-1' },
      slices: [slice],
      budget,
      trace,
      metrics,
      fingerprint: 'abc123',
    });

    expect(result.request.snapshotId).toBe('snap-1');
    expect(result.slices).toHaveLength(1);
    expect(result.fingerprint).toBe('abc123');
    expect(result.generatedAt).toBeTruthy();
    expect(Object.isFrozen(result)).toBe(true);
  });
});

describe('ContextReplayEnvelope', () => {
  it('creates frozen replay envelope', () => {
    const slice = createContextSlice({
      kind: 'local_neighborhood', strategy: 'DEPENDENCY_NEIGHBORHOOD',
      nodes: [], edges: [], regions: [], chains: [], tokenCount: 0,
    });

    const budget = createContextBudget({
      total: 16000, used: 0, reserved: 1000, hardLimit: 16000, softLimit: 12000,
    });

    const trace = createAssemblyTrace([]);

    const metrics = createAssemblyMetrics({
      totalRetrieved: 0, totalRanked: 0, totalSliced: 0, totalCompressed: 0,
      totalDeduped: 0, totalDiscarded: 0, finalTokenCount: 0, budgetUtilization: 0,
      assemblyDurationMs: 0,
    });

    const result = createContextAssemblyResult({
      request: { snapshotId: 'snap-1' },
      slices: [slice], budget, trace, metrics, fingerprint: 'abc',
    });

    const envelope = createContextReplayEnvelope({
      originalFingerprint: 'abc',
      replayedFingerprint: 'abc',
      match: true,
      divergence: [],
      originalResult: result,
      replayedResult: result,
    });

    expect(envelope.match).toBe(true);
    expect(envelope.divergence).toEqual([]);
    expect(Object.isFrozen(envelope)).toBe(true);
    expect(Object.isFrozen(envelope.divergence)).toBe(true);
  });
});

describe('Errors', () => {
  it('ContextAssemblyError has contextCode', () => {
    const err = new ContextAssemblyError('TEST_CODE', 'test error');
    expect(err.code).toBe('TEST_CODE');
    expect(err.message).toBe('test error');
    expect(err.contextCode).toBe('TEST_CODE');
    expect(err).toBeInstanceOf(Error);
  });

  it('RetrievalPhaseError extends ContextAssemblyError', () => {
    const err = new RetrievalPhaseError('no candidates', 0);
    expect(err.contextCode).toBe('RETRIEVAL_ERROR');
    expect(err.candidateCount).toBe(0);
    expect(err).toBeInstanceOf(ContextAssemblyError);
  });

  it('RankingError has weightConfig', () => {
    const err = new RankingError('bad config', 'centrality:2');
    expect(err.weightConfig).toBe('centrality:2');
    expect(err.contextCode).toBe('RANKING_ERROR');
  });

  it('SlicingError has sliceKind', () => {
    const err = new SlicingError('unknown kind', 'invalid_slice');
    expect(err.sliceKind).toBe('invalid_slice');
  });

  it('BudgetExceededError has available and required', () => {
    const err = new BudgetExceededError(1000, 5000);
    expect(err.available).toBe(1000);
    expect(err.required).toBe(5000);
    expect(err.message).toContain('5000');
    expect(err.message).toContain('1000');
  });

  it('CompressionError has inputTokenCount', () => {
    const err = new CompressionError('compression failed', 5000);
    expect(err.inputTokenCount).toBe(5000);
  });

  it('DedupError has candidateCount', () => {
    const err = new DedupError('dedup failed', 150);
    expect(err.candidateCount).toBe(150);
  });

  it('ReplayMismatchError has fingerprints and divergence', () => {
    const err = new ReplayMismatchError('abc', 'def', ['node count']);
    expect(err.originalFingerprint).toBe('abc');
    expect(err.replayedFingerprint).toBe('def');
    expect(err.divergence).toEqual(['node count']);
    expect(Object.isFrozen(err.divergence)).toBe(true);
  });

  it('InvalidRegionError has regionName', () => {
    const err = new InvalidRegionError('bad-region', 'empty node set');
    expect(err.regionName).toBe('bad-region');
    expect(err.message).toContain('bad-region');
    expect(err.message).toContain('empty node set');
  });

  it('TokenBudgetError has budget and estimate', () => {
    const err = new TokenBudgetError(5000, 10000);
    expect(err.budgetLimit).toBe(5000);
    expect(err.tokenEstimate).toBe(10000);
  });
});

describe('Config', () => {
  beforeEach(() => {
    resetContextConfig();
  });

  describe('contextWeightsSchema', () => {
    it('accepts default weights', () => {
      const result = contextWeightsSchema.parse({});
      expect(result.centrality).toBe(0.25);
      expect(result.proximity).toBe(0.25);
      expect(result.semantic).toBe(0.25);
      expect(result.risk).toBe(0.25);
    });

    it('accepts custom weights summing to 1', () => {
      const result = contextWeightsSchema.parse({
        centrality: 0.5, proximity: 0.2, semantic: 0.2, risk: 0.1,
      });
      expect(result.centrality).toBe(0.5);
    });

    it('rejects weights not summing to 1', () => {
      expect(() =>
        contextWeightsSchema.parse({
          centrality: 0.5, proximity: 0.2, semantic: 0.2, risk: 0.2,
        })
      ).toThrow();
    });

    it('rejects negative weights', () => {
      expect(() =>
        contextWeightsSchema.parse({
          centrality: -0.1, proximity: 0.4, semantic: 0.4, risk: 0.3,
        })
      ).toThrow();
    });
  });

  describe('tokenBudgetSchema', () => {
    it('accepts defaults', () => {
      const result = tokenBudgetSchema.parse({});
      expect(result.hardLimit).toBe(16000);
      expect(result.softLimit).toBe(12000);
      expect(result.reservedPerRegion).toBe(1000);
    });
  });

  describe('contextConfigSchema', () => {
    it('accepts defaults', () => {
      const result = contextConfigSchema.parse({});
      expect(result.maxCandidates).toBe(200);
      expect(result.rankingTopK).toBe(50);
      expect(result.compressionPreference).toBe('adaptive');
    });

    it('accepts all preferences', () => {
      const result = contextConfigSchema.parse({
        compressionPreference: 'prefer_raw',
      });
      expect(result.compressionPreference).toBe('prefer_raw');
    });

    it('rejects invalid compression preference', () => {
      expect(() =>
        contextConfigSchema.parse({
          compressionPreference: 'invalid',
        })
      ).toThrow();
    });
  });

  describe('resolveContextConfig', () => {
    it('returns default config with no overrides', () => {
      const config = resolveContextConfig();
      expect(config.maxCandidates).toBe(200);
      expect(config.weights.centrality).toBe(0.25);
    });

    it('merges overrides with defaults', () => {
      const config = resolveContextConfig({ maxCandidates: 50, enableTracing: false });
      expect(config.maxCandidates).toBe(50);
      expect(config.enableTracing).toBe(false);
      expect(config.maxDepth).toBe(10);
    });

    it('caches and returns same instance on second call', () => {
      const a = resolveContextConfig();
      const b = resolveContextConfig();
      expect(a).toBe(b);
    });

    it('returns fresh config when overrides provided', () => {
      const a = resolveContextConfig({ maxCandidates: 100 });
      const b = resolveContextConfig({ maxCandidates: 200 });
      expect(a.maxCandidates).toBe(100);
      expect(b.maxCandidates).toBe(200);
    });

    it('resets cache on resetContextConfig', () => {
      const a = resolveContextConfig();
      resetContextConfig();
      const b = resolveContextConfig();
      expect(a).not.toBe(b);
    });
  });
});
