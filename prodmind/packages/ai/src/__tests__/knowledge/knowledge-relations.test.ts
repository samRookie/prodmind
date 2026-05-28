import { describe, it, expect } from 'vitest';
import { KnowledgeGraphImpl } from '../../knowledge/knowledge-graph.ts';
import { findRelationsBetween, findRelationsByType, findNodeRelations } from '../../knowledge/knowledge-relations.ts';
import type { KnowledgeBuildInput } from '../../knowledge/knowledge-types.ts';

describe('KnowledgeRelations', () => {
  it('finds relations between nodes', () => {
    const graph = new KnowledgeGraphImpl();
    const input: KnowledgeBuildInput = {
      nodes: [
        { id: 'n1', type: 'NODE', label: 'core', description: '', fingerprint: 'fp1' },
        { id: 'n2', type: 'NODE', label: 'utils', description: '', fingerprint: 'fp2' },
      ],
      relations: [{ sourceId: 'n1', targetId: 'n2', relationType: 'DEPENDS_ON' }],
    };
    graph.build(input);
    const rels = findRelationsBetween(graph, 'n1', 'n2');
    expect(rels).toHaveLength(1);
    expect(rels[0]!.relationType).toBe('DEPENDS_ON');
  });

  it('queries by type', () => {
    const graph = new KnowledgeGraphImpl();
    const input: KnowledgeBuildInput = {
      nodes: [
        { id: 'n1', type: 'NODE', label: 'core', description: '', fingerprint: 'fp1' },
        { id: 'n2', type: 'NODE', label: 'utils', description: '', fingerprint: 'fp2' },
        { id: 'n3', type: 'NODE', label: 'api', description: '', fingerprint: 'fp3' },
      ],
      relations: [
        { sourceId: 'n1', targetId: 'n2', relationType: 'DEPENDS_ON' },
        { sourceId: 'n1', targetId: 'n3', relationType: 'CORRELATES_WITH' },
      ],
    };
    graph.build(input);
    const filtered = findRelationsByType(graph, 'DEPENDS_ON');
    expect(filtered).toHaveLength(1);
  });

  it('finds node relations', () => {
    const graph = new KnowledgeGraphImpl();
    const input: KnowledgeBuildInput = {
      nodes: [
        { id: 'n1', type: 'NODE', label: 'core', description: '', fingerprint: 'fp1' },
        { id: 'n2', type: 'NODE', label: 'utils', description: '', fingerprint: 'fp2' },
      ],
      relations: [{ sourceId: 'n1', targetId: 'n2', relationType: 'DEPENDS_ON' }],
    };
    graph.build(input);
    const nr = findNodeRelations(graph, 'n1');
    expect(nr.outgoing).toHaveLength(1);
    expect(nr.incoming).toHaveLength(0);
  });
});
