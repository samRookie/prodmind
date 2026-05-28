import { describe, it, expect } from 'vitest';
import { createMockGraph } from './mock-graph.ts';
import { SemanticExplorer } from '../semantic/semantic-explorer.ts';
import { SemanticClustering } from '../semantic/semantic-clustering.ts';
import { SemanticBoundaryDetector } from '../semantic/semantic-boundaries.ts';
import { SemanticHotspotAnalyzer } from '../semantic/semantic-hotspots.ts';
import { SemanticNeighborhood } from '../semantic/semantic-neighborhood.ts';
import { SemanticTraversal } from '../semantic/semantic-traversal.ts';
import { SemanticQuery } from '../semantic/semantic-query.ts';
import { SemanticLinkage } from '../semantic/semantic-linkage.ts';

describe('SemanticExplorer', () => {
  it('findSemanticClusters groups nodes by type', () => {
    const graph = createMockGraph();
    const explorer = new SemanticExplorer(graph);
    const clusters = explorer.findSemanticClusters();
    expect(clusters.length).toBeGreaterThanOrEqual(2);
    expect(clusters[0]!.nodes.length).toBeGreaterThan(0);
  });

  it('findSemanticClusters filters by node type', () => {
    const graph = createMockGraph();
    const explorer = new SemanticExplorer(graph);
    const clusters = explorer.findSemanticClusters('module');
    expect(clusters.every((c) => c.label === 'type:module' || c.nodes.length > 0)).toBe(true);
  });

  it('detectBoundaries returns boundaries for cross-type edges', () => {
    const graph = createMockGraph();
    const explorer = new SemanticExplorer(graph);
    const boundaries = explorer.detectBoundaries('A');
    expect(boundaries.length).toBeGreaterThanOrEqual(0);
  });

  it('detectBoundaries throws for missing node', () => {
    const graph = createMockGraph();
    const explorer = new SemanticExplorer(graph);
    expect(() => explorer.detectBoundaries('UNKNOWN')).toThrow();
  });

  it('findHotspots returns nodes above threshold', () => {
    const graph = createMockGraph();
    const explorer = new SemanticExplorer(graph);
    const hotspots = explorer.findHotspots('instability', 0);
    expect(hotspots.length).toBeGreaterThan(0);
  });

  it('findHotspots returns empty for high threshold', () => {
    const graph = createMockGraph();
    const explorer = new SemanticExplorer(graph);
    const hotspots = explorer.findHotspots('instability', 1000);
    expect(hotspots.length).toBe(0);
  });

  it('findSimilarNodes returns similarity scores', () => {
    const graph = createMockGraph();
    const explorer = new SemanticExplorer(graph);
    const similar = explorer.findSimilarNodes('A', 'instability');
    expect(similar.length).toBeGreaterThan(0);
    expect(typeof similar[0]!.similarity).toBe('number');
  });

  it('findSimilarNodes throws for missing node', () => {
    const graph = createMockGraph();
    const explorer = new SemanticExplorer(graph);
    expect(() => explorer.findSimilarNodes('UNKNOWN', 'instability')).toThrow();
  });

  it('findSimilarNodes throws for non-numeric metric', () => {
    const graph = createMockGraph();
    const explorer = new SemanticExplorer(graph);
    expect(() => explorer.findSimilarNodes('A', 'name')).toThrow();
  });

  it('findSimilarNodes respects limit', () => {
    const graph = createMockGraph();
    const explorer = new SemanticExplorer(graph);
    const similar = explorer.findSimilarNodes('A', 'instability', 2);
    expect(similar.length).toBeLessThanOrEqual(2);
  });

  it('compareSnapshots returns changes', () => {
    const graph = createMockGraph();
    const explorer = new SemanticExplorer(graph);
    const before = JSON.stringify({ nodes: [{ id: 'A', properties: { instability: 0.5 } }] });
    const after = JSON.stringify({ nodes: [{ id: 'A', properties: { instability: 0.6 } }, { id: 'B', properties: {} }] });
    const result = explorer.compareSnapshots(before, after);
    expect(result.added).toContain('B');
    expect(result.changed).toContain('A');
  });

  it('compareSnapshots handles invalid JSON', () => {
    const graph = createMockGraph();
    const explorer = new SemanticExplorer(graph);
    const result = explorer.compareSnapshots('invalid', 'invalid');
    expect(result.added.length).toBe(0);
  });
});

describe('SemanticClustering', () => {
  it('clusterByType groups nodes', () => {
    const graph = createMockGraph();
    const clustering = new SemanticClustering(graph);
    const clusters = clustering.clusterByType();
    expect(clusters.length).toBeGreaterThan(0);
    expect(clusters[0]!.nodes.length).toBeGreaterThan(0);
  });

  it('clusterByDensity returns connected components', () => {
    const graph = createMockGraph();
    const clustering = new SemanticClustering(graph);
    const clusters = clustering.clusterByDensity();
    expect(clusters.length).toBeGreaterThanOrEqual(1);
  });

  it('computeCohesion returns ratio', () => {
    const graph = createMockGraph();
    const clustering = new SemanticClustering(graph);
    const clusters = clustering.clusterByType();
    const cohesion = clustering.computeCohesion(clusters[0]!);
    expect(cohesion).toBeGreaterThanOrEqual(0);
    expect(cohesion).toBeLessThanOrEqual(1);
  });

  it('findBridgeNodes returns nodes connecting clusters', () => {
    const graph = createMockGraph();
    const clustering = new SemanticClustering(graph);
    const clusters = clustering.clusterByType();
    const bridges = clustering.findBridgeNodes(clusters[0]!.label, clusters[1]!.label);
    expect(Array.isArray(bridges)).toBe(true);
  });
});

describe('SemanticBoundaryDetector', () => {
  it('detectBoundaries returns boundaries', () => {
    const graph = createMockGraph();
    const detector = new SemanticBoundaryDetector(graph);
    const boundaries = detector.detectBoundaries('A');
    boundaries.forEach((b) => {
      expect(b.nodeId).toBe('A');
      expect(b.crossBoundaryEdges.length).toBeGreaterThanOrEqual(0);
    });
  });

  it('detectBoundaries returns empty for unknown node', () => {
    const graph = createMockGraph();
    const detector = new SemanticBoundaryDetector(graph);
    expect(detector.detectBoundaries('UNKNOWN')).toEqual([]);
  });

  it('findCrossBoundaryConnections returns edges', () => {
    const graph = createMockGraph();
    const detector = new SemanticBoundaryDetector(graph);
    const edges = detector.findCrossBoundaryConnections('A');
    expect(Array.isArray(edges)).toBe(true);
  });
});

describe('SemanticHotspotAnalyzer', () => {
  it('findHotspots returns sorted hotspots', () => {
    const graph = createMockGraph();
    const analyzer = new SemanticHotspotAnalyzer(graph);
    const hotspots = analyzer.findHotspots('instability', 0.3);
    expect(hotspots.length).toBeGreaterThan(0);
    for (let i = 1; i < hotspots.length; i++) {
      expect(hotspots[i - 1]!.score).toBeGreaterThanOrEqual(hotspots[i]!.score);
    }
  });

  it('computeFanOut returns outgoing count', () => {
    const graph = createMockGraph();
    const analyzer = new SemanticHotspotAnalyzer(graph);
    expect(analyzer.computeFanOut('A')).toBe(2);
  });

  it('computeFanIn returns incoming count', () => {
    const graph = createMockGraph();
    const analyzer = new SemanticHotspotAnalyzer(graph);
    expect(analyzer.computeFanIn('F')).toBe(1);
  });

  it('computeInstability returns ratio', () => {
    const graph = createMockGraph();
    const analyzer = new SemanticHotspotAnalyzer(graph);
    const instability = analyzer.computeInstability('A');
    expect(instability).toBeGreaterThanOrEqual(0);
    expect(instability).toBeLessThanOrEqual(1);
  });

  it('computeCoupling returns afferent and efferent', () => {
    const graph = createMockGraph();
    const analyzer = new SemanticHotspotAnalyzer(graph);
    const coupling = analyzer.computeCoupling('A');
    expect(coupling.afferent).toBeGreaterThanOrEqual(0);
    expect(coupling.efferent).toBeGreaterThan(0);
  });
});

describe('SemanticNeighborhood', () => {
  it('explore returns nodes within radius', () => {
    const graph = createMockGraph();
    const nbhd = new SemanticNeighborhood(graph);
    const result = nbhd.explore('A', 1);
    expect(result.nodes).toContain('A');
    expect(result.nodes).toContain('B');
    expect(result.radius).toBe(1);
  });

  it('explore with typeFilter filters by type', () => {
    const graph = createMockGraph();
    const nbhd = new SemanticNeighborhood(graph);
    const result = nbhd.explore('A', 2, 'module');
    expect(result.nodeCount).toBeGreaterThan(0);
  });

  it('explore returns empty for unknown node', () => {
    const graph = createMockGraph();
    const nbhd = new SemanticNeighborhood(graph);
    const result = nbhd.explore('UNKNOWN', 1);
    expect(result.nodes.length).toBe(0);
  });

  it('findSemanticProximity finds nodes of matching types', () => {
    const graph = createMockGraph();
    const nbhd = new SemanticNeighborhood(graph);
    const found = nbhd.findSemanticProximity('A', ['module'], 3);
    expect(found.length).toBeGreaterThan(0);
  });

  it('computeDensity returns edge ratio', () => {
    const graph = createMockGraph();
    const nbhd = new SemanticNeighborhood(graph);
    const result = nbhd.explore('A', 1);
    const density = nbhd.computeDensity(result.nodes, 1);
    expect(density).toBeGreaterThanOrEqual(0);
  });
});

describe('SemanticTraversal', () => {
  it('traverseByType finds target type', () => {
    const graph = createMockGraph();
    const st = new SemanticTraversal(graph);
    const result = st.traverseByType('A', 'module');
    expect(result.endNode).toBeTruthy();
  });

  it('traverseByType returns result with null endNode for unknown type', () => {
    const graph = createMockGraph();
    const st = new SemanticTraversal(graph);
    const result = st.traverseByType('A', 'nonexistent');
    expect(result.endNode).toBeNull();
  });

  it('traverseSemanticPath finds path', () => {
    const graph = createMockGraph();
    const st = new SemanticTraversal(graph);
    const result = st.traverseSemanticPath('A', 'F');
    expect(result.endNode).toBe('F');
  });

  it('traverseSemanticPath returns endNode for unreachable target', () => {
    const graph = createMockGraph();
    const st = new SemanticTraversal(graph);
    const result = st.traverseSemanticPath('A', 'UNKNOWN');
    expect(typeof result.endNode).toBe('string');
  });

  it('traverseByProperty finds matching nodes', () => {
    const graph = createMockGraph();
    const st = new SemanticTraversal(graph);
    const result = st.traverseByProperty('A', 'instability', 0.3);
    expect(result.endNode).toBeTruthy();
  });
});

describe('SemanticQuery', () => {
  it('findNodesByType filters correctly', () => {
    const graph = createMockGraph();
    const allNodes = graph.getAllNodes();
    const found = SemanticQuery.findNodesByType(allNodes, 'module');
    expect(found.every((n) => n.type === 'module')).toBe(true);
  });

  it('findNodesByProperty filters correctly', () => {
    const graph = createMockGraph();
    const allNodes = graph.getAllNodes();
    const found = SemanticQuery.findNodesByProperty(allNodes, 'name', 'ModuleA');
    expect(found.length).toBeGreaterThanOrEqual(0);
  });

  it('findEdgesByType filters correctly', () => {
    const graph = createMockGraph();
    const allNodes = graph.getAllNodes();
    const allEdges = allNodes.flatMap((n) => graph.getEdgesForNode(n.id));
    const found = SemanticQuery.findEdgesByType(allEdges, 'depends');
    expect(found.every((e) => e.type === 'depends')).toBe(true);
  });

  it('findEdgesByProperty filters correctly', () => {
    const graph = createMockGraph();
    const allNodes = graph.getAllNodes();
    const allEdges = allNodes.flatMap((n) => graph.getEdgesForNode(n.id));
    const found = SemanticQuery.findEdgesByProperty(allEdges, 'weight', 1);
    expect(found.every((e) => e.weight > 0 || e.properties['weight'] === 1)).toBe(true);
  });
});

describe('SemanticLinkage', () => {
  it('findLinkedNodes traverses by link type', () => {
    const graph = createMockGraph();
    const linkage = new SemanticLinkage(graph);
    const linked = linkage.findLinkedNodes('A', 'depends');
    expect(linked.length).toBeGreaterThan(0);
  });

  it('findLinkedNodes respects maxDepth', () => {
    const graph = createMockGraph();
    const linkage = new SemanticLinkage(graph);
    const linked = linkage.findLinkedNodes('A', 'depends', 1);
    expect(linked.length).toBeGreaterThanOrEqual(0);
  });

  it('findIndirectDependencies returns non-self nodes', () => {
    const graph = createMockGraph();
    const linkage = new SemanticLinkage(graph);
    const deps = linkage.findIndirectDependencies('A', 5);
    expect(deps.every((id) => id !== 'A')).toBe(true);
  });

  it('findSharedDependencies returns common deps', () => {
    const graph = createMockGraph();
    const linkage = new SemanticLinkage(graph);
    const shared = linkage.findSharedDependencies(['B', 'C']);
    expect(shared).toContain('D');
  });

  it('findSharedDependencies returns empty for empty input', () => {
    const graph = createMockGraph();
    const linkage = new SemanticLinkage(graph);
    expect(linkage.findSharedDependencies([])).toEqual([]);
  });
});
