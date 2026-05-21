import { describe, expect, it } from 'vitest';

import { createMemoryRecord, createRetrievalQuery } from '../contracts/memory-factories.ts';
import { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import { MemoryAwareRuntime } from '../integration/memory-aware-runtime.ts';
import { MemoryIntegration } from '../integration/memory-integration.ts';
import { SnapshotStore } from '../integration/snapshot-store.ts';

/* ------------------------------------------------------------------ */
/*  MemoryIntegration                                                    */
/* ------------------------------------------------------------------ */
describe('MemoryIntegration', () => {
  it('initializes all subsystems', () => {
    const mi = new MemoryIntegration();
    expect(mi.store).toBeDefined();
    expect(mi.provenance).toBeDefined();
    expect(mi.replay).toBeDefined();
    expect(mi.execution).toBeDefined();
    expect(mi.retrieval).toBeDefined();
    expect(mi.assembler).toBeDefined();
    expect(mi.windowManager).toBeDefined();
    expect(mi.governor).toBeDefined();
  });

  it('begins and completes execution through integration', () => {
    const mi = new MemoryIntegration();
    const id = mi.beginExecution('process', { data: 'test' });
    expect(id).toBeTruthy();
    expect(mi.execution.execution.stepCount).toBe(1);
    expect(mi.replay.recorder.eventCount).toBe(1);

    mi.completeExecution(id, { result: 'ok' }, 50);
    expect(mi.execution.execution.getStep(id)?.status).toBe('completed');
    expect(mi.replay.recorder.eventCount).toBe(2);
  });

  it('fails execution through integration', () => {
    const mi = new MemoryIntegration();
    const id = mi.beginExecution('fail_test');
    mi.failExecution(id, 'error');
    expect(mi.execution.session.status).toBe('failed');
    expect(mi.replay.recorder.eventCount).toBe(2);
  });

  it('queries via integration', () => {
    const mi = new MemoryIntegration();
    mi.store.storeRecord(createMemoryRecord({ category: 'execution' }));
    const query = createRetrievalQuery({
      seedIds: mi.store.records.map(r => r.id),
      maxDepth: 0, maxResults: 50, strategy: 'hybrid',
    });
    const result = mi.query(query);
    expect(result.total).toBe(1);
  });

  it('assembles context', () => {
    const mi = new MemoryIntegration();
    mi.store.storeRecord(createMemoryRecord({ category: 'execution', payload: { msg: 'hello' } }));
    const query = createRetrievalQuery({
      seedIds: mi.store.records.map(r => r.id),
      maxDepth: 0, maxResults: 50, strategy: 'hybrid',
    });
    const window = mi.assemble(query, { budget: 1000 });
    expect(window.entries).toHaveLength(1);
  });

  it('enforces policies', () => {
    const mi = new MemoryIntegration();
    mi.configureDefaults();
    mi.store.storeRecord(createMemoryRecord({ category: 'execution' }));
    expect(() => mi.enforcePolicies()).not.toThrow();
  });

  it('takes a snapshot', () => {
    const mi = new MemoryIntegration();
    mi.store.storeRecord(createMemoryRecord({ category: 'execution' }));
    const snap = mi.snapshot();
    expect(snap.store).toBeDefined();
    expect(snap.execution).toBeDefined();
  });

  it('resets state', () => {
    const mi = new MemoryIntegration();
    mi.beginExecution('test');
    mi.reset();
    expect(mi.execution.session.status).toBe('completed');
  });
});

/* ------------------------------------------------------------------ */
/*  MemoryAwareRuntime                                                   */
/* ------------------------------------------------------------------ */
describe('MemoryAwareRuntime', () => {
  it('wraps memory integration', () => {
    const r = new MemoryAwareRuntime();
    expect(r.memory).toBeDefined();
  });

  it('runs a function with memory tracking', async () => {
    const r = new MemoryAwareRuntime();
    const result = await r.runWithMemory('add', () => Promise.resolve(42));
    expect(result).toBe(42);
    expect(r.memory.execution.execution.stepCount).toBe(1);
  });

  it('records failure on thrown error', async () => {
    const r = new MemoryAwareRuntime();
    await expect(
      r.runWithMemory('fail', () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    expect(r.memory.execution.session.status).toBe('failed');
  });

  it('retrieves and assembles', () => {
    const r = new MemoryAwareRuntime();
    r.memory.store.storeRecord(createMemoryRecord({ category: 'execution' }));
    const query = createRetrievalQuery({
      seedIds: r.memory.store.records.map(rr => rr.id),
      maxDepth: 0, maxResults: 10, strategy: 'hybrid',
    });
    expect(r.retrieve(query).total).toBe(1);
    expect(r.assemble(query, { budget: 1000 }).entries).toHaveLength(1);
  });

  it('resets', () => {
    const r = new MemoryAwareRuntime();
    r.runWithMemory('test', async () => {});
    r.reset();
    expect(r.memory.execution.session.status).toBe('completed');
  });
});

/* ------------------------------------------------------------------ */
/*  SnapshotStore                                                       */
/* ------------------------------------------------------------------ */
describe('SnapshotStore', () => {
  it('saves and loads snapshots', () => {
    const ss = new SnapshotStore();
    const store = new GraphMemoryStore();
    store.storeRecord(createMemoryRecord({ category: 'execution' }));
    ss.save('s1', store);

    const store2 = new GraphMemoryStore();
    const loaded = ss.load('s1', store2);
    expect(loaded).toBe(true);
    expect(store2.recordCount()).toBe(1);
  });

  it('returns false for missing snapshot', () => {
    const ss = new SnapshotStore();
    const store = new GraphMemoryStore();
    expect(ss.load('nope', store)).toBe(false);
  });

  it('removes snapshots', () => {
    const ss = new SnapshotStore();
    const store = new GraphMemoryStore();
    ss.save('s1', store);
    ss.remove('s1');
    expect(ss.exists('s1')).toBe(false);
  });

  it('clears all snapshots', () => {
    const ss = new SnapshotStore();
    const store = new GraphMemoryStore();
    ss.save('a', store);
    ss.save('b', store);
    ss.clear();
    expect(ss.size).toBe(0);
  });

  it('checks existence', () => {
    const ss = new SnapshotStore();
    const store = new GraphMemoryStore();
    ss.save('k', store);
    expect(ss.exists('k')).toBe(true);
    expect(ss.exists('x')).toBe(false);
  });
});
