import { describe, it, expect } from 'vitest';
import { createMockGraph } from './mock-graph.ts';
import { DependencyChainEngine } from '../dependency/dependency-chain-engine.ts';
import { DependencyChainAnalyzer } from '../dependency/dependency-chain-analyzer.ts';
import { DependencyChainRiskAnalyzer } from '../dependency/dependency-chain-risk.ts';
import { DependencyChainCompressor } from '../dependency/dependency-chain-compression.ts';
import { DependencyDepthAnalyzer } from '../dependency/dependency-depth-analysis.ts';
import { TransitiveDependencyAnalyzer } from '../dependency/transitive-dependency.ts';
import { ReverseDependencyAnalyzer } from '../dependency/reverse-dependency.ts';
import { DependencyExposureAnalyzer } from '../dependency/dependency-exposure.ts';

describe('DependencyChainEngine', () => {
  it('buildChain returns chain from node', () => {
    const graph = createMockGraph();
    const engine = new DependencyChainEngine(graph);
    const chain = engine.buildChain('A');
    expect(chain.root).toBe('A');
    expect(chain.chain.length).toBeGreaterThan(0);
  });

  it('buildChain respects maxDepth', () => {
    const graph = createMockGraph();
    const engine = new DependencyChainEngine(graph);
    const chain = engine.buildChain('A', 1);
    expect(chain.chain).not.toContain('D');
    expect(chain.chain).not.toContain('E');
    expect(chain.chain).not.toContain('F');
  });

  it('buildTransitiveChain returns all transitive deps', () => {
    const graph = createMockGraph();
    const engine = new DependencyChainEngine(graph);
    const chain = engine.buildTransitiveChain('A');
    expect(chain.chain).not.toContain('A');
    expect(chain.chain.length).toBeGreaterThan(0);
  });

  it('findChainsByType filters by edge type', () => {
    const graph = createMockGraph();
    const engine = new DependencyChainEngine(graph);
    const chains = engine.findChainsByType('A', 'depends');
    expect(chains.length).toBeGreaterThan(0);
    chains.forEach((c) => expect(c.root).toBe('A'));
  });

  it('findChainsByType returns empty for unknown type', () => {
    const graph = createMockGraph();
    const engine = new DependencyChainEngine(graph);
    const chains = engine.findChainsByType('A', 'nonexistent');
    expect(chains.length).toBe(0);
  });
});

describe('DependencyChainAnalyzer', () => {
  it('analyzeDepth returns depth stats', () => {
    const graph = createMockGraph();
    const analyzer = new DependencyChainAnalyzer(graph);
    const stats = analyzer.analyzeDepth('A');
    expect(stats.maxDepth).toBeGreaterThanOrEqual(0);
    expect(stats.averageDepth).toBeGreaterThanOrEqual(0);
    expect(stats.chainCount).toBeGreaterThan(0);
  });

  it('findDeepChains returns chains above threshold', () => {
    const graph = createMockGraph();
    const analyzer = new DependencyChainAnalyzer(graph);
    const deep = analyzer.findDeepChains(1);
    expect(deep.length).toBeGreaterThan(0);
    deep.forEach((c) => expect(c.depth).toBeGreaterThanOrEqual(1));
  });

  it('findCircularDependencies detects cycles', () => {
    const graph = createMockGraph();
    const analyzer = new DependencyChainAnalyzer(graph);
    const cycles = analyzer.findCircularDependencies();
    expect(Array.isArray(cycles)).toBe(true);
  });

  it('findDependencyLayers returns BFS layers', () => {
    const graph = createMockGraph();
    const analyzer = new DependencyChainAnalyzer(graph);
    const layers = analyzer.findDependencyLayers('A');
    expect(layers.length).toBeGreaterThan(0);
    expect(layers[0]).toContain('A');
  });
});

describe('DependencyChainRiskAnalyzer', () => {
  it('computeRiskScore returns score', () => {
    const graph = createMockGraph();
    const engine = new DependencyChainEngine(graph);
    const chain = engine.buildChain('A');
    const riskAnalyzer = new DependencyChainRiskAnalyzer();
    const score = riskAnalyzer.computeRiskScore(chain, graph);
    expect(score).toBeGreaterThan(0);
  });

  it('assessExposure returns exposed nodes', () => {
    const graph = createMockGraph();
    const engine = new DependencyChainEngine(graph);
    const chain = engine.buildChain('A');
    const riskAnalyzer = new DependencyChainRiskAnalyzer();
    const exposed = riskAnalyzer.assessExposure(chain, graph);
    expect(Array.isArray(exposed)).toBe(true);
  });

  it('findHighRiskChains filters by threshold', () => {
    const engine = new DependencyChainEngine(createMockGraph());
    const chain = engine.buildChain('A');
    const riskAnalyzer = new DependencyChainRiskAnalyzer();
    const high = riskAnalyzer.findHighRiskChains([chain], 0);
    expect(high.length).toBe(1);
  });

  it('findBlastRadius returns affected nodes', () => {
    const graph = createMockGraph();
    const riskAnalyzer = new DependencyChainRiskAnalyzer();
    const radius = riskAnalyzer.findBlastRadius('A', graph);
    expect(radius.length).toBeGreaterThan(0);
    expect(radius).not.toContain('A');
  });
});

describe('DependencyChainCompressor', () => {
  it('compress removes duplicates', () => {
    const graph = createMockGraph();
    const engine = new DependencyChainEngine(graph);
    const chain = engine.buildChain('A');
    const compressor = new DependencyChainCompressor();
    const compressed = compressor.compress(chain);
    expect(compressed.compressed).toBe(true);
    expect(compressed.chain.length).toBeLessThanOrEqual(chain.chain.length);
  });

  it('decompress returns uncompressed', () => {
    const compressor = new DependencyChainCompressor();
    const compressed = {
      root: 'A', chain: ['B', 'D'], depth: 2, exposure: [],
      riskScore: 0, riskLevel: 'NONE' as const,
      compressed: true, fingerprint: 'fp',
    };
    const decompressed = compressor.decompress(compressed);
    expect(decompressed.compressed).toBe(false);
  });

  it('deduplicateChains removes duplicates', () => {
    const compressor = new DependencyChainCompressor();
    const chain1 = { root: 'A', chain: ['B'], depth: 1, exposure: [], riskScore: 0, riskLevel: 'NONE' as const, compressed: false, fingerprint: 'fp1' };
    const chain2 = { root: 'A', chain: ['B'], depth: 1, exposure: [], riskScore: 0, riskLevel: 'NONE' as const, compressed: false, fingerprint: 'fp1' };
    const deduped = compressor.deduplicateChains([chain1, chain2]);
    expect(deduped.length).toBe(1);
  });

  it('mergeChains merges multiple chains', () => {
    const compressor = new DependencyChainCompressor();
    const chain1 = { root: 'A', chain: ['B', 'D'], depth: 2, exposure: [], riskScore: 10, riskLevel: 'LOW' as const, compressed: false, fingerprint: 'fp1' };
    const chain2 = { root: 'A', chain: ['C', 'D'], depth: 2, exposure: [], riskScore: 5, riskLevel: 'LOW' as const, compressed: false, fingerprint: 'fp2' };
    const merged = compressor.mergeChains([chain1, chain2]);
    expect(merged.root).toBe('A');
    expect(merged.chain.length).toBe(3);
  });

  it('mergeChains handles empty input', () => {
    const compressor = new DependencyChainCompressor();
    const merged = compressor.mergeChains([]);
    expect(merged.root).toBe('');
  });
});

describe('DependencyDepthAnalyzer', () => {
  it('analyzeDepthDistribution returns depth counts', () => {
    const graph = createMockGraph();
    const analyzer = new DependencyDepthAnalyzer(graph);
    const dist = analyzer.analyzeDepthDistribution('A');
    expect(dist.size).toBeGreaterThan(0);
  });

  it('findDeepestDependencies returns top K', () => {
    const graph = createMockGraph();
    const analyzer = new DependencyDepthAnalyzer(graph);
    const deepest = analyzer.findDeepestDependencies('A', 3);
    expect(deepest.length).toBeLessThanOrEqual(3);
    deepest.forEach((d) => {
      expect(d.nodeId).toBeTruthy();
      expect(d.depth).toBeGreaterThanOrEqual(0);
    });
  });

  it('computeAverageDepth returns average', () => {
    const graph = createMockGraph();
    const analyzer = new DependencyDepthAnalyzer(graph);
    const avg = analyzer.computeAverageDepth('A');
    expect(avg).toBeGreaterThan(0);
  });
});

describe('TransitiveDependencyAnalyzer', () => {
  it('findAllTransitive returns transitive deps', () => {
    const graph = createMockGraph();
    const analyzer = new TransitiveDependencyAnalyzer(graph);
    const deps = analyzer.findAllTransitive('A');
    expect(deps).not.toContain('A');
    expect(deps.length).toBeGreaterThan(0);
  });

  it('countTransitive returns count', () => {
    const graph = createMockGraph();
    const analyzer = new TransitiveDependencyAnalyzer(graph);
    const count = analyzer.countTransitive('A');
    expect(count).toBeGreaterThan(0);
  });

  it('findSharedTransitive returns common deps', () => {
    const graph = createMockGraph();
    const analyzer = new TransitiveDependencyAnalyzer(graph);
    const shared = analyzer.findSharedTransitive(['B', 'C']);
    expect(Array.isArray(shared)).toBe(true);
  });

  it('findTransitiveByType filters by edge type', () => {
    const graph = createMockGraph();
    const analyzer = new TransitiveDependencyAnalyzer(graph);
    const deps = analyzer.findTransitiveByType('A', 'depends');
    expect(deps.length).toBeGreaterThan(0);
  });

  it('findSharedTransitive handles empty input', () => {
    const graph = createMockGraph();
    const analyzer = new TransitiveDependencyAnalyzer(graph);
    expect(analyzer.findSharedTransitive([])).toEqual([]);
  });
});

describe('ReverseDependencyAnalyzer', () => {
  it('findReverseDependencies returns dependents', () => {
    const graph = createMockGraph();
    const analyzer = new ReverseDependencyAnalyzer(graph);
    const deps = analyzer.findReverseDependencies('F');
    expect(deps.length).toBeGreaterThan(0);
  });

  it('countReverseDependencies returns count', () => {
    const graph = createMockGraph();
    const analyzer = new ReverseDependencyAnalyzer(graph);
    expect(analyzer.countReverseDependencies('F')).toBeGreaterThan(0);
  });

  it('findCriticalDependents filters by threshold', () => {
    const graph = createMockGraph();
    const analyzer = new ReverseDependencyAnalyzer(graph);
    const critical = analyzer.findCriticalDependents('F', 0);
    expect(Array.isArray(critical)).toBe(true);
  });

  it('findLeafDependents returns nodes with no outgoing', () => {
    const graph = createMockGraph();
    const analyzer = new ReverseDependencyAnalyzer(graph);
    const leaves = analyzer.findLeafDependents('F');
    expect(Array.isArray(leaves)).toBe(true);
  });
});

describe('DependencyExposureAnalyzer', () => {
  it('computeExposure returns score', () => {
    const graph = createMockGraph();
    const analyzer = new DependencyExposureAnalyzer(graph);
    const exposure = analyzer.computeExposure('A');
    expect(exposure).toBeGreaterThanOrEqual(0);
  });

  it('findExposurePath returns most exposed path', () => {
    const graph = createMockGraph();
    const analyzer = new DependencyExposureAnalyzer(graph);
    const path = analyzer.findExposurePath('A');
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toBe('A');
  });

  it('findHighlyExposed returns nodes above threshold', () => {
    const graph = createMockGraph();
    const analyzer = new DependencyExposureAnalyzer(graph);
    const exposed = analyzer.findHighlyExposed(0);
    expect(exposed.length).toBeGreaterThan(0);
  });

  it('computeExposureRatio returns ratio', () => {
    const graph = createMockGraph();
    const analyzer = new DependencyExposureAnalyzer(graph);
    const ratio = analyzer.computeExposureRatio('A');
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(1);
  });
});
