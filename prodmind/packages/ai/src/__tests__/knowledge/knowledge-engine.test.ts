import { describe, it, expect } from 'vitest';
import { KnowledgeEngine } from '../../knowledge/knowledge-engine.ts';
import type { KnowledgeBuildInput } from '../../knowledge/knowledge-types.ts';

describe('KnowledgeEngine', () => {
  it('builds graph from input', () => {
    const engine = new KnowledgeEngine();
    const input: KnowledgeBuildInput = {
      nodes: [{ id: 'n1', type: 'NODE', label: 'core', description: '', fingerprint: 'fp1' }],
    };
    engine.build(input);
    expect(engine.nodeCount).toBe(1);
    expect(engine.getNode('n1')).toBeDefined();
  });

  it('builds relations from edges', () => {
    const engine = new KnowledgeEngine();
    const input: KnowledgeBuildInput = {
      nodes: [
        { id: 'n1', type: 'NODE', label: 'core', description: '', fingerprint: 'fp1' },
        { id: 'n2', type: 'NODE', label: 'utils', description: '', fingerprint: 'fp2' },
      ],
      relations: [{ sourceId: 'n1', targetId: 'n2', relationType: 'DEPENDS_ON' }],
    };
    engine.build(input);
    expect(engine.relationCount).toBe(1);
    const neighbors = engine.getNeighbors('n1');
    expect(neighbors).toHaveLength(1);
    expect(neighbors[0]!.node.id).toBe('n2');
  });
});
