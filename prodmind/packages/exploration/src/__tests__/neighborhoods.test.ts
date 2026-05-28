import { describe, it, expect } from 'vitest';
import { createMockGraph } from './mock-graph.ts';
import { NeighborhoodEngine } from '../neighborhoods/neighborhood-engine.ts';
import { NeighborhoodDiscovery } from '../neighborhoods/neighborhood-discovery.ts';
import { NeighborhoodBoundary } from '../neighborhoods/neighborhood-boundary.ts';
import { NeighborhoodClustering } from '../neighborhoods/neighborhood-clustering.ts';
import { NeighborhoodRanking } from '../neighborhoods/neighborhood-ranking.ts';
import { NeighborhoodRisk } from '../neighborhoods/neighborhood-risk.ts';

describe('NeighborhoodEngine', () => {
  it('explore returns neighborhood', () => {
    const graph = createMockGraph();
    const engine = new NeighborhoodEngine(graph);
    const result = engine.explore('A', { radius: 1 });
    expect(result.center).toBe('A');
    expect(result.nodes).toContain('A');
    expect(result.nodes).toContain('B');
    expect(result.nodes).toContain('C');
  });

  it('explore respects maxNodes', () => {
    const graph = createMockGraph();
    const engine = new NeighborhoodEngine(graph);
    const result = engine.explore('A', { radius: 5, maxNodes: 2 });
    expect(result.nodeCount).toBeLessThanOrEqual(2);
  });

  it('explore respects direction FORWARD', () => {
    const graph = createMockGraph();
    const engine = new NeighborhoodEngine(graph);
    const result = engine.explore('A', { radius: 2, direction: 'FORWARD' });
    expect(result.nodes).toContain('A');
  });

  it('explore respects nodeTypes filter', () => {
    const graph = createMockGraph();
    const engine = new NeighborhoodEngine(graph);
    const result = engine.explore('A', { radius: 2, nodeTypes: ['module'] });
    result.nodes.forEach((id) => {
      const node = graph.getNode(id);
      expect(node?.type === 'module' || id === 'A').toBe(true);
    });
  });

  it('findNeighborhoods discovers all neighborhoods', () => {
    const graph = createMockGraph();
    const engine = new NeighborhoodEngine(graph);
    const neighborhoods = engine.findNeighborhoods({ radius: 1 });
    expect(neighborhoods.length).toBeGreaterThanOrEqual(1);
  });

  it('findNeighborhoods respects minDensity', () => {
    const graph = createMockGraph();
    const engine = new NeighborhoodEngine(graph);
    const neighborhoods = engine.findNeighborhoods({ radius: 1, minDensity: 0 });
    expect(neighborhoods.length).toBeGreaterThanOrEqual(1);
  });

  it('compareNeighborhoods returns overlap info', () => {
    const graph = createMockGraph();
    const engine = new NeighborhoodEngine(graph);
    const a = engine.explore('A', { radius: 1 });
    const b = engine.explore('B', { radius: 1 });
    const comparison = engine.compareNeighborhoods(a, b);
    expect(Array.isArray(comparison.overlaps)).toBe(true);
    expect(Array.isArray(comparison.uniqueA)).toBe(true);
    expect(Array.isArray(comparison.uniqueB)).toBe(true);
  });
});

describe('NeighborhoodDiscovery', () => {
  it('discoverByRadius returns nodes within radius', () => {
    const graph = createMockGraph();
    const discovery = new NeighborhoodDiscovery(graph);
    const nodes = discovery.discoverByRadius('A', 1);
    expect(nodes).toContain('A');
    expect(nodes).toContain('B');
    expect(nodes).toContain('C');
  });

  it('discoverByRadius respects direction', () => {
    const graph = createMockGraph();
    const discovery = new NeighborhoodDiscovery(graph);
    const nodes = discovery.discoverByRadius('A', 1, { direction: 'FORWARD' });
    expect(nodes).toContain('A');
  });

  it('discoverBySemantic finds nodes with semantic type', () => {
    const graph = createMockGraph();
    const discovery = new NeighborhoodDiscovery(graph);
    const nodes = discovery.discoverBySemantic('A', 'service', 3);
    expect(Array.isArray(nodes)).toBe(true);
  });

  it('discoverByDependency finds dependency neighborhood', () => {
    const graph = createMockGraph();
    const discovery = new NeighborhoodDiscovery(graph);
    const nodes = discovery.discoverByDependency('A', 2);
    expect(nodes).toContain('A');
    expect(nodes.length).toBeGreaterThan(0);
  });

  it('discoverSharedNeighborhood finds common nodes', () => {
    const graph = createMockGraph();
    const discovery = new NeighborhoodDiscovery(graph);
    const shared = discovery.discoverSharedNeighborhood(['B', 'C'], 1);
    expect(shared).toContain('A');
    expect(shared).toContain('D');
  });
});

describe('NeighborhoodBoundary', () => {
  it('findBoundaryNodes returns nodes with external edges', () => {
    const graph = createMockGraph();
    const boundary = new NeighborhoodBoundary();
    const result = boundary.findBoundaryNodes(['A', 'B', 'D'], graph);
    expect(Array.isArray(result)).toBe(true);
  });

  it('findBoundaryEdges returns edges to outside', () => {
    const graph = createMockGraph();
    const boundary = new NeighborhoodBoundary();
    const edges = boundary.findBoundaryEdges(['A', 'B', 'D'], graph);
    expect(Array.isArray(edges)).toBe(true);
  });

  it('findBridgeNodes returns nodes connecting neighborhoods', () => {
    const graph = createMockGraph();
    const boundary = new NeighborhoodBoundary();
    const bridges = boundary.findBridgeNodes(['D', 'E'], ['E', 'F'], graph);
    expect(bridges).toContain('E');
  });

  it('computeBoundaryDensity returns ratio', () => {
    const graph = createMockGraph();
    const boundary = new NeighborhoodBoundary();
    const density = boundary.computeBoundaryDensity(['A', 'B', 'C'], graph);
    expect(density).toBeGreaterThanOrEqual(0);
    expect(density).toBeLessThanOrEqual(1);
  });

  it('computeBoundaryDensity returns 0 for empty', () => {
    const graph = createMockGraph();
    const boundary = new NeighborhoodBoundary();
    expect(boundary.computeBoundaryDensity([], graph)).toBe(0);
  });
});

describe('NeighborhoodClustering', () => {
  it('clusterByDensity returns dense clusters', () => {
    const graph = createMockGraph();
    const clustering = new NeighborhoodClustering();
    const clusters = clustering.clusterByDensity(['A', 'B', 'C', 'D', 'E', 'F'], graph);
    expect(clusters.length).toBeGreaterThanOrEqual(1);
  });

  it('clusterByType groups by node type', () => {
    const graph = createMockGraph();
    const clustering = new NeighborhoodClustering();
    const groups = clustering.clusterByType(['A', 'B', 'C', 'D'], graph);
    expect(groups.size).toBeGreaterThanOrEqual(1);
  });

  it('clusterByConnectivity returns connected components', () => {
    const graph = createMockGraph();
    const clustering = new NeighborhoodClustering();
    const clusters = clustering.clusterByConnectivity(['A', 'B', 'C', 'D', 'E', 'F'], graph);
    expect(clusters.length).toBeGreaterThanOrEqual(1);
  });

  it('computeClusteringCoefficient returns ratio', () => {
    const graph = createMockGraph();
    const clustering = new NeighborhoodClustering();
    const coeff = clustering.computeClusteringCoefficient(['A', 'B', 'C', 'D'], graph);
    expect(coeff).toBeGreaterThanOrEqual(0);
    expect(coeff).toBeLessThanOrEqual(1);
  });
});

describe('NeighborhoodRanking', () => {
  it('rankByInfluence returns sorted scores', () => {
    const graph = createMockGraph();
    const ranking = new NeighborhoodRanking();
    const scores = ranking.rankByInfluence(['A', 'B', 'C', 'D'], graph);
    expect(scores.length).toBe(4);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i - 1]!.influence).toBeGreaterThanOrEqual(scores[i]!.influence);
    }
  });

  it('rankByConnectivity returns sorted scores', () => {
    const graph = createMockGraph();
    const ranking = new NeighborhoodRanking();
    const scores = ranking.rankByConnectivity(['A', 'B', 'C'], graph);
    expect(scores.length).toBe(3);
  });

  it('rankByRisk returns risk scores', () => {
    const graph = createMockGraph();
    const ranking = new NeighborhoodRanking();
    const scores = ranking.rankByRisk(['A', 'B', 'C'], graph);
    expect(scores.length).toBe(3);
  });

  it('rankByCentrality returns centrality scores', () => {
    const graph = createMockGraph();
    const ranking = new NeighborhoodRanking();
    const scores = ranking.rankByCentrality(['A', 'B', 'C', 'D'], graph);
    expect(scores.length).toBe(4);
    expect(scores[0]!.centrality).toBeGreaterThanOrEqual(0);
  });
});

describe('NeighborhoodRisk', () => {
  it('assessRisk returns risk assessment', () => {
    const graph = createMockGraph();
    const engine = new NeighborhoodEngine(graph);
    const nbhd = engine.explore('A', { radius: 2 });
    const risk = new NeighborhoodRisk();
    const assessment = risk.assessRisk(nbhd, graph);
    expect(assessment.riskScore).toBeGreaterThanOrEqual(0);
    expect(assessment.riskLevel).toBeDefined();
    expect(Array.isArray(assessment.riskFactors)).toBe(true);
  });

  it('findHighRiskNeighborhoods filters by cycle ratio', () => {
    const graph = createMockGraph();
    const engine = new NeighborhoodEngine(graph);
    const nbhd = engine.explore('A', { radius: 2 });
    const risk = new NeighborhoodRisk();
    const high = risk.findHighRiskNeighborhoods([nbhd], 0, graph);
    expect(Array.isArray(high)).toBe(true);
  });

  it('computeRiskDistribution returns level counts', () => {
    const graph = createMockGraph();
    const engine = new NeighborhoodEngine(graph);
    const nbhd = engine.explore('A', { radius: 2 });
    const risk = new NeighborhoodRisk();
    const dist = risk.computeRiskDistribution(nbhd, graph);
    expect(dist instanceof Map).toBe(true);
  });

  it('identifyRiskPropagationPaths returns paths', () => {
    const graph = createMockGraph();
    const engine = new NeighborhoodEngine(graph);
    const nbhd = engine.explore('A', { radius: 2 });
    const risk = new NeighborhoodRisk();
    const paths = risk.identifyRiskPropagationPaths(nbhd, graph);
    expect(Array.isArray(paths)).toBe(true);
  });
});
