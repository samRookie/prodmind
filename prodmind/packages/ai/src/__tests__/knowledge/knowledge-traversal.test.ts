import { describe, it, expect } from 'vitest';
import { traverseGraph, findNeighborhood } from '../../knowledge/knowledge-traversal.ts';
import { KnowledgeGraphImpl } from '../../knowledge/knowledge-graph.ts';
import type { KnowledgeBuildInput } from '../../knowledge/knowledge-types.ts';

function makeGraph() {
  const graph = new KnowledgeGraphImpl();
  const input: KnowledgeBuildInput = {
    nodes: ['a', 'b', 'c', 'd', 'e'].map(id => ({ id, type: 'NODE' as const, label: id, description: '', fingerprint: `fp-${id}` })),
    relations: [
      { sourceId: 'a', targetId: 'b', relationType: 'DEPENDS_ON' },
      { sourceId: 'b', targetId: 'c', relationType: 'DEPENDS_ON' },
      { sourceId: 'c', targetId: 'd', relationType: 'DEPENDS_ON' },
      { sourceId: 'd', targetId: 'e', relationType: 'DEPENDS_ON' },
    ],
  };
  graph.build(input);
  return graph;
}

describe('KnowledgeTraversal', () => {
  it('traverses graph with max depth', () => {
    const graph = makeGraph();
    const result = traverseGraph(graph, ['a'], { maxDepth: 2, relationTypes: ['DEPENDS_ON'] });
    expect(result).toHaveLength(2);
  });

  it('finds neighborhood within depth', () => {
    const graph = makeGraph();
    const result = findNeighborhood(graph, 'b', 1);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('enforces max nodes limit', () => {
    const graph = makeGraph();
    const result = traverseGraph(graph, ['a'], { maxDepth: 10, maxNodes: 3, relationTypes: ['DEPENDS_ON'] });
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('handles unknown source', () => {
    const graph = makeGraph();
    const result = traverseGraph(graph, ['nonexistent'], { maxDepth: 2 });
    expect(result).toHaveLength(0);
  });
});
