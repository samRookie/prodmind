import { describe, expect, it } from 'vitest';

import { createContextWindow, createContextWindowEntry, createMemoryRecord, createRetrievalQuery, createSemanticEdge, createSemanticNode } from '../contracts/memory-factories.ts';
import { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import { ContextAssembler } from '../retrieval/context-assembler.ts';
import { ContextWindowManager } from '../retrieval/context-window-manager.ts';
import { CrossNamespaceRetriever } from '../retrieval/cross-namespace-retriever.ts';
import { RetrievalCache } from '../retrieval/retrieval-cache.ts';
import { RetrievalEngine, RetrievalStage } from '../retrieval/retrieval-engine.ts';

/* ------------------------------------------------------------------ */
/*  RetrievalEngine                                                      */
/* ------------------------------------------------------------------ */
describe('RetrievalEngine', () => {
  it('executes a full retrieval pipeline', () => {
    const store = new GraphMemoryStore();
    const r = createMemoryRecord({ category: 'execution' });
    store.storeRecord(r);

    const engine = new RetrievalEngine(store);
    const query = createRetrievalQuery({
      seedIds: [r.id],
      maxDepth: 0,
      maxResults: 50,
      strategy: 'hybrid',
    });
    const result = engine.retrieve(query);
    expect(result.records).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('records all retrieval stages', () => {
    const store = new GraphMemoryStore();
    const r = createMemoryRecord({ category: 'execution' });
    store.storeRecord(r);

    const engine = new RetrievalEngine(store);
    const query = createRetrievalQuery({
      seedIds: [r.id],
      maxDepth: 0,
      maxResults: 50,
      strategy: 'hybrid',
    });
    engine.retrieve(query);
    expect(engine.steps.length).toBeGreaterThanOrEqual(7);
    expect(engine.steps[0]?.stage).toBe(RetrievalStage.SEED);
  });

  it('expands via graph neighbors', () => {
    const store = new GraphMemoryStore();
    const a = createSemanticNode({ type: 'service', label: 'A', id: 'n_a' });
    const b = createSemanticNode({ type: 'service', label: 'B', id: 'n_b' });
    store.storeNode(a);
    store.storeNode(b);
    store.storeEdge(createSemanticEdge({ sourceId: 'n_a', targetId: 'n_b', relationship: 'depends_on' }));

    const engine = new RetrievalEngine(store);
    const query = createRetrievalQuery({
      seedIds: ['n_a'],
      maxDepth: 3,
      maxResults: 50,
      strategy: 'hybrid',
    });
    const result = engine.retrieve(query);
    expect(result.nodes).toHaveLength(2);
  });

  it('filters by categories', () => {
    const store = new GraphMemoryStore();
    store.storeRecord(createMemoryRecord({ category: 'execution' }));
    store.storeRecord(createMemoryRecord({ category: 'provenance' as never }));

    const engine = new RetrievalEngine(store);
    const query = createRetrievalQuery({
      seedIds: store.records.map(r => r.id),
      maxDepth: 0,
      maxResults: 50,
      strategy: 'hybrid',
      filterCategories: ['execution'],
    });
    const result = engine.retrieve(query);
    expect(result.records).toHaveLength(1);
  });

  it('performs namespace lookup when namespace is set', () => {
    const store = new GraphMemoryStore();
    const r = { ...createMemoryRecord({ category: 'execution' }), id: 'ns:rec1' };
    store.storeRecord(r as never);

    const engine = new RetrievalEngine(store);
    const query = createRetrievalQuery({
      seedIds: [],
      maxDepth: 0,
      maxResults: 50,
      strategy: 'namespace',
      namespace: 'ns',
    });
    const result = engine.retrieve(query);
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it('deduplicates merged results', () => {
    const store = new GraphMemoryStore();
    const r = createMemoryRecord({ category: 'execution' });
    store.storeRecord(r);

    const engine = new RetrievalEngine(store);
    const query = createRetrievalQuery({
      seedIds: [r.id, r.id],
      maxDepth: 0,
      maxResults: 50,
      strategy: 'hybrid',
    });
    const result = engine.retrieve(query);
    expect(result.records).toHaveLength(1);
  });

  it('ranks results alphabetically', () => {
    const store = new GraphMemoryStore();
    const rr = { ...createMemoryRecord({ category: 'execution' }), id: 'z_last' };
    const ra = { ...createMemoryRecord({ category: 'execution' }), id: 'a_first' };
    store.storeRecord(rr as never);
    store.storeRecord(ra as never);

    const engine = new RetrievalEngine(store);
    const query = createRetrievalQuery({
      seedIds: ['z_last', 'a_first'],
      maxDepth: 0,
      maxResults: 50,
      strategy: 'hybrid',
    });
    const result = engine.retrieve(query);
    expect(result.records[0]?.id).toBe('a_first');
    expect(result.records[1]?.id).toBe('z_last');
  });
});

/* ------------------------------------------------------------------ */
/*  ContextAssembler                                                     */
/* ------------------------------------------------------------------ */
describe('ContextAssembler', () => {
  it('assembles result into context window', () => {
    const assembler = new ContextAssembler();
    const r = createMemoryRecord({ category: 'execution', payload: { msg: 'hello' } });

    const window = assembler.assemble(
      { records: [r], nodes: [], total: 1 },
      { budget: 1000 },
    );
    expect(window.entries).toHaveLength(1);
    expect(window.totalTokens).toBeGreaterThan(0);
  });

  it('detects overflow', () => {
    const assembler = new ContextAssembler();
    const r = createMemoryRecord({ category: 'execution', payload: { data: 'x'.repeat(500) } });
    const window = assembler.assemble({ records: [r], nodes: [], total: 1 }, { budget: 10 });
    expect(window.overflow).toBe(true);
  });

  it('stays within budget', () => {
    const assembler = new ContextAssembler();
    const r = createMemoryRecord({ category: 'execution', payload: { data: 'small' } });
    const window = assembler.assemble({ records: [r], nodes: [], total: 1 }, { budget: 10_000 });
    expect(window.overflow).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  ContextWindowManager                                                 */
/* ------------------------------------------------------------------ */
describe('ContextWindowManager', () => {
  it('trims by max entries', () => {
    const mgr = new ContextWindowManager();
    const entries = Array.from({ length: 10 }, (_, i) =>
      createContextWindowEntry({ source: 'test', content: `e${i}`, tokenCount: 10, priority: i, provenanceChain: [] }),
    );
    const window = createContextWindow({ entries, totalTokens: 100, budget: 1000, provenance: [] });
    const trimmed = mgr.trim(window, { maxTokens: 1000, maxEntries: 3 });
    expect(trimmed.entries).toHaveLength(3);
  });

  it('trims by token budget', () => {
    const mgr = new ContextWindowManager();
    const entries = Array.from({ length: 5 }, (_, i) =>
      createContextWindowEntry({ source: 'test', content: `e${i}`, tokenCount: 50, priority: i, provenanceChain: [] }),
    );
    const window = createContextWindow({ entries, totalTokens: 250, budget: 1000 });
    const trimmed = mgr.trim(window, { maxTokens: 120 });
    expect(trimmed.totalTokens).toBeLessThanOrEqual(120);
  });

  it('merges multiple windows', () => {
    const mgr = new ContextWindowManager();
    const w1 = createContextWindow({
      entries: [createContextWindowEntry({ source: 'a', content: 'x', tokenCount: 5, priority: 1, provenanceChain: [] })],
      totalTokens: 5, budget: 100,
    });
    const w2 = createContextWindow({
      entries: [createContextWindowEntry({ source: 'b', content: 'y', tokenCount: 10, priority: 2, provenanceChain: [] })],
      totalTokens: 10, budget: 200,
    });
    const merged = mgr.mergeWindows([w1, w2]);
    expect(merged.entries).toHaveLength(2);
    expect(merged.totalTokens).toBe(15);
    expect(merged.budget).toBe(200);
  });

  it('filters by source', () => {
    const mgr = new ContextWindowManager();
    const entries = [
      createContextWindowEntry({ source: 'execution', content: 'a', tokenCount: 5, priority: 1, provenanceChain: [] }),
      createContextWindowEntry({ source: 'session', content: 'b', tokenCount: 5, priority: 2, provenanceChain: [] }),
    ];
    const window = createContextWindow({ entries, totalTokens: 10, budget: 100 });
    const filtered = mgr.filterBySource(window, 'execution');
    expect(filtered.entries).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/*  RetrievalCache                                                       */
/* ------------------------------------------------------------------ */
describe('RetrievalCache', () => {
  it('stores and retrieves by key', () => {
    const cache = new RetrievalCache(10, 5000);
    const result = { records: Object.freeze([]), nodes: Object.freeze([]), total: 0 };
    cache.set('k1', result);
    expect(cache.get('k1')).toBe(result);
    expect(cache.size).toBe(1);
  });

  it('returns undefined for missing key', () => {
    const cache = new RetrievalCache();
    expect(cache.get('nope')).toBeUndefined();
  });

  it('invalidates by key', () => {
    const cache = new RetrievalCache();
    const result = { records: Object.freeze([]), nodes: Object.freeze([]), total: 0 };
    cache.set('k1', result);
    cache.invalidate('k1');
    expect(cache.get('k1')).toBeUndefined();
  });

  it('clears all entries', () => {
    const cache = new RetrievalCache();
    const result = { records: Object.freeze([]), nodes: Object.freeze([]), total: 0 };
    cache.set('k1', result);
    cache.set('k2', result);
    cache.clear();
    expect(cache.size).toBe(0);
  });

  it('evicts oldest entry when at capacity', () => {
    const cache = new RetrievalCache(2, 5000);
    const r = { records: Object.freeze([]), nodes: Object.freeze([]), total: 0 };
    cache.set('a', r);
    cache.set('b', r);
    cache.set('c', r);
    expect(cache.get('a')).toBeUndefined();
    expect(cache.size).toBe(2);
  });
});

/* ------------------------------------------------------------------ */
/*  CrossNamespaceRetriever                                              */
/* ------------------------------------------------------------------ */
describe('CrossNamespaceRetriever', () => {
  it('returns empty for no query terms', () => {
    const store = new GraphMemoryStore();
    const retriever = new CrossNamespaceRetriever();
    const query = createRetrievalQuery({ seedIds: [], maxDepth: 0, maxResults: 10, strategy: 'hybrid', queryTerms: [] });
    const result = retriever.retrieve(store, query);
    expect(result.total).toBe(0);
  });

  it('matches records by term in id', () => {
    const store = new GraphMemoryStore();
    store.storeRecord({ ...createMemoryRecord({ category: 'execution' }), id: 'test:record' } as never);
    const retriever = new CrossNamespaceRetriever();
    const query = createRetrievalQuery({ seedIds: [], maxDepth: 0, maxResults: 10, strategy: 'hybrid', queryTerms: ['test'] });
    const result = retriever.retrieve(store, query);
    expect(result.total).toBe(1);
  });

  it('matches records by term in payload', () => {
    const store = new GraphMemoryStore();
    store.storeRecord(createMemoryRecord({ category: 'execution', payload: { keyword: 'unique' } }));
    const retriever = new CrossNamespaceRetriever();
    const query = createRetrievalQuery({ seedIds: [], maxDepth: 0, maxResults: 10, strategy: 'hybrid', queryTerms: ['unique'] });
    const result = retriever.retrieve(store, query);
    expect(result.total).toBe(1);
  });

  it('excludes non-matching records', () => {
    const store = new GraphMemoryStore();
    store.storeRecord(createMemoryRecord({ category: 'execution', payload: { data: 'alpha' } }));
    const retriever = new CrossNamespaceRetriever();
    const query = createRetrievalQuery({ seedIds: [], maxDepth: 0, maxResults: 10, strategy: 'hybrid', queryTerms: ['beta'] });
    const result = retriever.retrieve(store, query);
    expect(result.total).toBe(0);
  });
});
