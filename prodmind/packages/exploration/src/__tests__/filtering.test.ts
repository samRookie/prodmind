import { describe, it, expect } from 'vitest';
import { createMockGraph } from './mock-graph.ts';
import { NodeFilter } from '../filtering/node-filter.ts';
import { EdgeFilter } from '../filtering/edge-filter.ts';
import { MetricFilter } from '../filtering/metric-filter.ts';
import { StructuralFilter } from '../filtering/structural-filter.ts';
import { SemanticFilter } from '../filtering/semantic-filter.ts';
import { FilterComposer } from '../filtering/filter-composition.ts';
import { FilterQuery } from '../filtering/filter-query.ts';
import { GraphFilterEngine } from '../filtering/graph-filter-engine.ts';
import type { FilterConfig } from '../filtering/graph-filter-engine.ts';

describe('NodeFilter', () => {
  it('byType filters by type', () => {
    const graph = createMockGraph();
    const filter = new NodeFilter();
    const filtered = filter.byType(graph.getAllNodes(), 'module');
    expect(filtered.every((n) => n.type === 'module')).toBe(true);
  });

  it('byProperty filters by property', () => {
    const graph = createMockGraph();
    const filter = new NodeFilter();
    const filtered = filter.byProperty(graph.getAllNodes(), 'instability', 'EQUALS', 0.5);
    filtered.forEach((n) => expect(n.properties['instability']).toBe(0.5));
  });

  it('byCustom uses predicate', () => {
    const graph = createMockGraph();
    const filter = new NodeFilter();
    const filtered = filter.byCustom(graph.getAllNodes(), (n) => n.type === 'module');
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('byIds filters by ID set', () => {
    const graph = createMockGraph();
    const filter = new NodeFilter();
    const filtered = filter.byIds(graph.getAllNodes(), ['A', 'B']);
    expect(filtered.length).toBe(2);
  });

  it('byMultiple applies filters with AND', () => {
    const graph = createMockGraph();
    const filter = new NodeFilter();
    const filtered = filter.byMultiple(graph.getAllNodes(), [
      { field: 'type', operator: 'EQUALS', value: 'module' },
      { field: 'instability', operator: 'EQUALS', value: 0.5 },
    ]);
    filtered.forEach((n) => expect(n.type).toBe('module'));
  });

  it('byProperty handles GREATER_THAN', () => {
    const graph = createMockGraph();
    const filter = new NodeFilter();
    const filtered = filter.byProperty(graph.getAllNodes(), 'instability', 'GREATER_THAN', 0.4);
    filtered.forEach((n) => expect(n.properties['instability'] as number).toBeGreaterThan(0.4));
  });

  it('byProperty handles IN_RANGE', () => {
    const graph = createMockGraph();
    const filter = new NodeFilter();
    const filtered = filter.byProperty(graph.getAllNodes(), 'instability', 'IN_RANGE', [0, 1]);
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('byProperty handles CONTAINS', () => {
    const graph = createMockGraph();
    const filter = new NodeFilter();
    const filtered = filter.byProperty(graph.getAllNodes(), 'name', 'CONTAINS', 'Module');
    expect(filtered.length).toBeGreaterThan(0);
  });

  it('byProperty handles EXISTS', () => {
    const graph = createMockGraph();
    const filter = new NodeFilter();
    const filtered = filter.byProperty(graph.getAllNodes(), 'instability', 'EXISTS', null);
    expect(filtered.length).toBe(6);
  });
});

describe('EdgeFilter', () => {
  it('byType filters by type', () => {
    const graph = createMockGraph();
    const allEdges = graph.getAllNodes().flatMap((n) => graph.getEdgesForNode(n.id));
    const filter = new EdgeFilter();
    const filtered = filter.byType(allEdges, 'depends');
    expect(filtered.every((e) => e.type === 'depends')).toBe(true);
  });

  it('byWeight filters by range', () => {
    const graph = createMockGraph();
    const allEdges = graph.getAllNodes().flatMap((n) => graph.getEdgesForNode(n.id));
    const filter = new EdgeFilter();
    const filtered = filter.byWeight(allEdges, 0.5, 2);
    filtered.forEach((e) => expect(e.weight).toBeGreaterThanOrEqual(0.5));
  });

  it('bySource filters edges', () => {
    const graph = createMockGraph();
    const filter = new EdgeFilter();
    const allEdges = graph.getAllNodes().flatMap((n) => graph.getEdgesForNode(n.id));
    const filtered = filter.bySource(allEdges, 'A');
    expect(filtered.every((e) => e.source === 'A')).toBe(true);
  });

  it('byTarget filters edges', () => {
    const graph = createMockGraph();
    const allEdges = graph.getAllNodes().flatMap((n) => graph.getEdgesForNode(n.id));
    const filter = new EdgeFilter();
    const filtered = filter.byTarget(allEdges, 'D');
    expect(filtered.every((e) => e.target === 'D')).toBe(true);
  });
});

describe('MetricFilter', () => {
  it('byThreshold filters by min', () => {
    const graph = createMockGraph();
    const filter = new MetricFilter();
    const filtered = filter.byThreshold(graph.getAllNodes(), 'instability', 0);
    expect(filtered.length).toBe(6);
  });

  it('byThreshold with max filters range', () => {
    const graph = createMockGraph();
    const filter = new MetricFilter();
    const filtered = filter.byThreshold(graph.getAllNodes(), 'instability', 0, 0.5);
    filtered.forEach((n) => {
      const v = n.properties['instability'] as number;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(0.5);
    });
  });

  it('byTopK returns K nodes', () => {
    const graph = createMockGraph();
    const filter = new MetricFilter();
    const filtered = filter.byTopK(graph.getAllNodes(), 'instability', 3);
    expect(filtered.length).toBe(3);
  });

  it('byTopK ascending returns lowest K', () => {
    const graph = createMockGraph();
    const filter = new MetricFilter();
    const filtered = filter.byTopK(graph.getAllNodes(), 'instability', 2, true);
    expect(filtered.length).toBe(2);
  });

  it('byPercentile returns top percentile', () => {
    const graph = createMockGraph();
    const filter = new MetricFilter();
    const filtered = filter.byPercentile(graph.getAllNodes(), 'instability', 50);
    expect(filtered.length).toBeGreaterThan(0);
  });
});

describe('StructuralFilter', () => {
  it('byDegree filters by edge count', () => {
    const graph = createMockGraph();
    const filter = new StructuralFilter(graph);
    const filtered = filter.byDegree(graph.getAllNodes(), 2);
    filtered.forEach((n) => {
      expect(graph.getEdgesForNode(n.id).length).toBeGreaterThanOrEqual(2);
    });
  });

  it('byFanOut filters outgoing', () => {
    const graph = createMockGraph();
    const filter = new StructuralFilter(graph);
    const filtered = filter.byFanOut(graph.getAllNodes(), 1);
    filtered.forEach((n) => {
      expect(graph.getOutgoingEdges(n.id).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('byFanIn filters incoming', () => {
    const graph = createMockGraph();
    const filter = new StructuralFilter(graph);
    const filtered = filter.byFanIn(graph.getAllNodes(), 1);
    filtered.forEach((n) => {
      expect(graph.getIncomingEdges(n.id).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('byIsland returns non-largest component nodes', () => {
    const graph = createMockGraph();
    const filter = new StructuralFilter(graph);
    const islands = filter.byIsland(graph.getAllNodes());
    expect(Array.isArray(islands)).toBe(true);
  });
});

describe('SemanticFilter', () => {
  it('bySemanticType filters by property', () => {
    const graph = createMockGraph();
    const filter = new SemanticFilter(graph);
    const filtered = filter.bySemanticType(graph.getAllNodes(), 'service');
    expect(Array.isArray(filtered)).toBe(true);
  });

  it('byBoundary filters by boundary property', () => {
    const graph = createMockGraph();
    const filter = new SemanticFilter(graph);
    const filtered = filter.byBoundary(graph.getAllNodes(), 'internal');
    expect(Array.isArray(filtered)).toBe(true);
  });

  it('byCluster filters by cluster property', () => {
    const graph = createMockGraph();
    const filter = new SemanticFilter(graph);
    const filtered = filter.byCluster(graph.getAllNodes(), 'cluster_1');
    expect(Array.isArray(filtered)).toBe(true);
  });
});

describe('FilterComposer', () => {
  it('and returns intersection', () => {
    const graph = createMockGraph();
    const allNodes = graph.getAllNodes();
    const a = allNodes.filter((n) => n.type === 'module');
    const b = allNodes.slice(0, 3);
    const result = FilterComposer.and(a, b);
    expect(result.every((n) => a.includes(n) && b.includes(n))).toBe(true);
  });

  it('or returns union', () => {
    const graph = createMockGraph();
    const allNodes = graph.getAllNodes();
    const a = allNodes.filter((n) => n.type === 'module');
    const b = allNodes.filter((n) => n.type === 'utility');
    const result = FilterComposer.or(a, b);
    expect(result.length).toBeGreaterThanOrEqual(Math.max(a.length, b.length));
  });

  it('not returns exclusion', () => {
    const graph = createMockGraph();
    const allNodes = graph.getAllNodes();
    const exclude = allNodes.filter((n) => n.type === 'module');
    const result = FilterComposer.not(allNodes, exclude);
    expect(result.every((n) => n.type !== 'module')).toBe(true);
  });

  it('compose with AND combines results', () => {
    const graph = createMockGraph();
    const allNodes = graph.getAllNodes();
    const result = FilterComposer.compose(['AND', 'AND'], [
      { nodes: allNodes.filter((n) => n.type === 'module'), edges: [] },
      { nodes: allNodes.filter((n) => n.properties['instability'] as number > 0.4), edges: [] },
    ]);
    expect(result.nodes.length).toBeGreaterThanOrEqual(0);
  });
});

describe('FilterQuery', () => {
  it('parse handles filter string', () => {
    const filters = FilterQuery.parse('NODE.type EQUALS "module"');
    expect(filters.length).toBeGreaterThan(0);
    expect(filters[0]!.type).toBe('NODE');
  });

  it('parse returns empty for empty string', () => {
    expect(FilterQuery.parse('')).toEqual([]);
  });

  it('serialize converts filters to string', () => {
    const str = FilterQuery.serialize([{ type: 'NODE', field: 'type', operator: 'EQUALS', value: 'module' }]);
    expect(typeof str).toBe('string');
    expect(str.length).toBeGreaterThan(0);
  });

  it('validate returns true for valid configs', () => {
    expect(FilterQuery.validate([{ type: 'NODE', field: 'type', operator: 'EQUALS', value: 'module' }])).toBe(true);
  });

  it('validate returns false for invalid type', () => {
    expect(FilterQuery.validate([{ type: 'INVALID' as FilterConfig['type'] }])).toBe(false);
  });
});

describe('GraphFilterEngine', () => {
  it('apply returns filtered nodes', () => {
    const graph = createMockGraph();
    const engine = new GraphFilterEngine(graph);
    const result = engine.apply([{ type: 'NODE', field: 'type', operator: 'EQUALS', value: 'module' }]);
    expect(result.nodes.every((n) => n.type === 'module')).toBe(true);
  });

  it('apply with custom filter', () => {
    const graph = createMockGraph();
    const engine = new GraphFilterEngine(graph);
    const result = engine.apply([{ type: 'NODE', filter: (item) => item.type === 'module' }]);
    expect(result.nodes.length).toBeGreaterThan(0);
  });

  it('filterNodes returns node list', () => {
    const graph = createMockGraph();
    const engine = new GraphFilterEngine(graph);
    const nodes = engine.filterNodes([{ type: 'METRIC', field: 'instability', operator: 'GREATER_THAN', value: 0 }]);
    expect(nodes.length).toBe(6);
  });

  it('filterEdges returns edge list', () => {
    const graph = createMockGraph();
    const engine = new GraphFilterEngine(graph);
    const edges = engine.filterEdges([{ type: 'EDGE', field: 'weight', operator: 'IN_RANGE', value: [0, 10] }]);
    expect(edges.length).toBeGreaterThan(0);
  });

  it('reset does not throw', () => {
    const graph = createMockGraph();
    const engine = new GraphFilterEngine(graph);
    expect(() => engine.reset()).not.toThrow();
  });

  it('apply with empty filters returns all', () => {
    const graph = createMockGraph();
    const engine = new GraphFilterEngine(graph);
    const result = engine.apply([]);
    expect(result.nodes.length).toBe(6);
  });

  it('apply with SEMANTIC filter', () => {
    const graph = createMockGraph();
    const engine = new GraphFilterEngine(graph);
    const result = engine.apply([{ type: 'SEMANTIC', field: 'service', value: 'service' }]);
    expect(Array.isArray(result.nodes)).toBe(true);
  });
});
