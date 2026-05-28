import { describe, it, expect } from 'vitest';
import { KnowledgeGraphImpl } from '../../knowledge/knowledge-graph.ts';
import type { KnowledgeBuildInput } from '../../knowledge/knowledge-types.ts';

describe('KnowledgeGraph', () => {
  it('builds graph from input', () => {
    const graph = new KnowledgeGraphImpl();
    const input: KnowledgeBuildInput = {
      nodes: [
        { id: 'n1', type: 'NODE', label: 'core', description: '', fingerprint: 'fp1' },
        { id: 'n2', type: 'NODE', label: 'utils', description: '', fingerprint: 'fp2' },
      ],
      relations: [{ sourceId: 'n1', targetId: 'n2', relationType: 'DEPENDS_ON' }],
    };
    graph.build(input);
    expect(graph.getNode('n1')).toBeDefined();
    expect(graph.getNode('n2')).toBeDefined();
    expect(graph.getNeighbors('n1')).toHaveLength(1);
  });

  it('returns empty for unknown node', () => {
    const graph = new KnowledgeGraphImpl();
    expect(graph.getNode('nonexistent')).toBeUndefined();
    expect(graph.getNeighbors('nonexistent')).toEqual([]);
  });
});
