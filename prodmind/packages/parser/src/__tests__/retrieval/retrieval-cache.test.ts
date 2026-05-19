import { describe, it, expect } from 'vitest';
import { createRetrievalCache } from '../../retrieval/retrieval-cache.ts';

describe('createRetrievalCache', () => {
  const nodes = [
    { id: 'n1', filePath: 'src/a.ts', fileHash: null, nodeType: 'FILE', symbolName: 'foo', language: 'ts', metadataJson: null },
    { id: 'n2', filePath: 'src/b.ts', fileHash: null, nodeType: 'FILE', symbolName: 'bar', language: 'ts', metadataJson: null },
    { id: 'n3', filePath: 'src/sub/c.ts', fileHash: null, nodeType: 'FILE', symbolName: null, language: 'ts', metadataJson: null },
  ];
  const edges = [
    { id: 'e1', sourceNodeId: 'n1', targetNodeId: 'n2', edgeType: 'IMPORTS', weight: 1, metadataJson: null },
    { id: 'e2', sourceNodeId: 'n2', targetNodeId: 'n3', edgeType: 'IMPORTS', weight: 1, metadataJson: null },
  ];

  it('builds adjacency maps', () => {
    const ctx = createRetrievalCache({ nodes, edges });
    expect(ctx.adjacency.get('n1')).toEqual(['n2']);
    expect(ctx.adjacency.get('n2')).toEqual(['n3']);
    expect(ctx.adjacency.get('n3')).toEqual([]);
  });

  it('builds reverse adjacency maps', () => {
    const ctx = createRetrievalCache({ nodes, edges });
    expect(ctx.reverseAdjacency.get('n1')).toEqual([]);
    expect(ctx.reverseAdjacency.get('n2')).toEqual(['n1']);
    expect(ctx.reverseAdjacency.get('n3')).toEqual(['n2']);
  });

  it('builds node map by id', () => {
    const ctx = createRetrievalCache({ nodes, edges });
    expect(ctx.nodeMap.get('n1')?.filePath).toBe('src/a.ts');
    expect(ctx.nodeMap.get('n2')?.filePath).toBe('src/b.ts');
  });

  it('builds namespace map', () => {
    const ctx = createRetrievalCache({ nodes, edges });
    expect(ctx.namespaceMap.get('src')?.sort()).toEqual(['n1', 'n2']);
    expect(ctx.namespaceMap.get('src/sub')?.sort()).toEqual(['n3']);
  });

  it('builds symbol ownership map', () => {
    const ctx = createRetrievalCache({ nodes, edges });
    expect(ctx.symbolOwnershipMap.get('foo')).toEqual(['n1']);
    expect(ctx.symbolOwnershipMap.get('bar')).toEqual(['n2']);
  });

  it('produces deterministic sortedNodeIds', () => {
    const ctx = createRetrievalCache({ nodes, edges });
    expect(ctx.sortedNodeIds).toEqual(['n1', 'n2', 'n3']);
  });

  it('returns a frozen context', () => {
    const ctx = createRetrievalCache({ nodes, edges });
    expect(Object.isFrozen(ctx)).toBe(true);
  });
});
