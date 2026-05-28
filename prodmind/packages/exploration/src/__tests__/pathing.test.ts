import { describe, it, expect } from 'vitest';
import { createMockGraph } from './mock-graph.ts';
import { PathFinder } from '../pathing/path-finder.ts';
import { ShortestPathFinder } from '../pathing/shortest-path.ts';
import { WeightedPathFinder } from '../pathing/weighted-path.ts';
import { PathRiskAnalyzer } from '../pathing/path-risk-analysis.ts';
import { PathComparator } from '../pathing/path-comparison.ts';
import { PathSerializer } from '../pathing/path-serialization.ts';
import { PathFingerprint } from '../pathing/path-fingerprint.ts';
import { PathQuery } from '../pathing/path-query.ts';

describe('PathFinder', () => {
  it('findAllPaths finds paths between nodes', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const paths = finder.findAllPaths('A', 'F');
    expect(paths.length).toBeGreaterThan(0);
    paths.forEach((p) => {
      expect(p.nodes[0]).toBe('A');
      expect(p.nodes[p.nodes.length - 1]).toBe('F');
    });
  });

  it('findAllPaths respects maxDepth', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const paths = finder.findAllPaths('A', 'F', 2);
    expect(paths.length).toBe(0);
  });

  it('findAnyPath returns a path', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const path = finder.findAnyPath('A', 'F');
    expect(path).not.toBeNull();
    expect(path!.nodes[0]).toBe('A');
    expect(path!.nodes[path!.nodes.length - 1]).toBe('F');
  });

  it('findAnyPath returns null for unreachable', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const path = finder.findAnyPath('A', 'UNKNOWN');
    expect(path).toBeNull();
  });

  it('existsPath returns true for connected nodes', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    expect(finder.existsPath('A', 'F')).toBe(true);
  });

  it('existsPath returns false for disconnected nodes', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    expect(finder.existsPath('A', 'UNKNOWN')).toBe(false);
  });

  it('buildResult computes totalWeight', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const path = finder.findAnyPath('A', 'D');
    expect(path).not.toBeNull();
    expect(path!.totalWeight).toBeGreaterThan(0);
  });
});

describe('ShortestPathFinder', () => {
  it('findUnweighted returns shortest path', () => {
    const graph = createMockGraph();
    const finder = new ShortestPathFinder(graph);
    const path = finder.findUnweighted('A', 'F');
    expect(path).not.toBeNull();
    expect(path!.nodes[0]).toBe('A');
    expect(path!.nodes[path!.nodes.length - 1]).toBe('F');
  });

  it('findUnweighted returns null for unreachable', () => {
    const graph = createMockGraph();
    const finder = new ShortestPathFinder(graph);
    expect(finder.findUnweighted('A', 'UNKNOWN')).toBeNull();
  });

  it('findWeighted returns shortest weighted path', () => {
    const graph = createMockGraph();
    const finder = new ShortestPathFinder(graph);
    const path = finder.findWeighted('A', 'F');
    expect(path).not.toBeNull();
    expect(path!.totalWeight).toBeGreaterThan(0);
  });

  it('findWeighted returns null for unreachable', () => {
    const graph = createMockGraph();
    const finder = new ShortestPathFinder(graph);
    expect(finder.findWeighted('A', 'UNKNOWN')).toBeNull();
  });

  it('findTopK returns up to k paths', () => {
    const graph = createMockGraph();
    const finder = new ShortestPathFinder(graph);
    const paths = finder.findTopK('A', 'F', 3);
    expect(paths.length).toBeLessThanOrEqual(3);
    paths.forEach((p) => {
      expect(p.nodes[0]).toBe('A');
    });
  });

  it('findTopK returns sorted by weight', () => {
    const graph = createMockGraph();
    const finder = new ShortestPathFinder(graph);
    const paths = finder.findTopK('A', 'F', 3);
    for (let i = 1; i < paths.length; i++) {
      expect(paths[i - 1]!.totalWeight).toBeLessThanOrEqual(paths[i]!.totalWeight);
    }
  });
});

describe('WeightedPathFinder', () => {
  it('findMinWeight returns cheapest path', () => {
    const graph = createMockGraph();
    const finder = new WeightedPathFinder(graph);
    const path = finder.findMinWeight('A', 'F');
    expect(path).not.toBeNull();
    expect(path!.totalWeight).toBeGreaterThan(0);
  });

  it('findMinWeight returns null for unreachable', () => {
    const graph = createMockGraph();
    const finder = new WeightedPathFinder(graph);
    expect(finder.findMinWeight('A', 'UNKNOWN')).toBeNull();
  });

  it('findMaxWeight returns heaviest path', () => {
    const graph = createMockGraph();
    const finder = new WeightedPathFinder(graph);
    const path = finder.findMaxWeight('A', 'F');
    if (path) {
      expect(path.totalWeight).toBeGreaterThan(0);
    }
  });

  it('findBoundedWeight returns path within limit', () => {
    const graph = createMockGraph();
    const finder = new WeightedPathFinder(graph);
    const path = finder.findBoundedWeight('A', 'F', 100);
    if (path) {
      expect(path.totalWeight).toBeLessThanOrEqual(100);
    }
  });
});

describe('PathRiskAnalyzer', () => {
  it('analyzePath returns risk assessment', () => {
    const graph = createMockGraph();
    const analyzer = new PathRiskAnalyzer();
    const finder = new PathFinder(graph);
    const path = finder.findAnyPath('A', 'F')!;
    const assessment = analyzer.analyzePath(path, graph);
    expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
    expect(assessment.riskLevel).toBeDefined();
    expect(Array.isArray(assessment.riskFactors)).toBe(true);
  });

  it('analyzePath detects long paths', () => {
    const graph = createMockGraph();
    const analyzer = new PathRiskAnalyzer();
    const longPath = {
      nodes: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'],
      edges: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'e10', 'e11'],
      totalWeight: 11,
      nodeCount: 12,
      edgeCount: 11,
      riskScore: 0,
      riskLevel: 'NONE' as const,
      fingerprint: 'fp',
    };
    const assessment = analyzer.analyzePath(longPath, graph);
    expect(assessment.riskFactors.some((f) => f.includes('Long'))).toBe(true);
  });

  it('computeBlastRadius returns affected nodes', () => {
    const graph = createMockGraph();
    const analyzer = new PathRiskAnalyzer();
    const finder = new PathFinder(graph);
    const path = finder.findAnyPath('A', 'F')!;
    const affected = analyzer.computeBlastRadius(path, graph);
    expect(affected.length).toBeGreaterThanOrEqual(path.nodes.length);
  });

  it('findCriticalEdges returns edges', () => {
    const graph = createMockGraph();
    const analyzer = new PathRiskAnalyzer();
    const finder = new PathFinder(graph);
    const path = finder.findAnyPath('A', 'F')!;
    const critical = analyzer.findCriticalEdges(path, graph);
    expect(Array.isArray(critical)).toBe(true);
  });
});

describe('PathComparator', () => {
  it('compare returns similarity metrics', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const paths = finder.findAllPaths('A', 'F');
    if (paths.length >= 2) {
      const result = new PathComparator().compare(paths[0]!, paths[1]!);
      expect(result.similarity).toBeGreaterThanOrEqual(0);
      expect(result.similarity).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.overlaps)).toBe(true);
    }
  });

  it('findCommonSegments returns shared subsequences', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const paths = finder.findAllPaths('A', 'F');
    const segments = new PathComparator().findCommonSegments(paths);
    expect(Array.isArray(segments)).toBe(true);
  });

  it('rankByRisk sorts descending by risk', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const paths = finder.findAllPaths('A', 'F');
    const ranked = new PathComparator().rankByRisk(paths);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.riskScore).toBeGreaterThanOrEqual(ranked[i]!.riskScore);
    }
  });

  it('rankByLength sorts ascending by length', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const paths = finder.findAllPaths('A', 'F');
    const ranked = new PathComparator().rankByLength(paths);
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.nodeCount).toBeLessThanOrEqual(ranked[i]!.nodeCount);
    }
  });
});

describe('PathSerializer', () => {
  it('serialize and deserialize round-trips', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const path = finder.findAnyPath('A', 'F')!;
    const serializer = new PathSerializer();
    const json = serializer.serialize(path);
    const deserialized = serializer.deserialize(json);
    expect(deserialized.nodes).toEqual(path.nodes);
    expect(deserialized.edges).toEqual(path.edges);
  });

  it('deserialize throws for invalid JSON', () => {
    const serializer = new PathSerializer();
    expect(() => serializer.deserialize('invalid')).toThrow();
  });

  it('toGraphML produces valid XML', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const path = finder.findAnyPath('A', 'F')!;
    const serializer = new PathSerializer();
    const xml = serializer.toGraphML(path, graph);
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<graphml');
    expect(xml).toContain('</graphml>');
  });
});

describe('PathFingerprint', () => {
  it('compute returns string', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const path = finder.findAnyPath('A', 'F')!;
    const fp = PathFingerprint.compute(path);
    expect(typeof fp).toBe('string');
    expect(fp.length).toBeGreaterThan(0);
  });

  it('compare returns true for equal fingerprints', () => {
    const graph = createMockGraph();
    const finder = new PathFinder(graph);
    const path = finder.findAnyPath('A', 'F')!;
    const fp1 = PathFingerprint.compute(path);
    const fp2 = PathFingerprint.compute(path);
    expect(PathFingerprint.compare(fp1, fp2)).toBe(true);
  });

  it('fromNodes generates fingerprint from node list', () => {
    const fp = PathFingerprint.fromNodes(['A', 'B', 'D', 'F']);
    expect(typeof fp).toBe('string');
  });
});

describe('PathQuery', () => {
  it('findCriticalPaths returns paths above threshold', () => {
    const graph = createMockGraph();
    const paths = PathQuery.findCriticalPaths(graph, 0);
    expect(Array.isArray(paths)).toBe(true);
  });

  it('findLongestPaths returns top K by length', () => {
    const graph = createMockGraph();
    const paths = PathQuery.findLongestPaths(graph, 3);
    expect(paths.length).toBeLessThanOrEqual(3);
  });

  it('findPathsThroughNode returns paths through that node', () => {
    const graph = createMockGraph();
    const paths = PathQuery.findPathsThroughNode('D', graph);
    expect(paths.length).toBeGreaterThan(0);
    paths.forEach((p) => {
      expect(p.nodes).toContain('D');
    });
  });
});
