import { describe, expect, it } from 'vitest';

import { createMemoryRecord, createSemanticEdge, createSemanticNode } from '../contracts/memory-factories.ts';
import { GraphLinker } from '../graph/graph-linker.ts';
import { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import { GraphQuery } from '../graph/graph-query.ts';
import { SemanticGraph } from '../graph/semantic-graph.ts';

/* ------------------------------------------------------------------ */
/*  SemanticGraph                                                      */
/* ------------------------------------------------------------------ */
describe('SemanticGraph', () => {
  it('starts empty', () => {
    const g = new SemanticGraph();
    expect(g.nodes).toEqual([]);
    expect(g.edges).toEqual([]);
    expect(g.nodeCount()).toBe(0);
    expect(g.edgeCount()).toBe(0);
  });

  it('accepts seed nodes and edges', () => {
    const a = createSemanticNode({ type: 'service', label: 'A', id: 'a' });
    const b = createSemanticNode({ type: 'service', label: 'B', id: 'b' });
    const e = createSemanticEdge({ sourceId: 'a', targetId: 'b', relationship: 'depends_on' });
    const g = new SemanticGraph([a, b], [e]);
    expect(g.nodeCount()).toBe(2);
    expect(g.edgeCount()).toBe(1);
  });

  it('refuses duplicate nodes', () => {
    const a = createSemanticNode({ type: 'service', label: 'A', id: 'a' });
    const g = new SemanticGraph([a]);
    g.addNode(a);
    expect(g.nodeCount()).toBe(1);
  });

  it('looks up nodes by id', () => {
    const a = createSemanticNode({ type: 'service', label: 'A', id: 'a' });
    const g = new SemanticGraph([a]);
    expect(g.getNode('a')?.label).toBe('A');
    expect(g.getNode('x')).toBeUndefined();
  });

  it('returns outgoing edges', () => {
    const a = createSemanticNode({ type: 'file' as never, label: 'x', id: 'a' });
    const b = createSemanticNode({ type: 'file' as never, label: 'x', id: 'b' });
    const c = createSemanticNode({ type: 'file' as never, label: 'x', id: 'c' });
    const e1 = createSemanticEdge({ sourceId: 'a', targetId: 'b', relationship: 'depends_on' });
    const e2 = createSemanticEdge({ sourceId: 'a', targetId: 'c', relationship: 'depends_on' });
    const g = new SemanticGraph([a, b, c], [e1, e2]);
    expect(g.getOutgoing('a')).toHaveLength(2);
    expect(g.getOutgoing('b')).toHaveLength(0);
    expect(g.getIncoming('a')).toHaveLength(0);
    expect(g.getIncoming('b')).toHaveLength(1);
  });

  it('traverses neighbors breadth-first', () => {
    const a = createSemanticNode({ type: 'file' as never, label: 'x', id: 'a' });
    const b = createSemanticNode({ type: 'file' as never, label: 'x', id: 'b' });
    const c = createSemanticNode({ type: 'file' as never, label: 'x', id: 'c' });
    const e1 = createSemanticEdge({ sourceId: 'a', targetId: 'b', relationship: 'depends_on' });
    const e2 = createSemanticEdge({ sourceId: 'b', targetId: 'c', relationship: 'depends_on' });
    const g = new SemanticGraph([a, b, c], [e1, e2]);
    const nb = g.getNeighbors('a');
    expect(nb).toHaveLength(2);
    expect(nb[0]?.node.id).toBe('b');
    expect(nb[0]?.depth).toBe(1);
    expect(nb[1]?.node.id).toBe('c');
    expect(nb[1]?.depth).toBe(2);
  });

  it('respects maxDepth on neighbor traversal', () => {
    const a = createSemanticNode({ type: 'file' as never, label: 'x', id: 'a' });
    const b = createSemanticNode({ type: 'file' as never, label: 'x', id: 'b' });
    const c = createSemanticNode({ type: 'file' as never, label: 'x', id: 'c' });
    const e1 = createSemanticEdge({ sourceId: 'a', targetId: 'b', relationship: 'depends_on' });
    const e2 = createSemanticEdge({ sourceId: 'b', targetId: 'c', relationship: 'depends_on' });
    const g = new SemanticGraph([a, b, c], [e1, e2]);
    expect(g.getNeighbors('a', 1)).toHaveLength(1);
  });

  it('returns empty for unknown node neighbors', () => {
    const g = new SemanticGraph();
    expect(g.getNeighbors('nope')).toEqual([]);
  });
});

/* ------------------------------------------------------------------ */
/*  GraphMemoryStore                                                    */
/* ------------------------------------------------------------------ */
describe('GraphMemoryStore', () => {
  it('stores and retrieves records', () => {
    const store = new GraphMemoryStore();
    const r = createMemoryRecord({ category: 'execution' });
    store.storeRecord(r);
    expect(store.recordCount()).toBe(1);
    expect(store.getRecord(r.id)).toBe(r);
    expect(store.getRecord('nope')).toBeUndefined();
  });

  it('stores and retrieves nodes', () => {
    const store = new GraphMemoryStore();
    const n = createSemanticNode({ type: 'service', label: 'S', id: 'svc' });
    store.storeNode(n);
    expect(store.nodeCount()).toBe(1);
    expect(store.getNode('svc')?.label).toBe('S');
  });

  it('stores and retrieves edges', () => {
    const store = new GraphMemoryStore();
    const e = createSemanticEdge({ sourceId: 'a', targetId: 'b', relationship: 'depends_on' });
    store.storeEdge(e);
    expect(store.edgeCount()).toBe(1);
  });

  it('stores and retrieves provenances', () => {
    const store = new GraphMemoryStore();
    store.storeProvenance({ id: 'p1', sourceId: 's', sourceType: 'orchestration', orchestrationId: '', executionId: '', fingerprint: '', parentId: '', createdAt: '' } as never);
    expect(store.recordCount()).toBe(0);
  });

  it('filters records by category', () => {
    const store = new GraphMemoryStore();
    store.storeRecord(createMemoryRecord({ category: 'execution' }));
    store.storeRecord(createMemoryRecord({ category: 'provenance' as never }));
    expect(store.getRecordsByCategory('execution')).toHaveLength(1);
    expect(store.getRecordsByCategory('unknown')).toHaveLength(0);
  });

  it('filters nodes by type', () => {
    const store = new GraphMemoryStore();
    store.storeNode(createSemanticNode({ type: 'service', label: 'A', id: 'a' }));
    store.storeNode(createSemanticNode({ type: 'file', label: 'b', id: 'b' }));
    expect(store.getNodesByType('file')).toHaveLength(1);
  });

  it('converts to SemanticGraph', () => {
    const store = new GraphMemoryStore();
    store.storeNode(createSemanticNode({ type: 'file' as never, label: 'x', id: 'a' }));
    store.storeEdge(createSemanticEdge({ sourceId: 'a', targetId: 'b', relationship: 'depends_on' }));
    const g = store.toGraph();
    expect(g.nodeCount()).toBe(1);
    expect(g.edgeCount()).toBe(1);
  });

  it('snapshots and restores', () => {
    const store = new GraphMemoryStore();
    store.storeRecord(createMemoryRecord({ category: 'execution' }));
    store.storeNode(createSemanticNode({ type: 'file' as never, label: 'x', id: 'a' }));
    const snap = store.takeSnapshot('fp1');

    const store2 = new GraphMemoryStore();
    store2.restoreSnapshot(snap);
    expect(store2.recordCount()).toBe(1);
    expect(store2.nodeCount()).toBe(1);
    expect(store2.getNode('a')).toBeDefined();
  });

  it('filters records by id prefix', () => {
    const store = new GraphMemoryStore();
    const r1 = { ...createMemoryRecord({ category: 'execution' }), id: 'rec:foo' };
    const r2 = { ...createMemoryRecord({ category: 'provenance' as never }), id: 'rec:bar' };
    const r3 = { ...createMemoryRecord({ category: 'execution' }), id: 'ctx:baz' };
    store.storeRecord(r1 as never);
    store.storeRecord(r2 as never);
    store.storeRecord(r3 as never);
    expect(store.getRecordsByPrefix('rec:')).toHaveLength(2);
    expect(store.getRecordsByPrefix('ctx:')).toHaveLength(1);
    expect(store.getRecordsByPrefix('nope')).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  GraphLinker                                                         */
/* ------------------------------------------------------------------ */
describe('GraphLinker', () => {
  it('links node pairs by shared provenance', () => {
    const store = new GraphMemoryStore();
    store.storeNode(createSemanticNode({ type: 'file' as never, label: 'x', id: 'a' }));
    store.storeNode(createSemanticNode({ type: 'file' as never, label: 'x', id: 'b' }));
    store.storeNode(createSemanticNode({ type: 'file' as never, label: 'x', id: 'c' }));
    const linker = new GraphLinker();
    const edges = linker.linkBySharedProvenance(store, ['a', 'b', 'c'], 'prov_1');
    expect(edges).toHaveLength(3);
    expect(store.edgeCount()).toBe(3);
    expect(edges[0]?.relationship).toBe('provenance_of');
  });

  it('links nodes in a namespace', () => {
    const store = new GraphMemoryStore();
    store.storeNode(createSemanticNode({ type: 'file' as never, label: 'x', id: 'ns:a' }));
    store.storeNode(createSemanticNode({ type: 'file' as never, label: 'x', id: 'ns:b' }));
    const linker = new GraphLinker();
    linker.linkByNamespace(store, 'ns');
    expect(store.edgeCount()).toBe(1);
  });

  it('creates explicit single edge', () => {
    const store = new GraphMemoryStore();
    const linker = new GraphLinker();
    const edge = linker.linkExplicit(store, 'a', 'b', 'depends_on', 3);
    expect(edge.weight).toBe(3);
    expect(store.edgeCount()).toBe(1);
  });

  it('links via SemanticNode objects', () => {
    const store = new GraphMemoryStore();
    const a = createSemanticNode({ type: 'file' as never, label: 'x', id: 'a' });
    const b = createSemanticNode({ type: 'file' as never, label: 'x', id: 'b' });
    store.storeNode(a);
    store.storeNode(b);
    const linker = new GraphLinker();
    linker.linkNodes(store, a, b, 'depends_on');
    expect(store.edgeCount()).toBe(1);
  });
});

/* ------------------------------------------------------------------ */
/*  GraphQuery                                                          */
/* ------------------------------------------------------------------ */
describe('GraphQuery', () => {
  it('queries by namespace', () => {
    const store = new GraphMemoryStore();
    const r = { ...createMemoryRecord({ category: 'execution' }), id: 'ns:rec1' };
    store.storeRecord(r as never);
    store.storeNode(createSemanticNode({ type: 'file' as never, label: 'x', id: 'ns:node1' }));
    const q = new GraphQuery();
    const result = q.queryByNamespace(store, 'ns');
    expect(result.records).toHaveLength(1);
    expect(result.nodes).toHaveLength(1);
    expect(result.total).toBe(2);
  });

  it('queries by category', () => {
    const store = new GraphMemoryStore();
    store.storeRecord(createMemoryRecord({ category: 'execution' }));
    store.storeRecord(createMemoryRecord({ category: 'provenance' as never }));
    const q = new GraphQuery();
    expect(q.queryByCategory(store, 'execution').records).toHaveLength(1);
  });

  it('queries by type', () => {
    const store = new GraphMemoryStore();
    store.storeNode(createSemanticNode({ type: 'service', label: 'S', id: 's1' }));
    store.storeNode(createSemanticNode({ type: 'file', label: 'F', id: 'f1' }));
    const q = new GraphQuery();
    expect(q.queryByType(store, 'service').nodes).toHaveLength(1);
  });

  it('executes structured RetrievalQuery', () => {
    const store = new GraphMemoryStore();
    const r1 = createMemoryRecord({ category: 'execution' });
    const r2 = createMemoryRecord({ category: 'provenance' as never });
    store.storeRecord(r1);
    store.storeRecord(r2);
    const q = new GraphQuery();
    const result = q.query(store, { seedIds: [r1.id, r2.id], maxDepth: 0, maxResults: 50, strategy: 'hybrid' } as never);
    expect(result.records).toHaveLength(2);
  });

  it('respects maxResults limit on query', () => {
    const store = new GraphMemoryStore();
    for (let i = 0; i < 10; i++) {
      const r = createMemoryRecord({ category: 'execution' });
      store.storeRecord({ ...r, id: `r_${i}` } as never);
    }
    const q = new GraphQuery();
    const result = q.query(store, {
      seedIds: Array.from({ length: 10 }, (_, i) => `r_${i}`),
      maxDepth: 0, maxResults: 3,
      strategy: 'hybrid',
    } as never);
    expect(result.records).toHaveLength(3);
    expect(result.total).toBe(3);
  });
});

describe('result immutability', () => {
  it('freezes GraphMemoryStore arrays', () => {
    const store = new GraphMemoryStore();
    store.storeRecord(createMemoryRecord({ category: 'execution' }));
    expect(Object.isFrozen(store.records)).toBe(true);
    expect(Object.isFrozen(store.nodes)).toBe(true);
    expect(Object.isFrozen(store.edges)).toBe(true);
    expect(Object.isFrozen(store.provenances)).toBe(true);
  });

  it('freezes query result', () => {
    const store = new GraphMemoryStore();
    store.storeRecord(createMemoryRecord({ category: 'execution' }));
    const q = new GraphQuery();
    const result = q.queryByCategory(store, 'execution');
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.records)).toBe(true);
  });

  it('freezes SemanticGraph arrays', () => {
    const g = new SemanticGraph();
    expect(Object.isFrozen(g.nodes)).toBe(true);
    expect(Object.isFrozen(g.edges)).toBe(true);
  });
});
