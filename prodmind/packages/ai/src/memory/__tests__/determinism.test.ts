import { describe, expect, it } from 'vitest';

import { generateMemoryId } from '../contracts/memory-factories.ts';
import { createMemoryRecord, createRetrievalQuery,createSemanticEdge, createSemanticNode } from '../contracts/memory-factories.ts';
import { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import { SemanticIndex } from '../indexing/semantic-index.ts';
import { MemoryIntegration } from '../integration/memory-integration.ts';
import { ReplayEngine } from '../replay/replay-engine.ts';
import { RetrievalEngine } from '../retrieval/retrieval-engine.ts';

/* ------------------------------------------------------------------ */
/*  ID generation determinism                                           */
/* ------------------------------------------------------------------ */
describe('determinism: ids', () => {
  it('generates sequential ids', () => {
    const a = generateMemoryId('test');
    const b = generateMemoryId('test');
    const c = generateMemoryId('test');
    expect(a).toMatch(/^test_\d+$/);
    expect(Number(a.split('_')[1])).toBeLessThan(Number(b.split('_')[1]));
    expect(Number(b.split('_')[1])).toBeLessThan(Number(c.split('_')[1]));
  });
});

/* ------------------------------------------------------------------ */
/*  Snapshot determinism                                                 */
/* ------------------------------------------------------------------ */
describe('determinism: snapshot', () => {
  it('restore yields same records', () => {
    const store = new GraphMemoryStore();
    store.storeRecord(createMemoryRecord({ category: 'execution' }));
    store.storeNode(createSemanticNode({ type: 'service', label: 'S', id: 'svc' }));
    const snap = store.takeSnapshot('fp1');

    const store2 = new GraphMemoryStore();
    store2.restoreSnapshot(snap);
    expect(store2.recordCount()).toBe(store.recordCount());
    expect(store2.nodeCount()).toBe(store.nodeCount());
  });

  it('graph from restored store is identical', () => {
    const store = new GraphMemoryStore();
    const n1 = createSemanticNode({ type: 'file' as never, label: 'x', id: 'a' });
    const n2 = createSemanticNode({ type: 'file' as never, label: 'x', id: 'b' });
    store.storeNode(n1);
    store.storeNode(n2);
    store.storeEdge(createSemanticEdge({ sourceId: 'a', targetId: 'b', relationship: 'depends_on' }));

    const snap = store.takeSnapshot('fp');
    const store2 = new GraphMemoryStore();
    store2.restoreSnapshot(snap);

    const g1 = store.toGraph();
    const g2 = store2.toGraph();
    expect(g1.nodeCount()).toBe(g2.nodeCount());
    expect(g1.edgeCount()).toBe(g2.edgeCount());
    expect(g1.getNeighbors('a')).toHaveLength(g2.getNeighbors('a').length);
  });
});

/* ------------------------------------------------------------------ */
/*  Retrieval determinism                                                */
/* ------------------------------------------------------------------ */
describe('determinism: retrieval', () => {
  it('same query returns same results', () => {
    const store = new GraphMemoryStore();
    for (let i = 0; i < 10; i++) {
      store.storeRecord({ ...createMemoryRecord({ category: 'execution' }), id: `rec_${i}` } as never);
    }

    const engine = new RetrievalEngine(store);
    const seedIds = ['rec_0', 'rec_1', 'rec_2'];
    const query = createRetrievalQuery({ seedIds, maxDepth: 0, maxResults: 50, strategy: 'hybrid' });

    const r1 = engine.retrieve(query);
    const r2 = engine.retrieve(query);

    expect(r1.records.map(r => r.id)).toEqual(r2.records.map(r => r.id));
    expect(r1.total).toBe(r2.total);
  });

  it('stages are reproducible', () => {
    const store = new GraphMemoryStore();
    for (let i = 0; i < 5; i++) {
      store.storeRecord({ ...createMemoryRecord({ category: 'execution' }), id: `r_${i}` } as never);
    }

    const engine = new RetrievalEngine(store);
    const query = createRetrievalQuery({ seedIds: ['r_0', 'r_1'], maxDepth: 0, maxResults: 10, strategy: 'hybrid' });
    engine.retrieve(query);
    const steps1 = engine.steps.map(s => s.stage);

    engine.retrieve(query);
    const steps2 = engine.steps.map(s => s.stage);
    expect(steps1).toEqual(steps2);
  });
});

/* ------------------------------------------------------------------ */
/*  Replay determinism                                                   */
/* ------------------------------------------------------------------ */
describe('determinism: replay', () => {
  it('replay records events in order', () => {
    const r = new ReplayEngine();
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const evt = r.record(`evt_${i}`, { index: i }, 'manual', `src_${i}`);
      ids.push(evt.id);
    }
    expect(r.recorder.events.map(e => e.id)).toEqual(ids);
  });

  it('replay events are chronologically ordered', () => {
    const r = new ReplayEngine();
    r.record('a', {}, 'manual', 's1');
    r.record('b', {}, 'manual', 's2');
    r.record('c', {}, 'manual', 's3');
    const events = r.recorder.events;
    expect(events[0]!.type).toBe('a');
    expect(events[1]!.type).toBe('b');
    expect(events[2]!.type).toBe('c');
  });
});

/* ------------------------------------------------------------------ */
/*  Index determinism                                                    */
/* ------------------------------------------------------------------ */
describe('determinism: index', () => {
  it('semantic index returns deterministic lookups', () => {
    const idx = new SemanticIndex();
    const r1 = { ...createMemoryRecord({ category: 'execution' }), id: 'a' };
    const r2 = { ...createMemoryRecord({ category: 'provenance' as never }), id: 'b' };
    idx.indexRecord('k', r1 as never);
    idx.indexRecord('k', r2 as never);

    const lookup1 = idx.lookup('k').map(e => e.refId);
    const lookup2 = idx.lookup('k').map(e => e.refId);
    expect(lookup1).toEqual(lookup2);
  });
});

/* ------------------------------------------------------------------ */
/*  Integration determinism                                              */
/* ------------------------------------------------------------------ */
describe('determinism: integration', () => {
  it('empty integration has deterministic initial state', () => {
    const a = new MemoryIntegration();
    const b = new MemoryIntegration();
    expect(a.execution.execution.stepCount).toBe(b.execution.execution.stepCount);
    expect(a.store.recordCount()).toBe(b.store.recordCount());
    expect(a.provenance.count).toBe(b.provenance.count);
  });
});
