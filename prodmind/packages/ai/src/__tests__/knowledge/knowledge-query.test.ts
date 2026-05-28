import { describe, it, expect } from 'vitest';
import { KnowledgeQueryEngine } from '../../knowledge/knowledge-query.ts';
import { KnowledgeGraphImpl } from '../../knowledge/knowledge-graph.ts';
import type { KnowledgeBuildInput } from '../../knowledge/knowledge-types.ts';

describe('KnowledgeQueryEngine', () => {
  it('queries by sourceIds', () => {
    const graph = new KnowledgeGraphImpl();
    const input: KnowledgeBuildInput = {
      nodes: [
        { id: 'n1', type: 'NODE', label: 'core', description: '', fingerprint: 'fp1' },
        { id: 'n2', type: 'NODE', label: 'utils', description: '', fingerprint: 'fp2' },
      ],
      relations: [{ sourceId: 'n1', targetId: 'n2', relationType: 'DEPENDS_ON' }],
    };
    graph.build(input);
    const qe = new KnowledgeQueryEngine();
    const result = qe.query(graph, { sourceIds: ['n1'], maxDepth: 5, maxNodes: 50 });
    expect(result).toHaveLength(1);
  });

  it('returns empty for no matches', () => {
    const graph = new KnowledgeGraphImpl();
    graph.build({ nodes: [] });
    const qe = new KnowledgeQueryEngine();
    const result = qe.query(graph, { sourceIds: ['n1'], maxDepth: 5, maxNodes: 50 });
    expect(result).toHaveLength(0);
  });
});
