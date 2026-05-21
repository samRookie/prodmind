import { describe, expect, it } from 'vitest';

import { GraphMemoryStore } from '../graph/graph-memory-store.ts';
import { ProvenanceChain } from '../provenance/provenance-chain.ts';
import { ProvenanceTracker } from '../provenance/provenance-tracker.ts';

/* ------------------------------------------------------------------ */
/*  ProvenanceTracker                                                    */
/* ------------------------------------------------------------------ */
describe('ProvenanceTracker', () => {
  it('starts empty', () => {
    const t = new ProvenanceTracker();
    expect(t.count).toBe(0);
    expect(t.records).toEqual([]);
  });

  it('tracks a provenance record', () => {
    const t = new ProvenanceTracker();
    const p = t.track('src_1', 'orchestration');
    expect(p.sourceId).toBe('src_1');
    expect(p.sourceType).toBe('orchestration');
    expect(p.id).toBeTruthy();
    expect(t.count).toBe(1);
  });

  it('tracks with all optional fields', () => {
    const t = new ProvenanceTracker();
    const p = t.track('src_1', 'orchestration', 'parent_1', 'fp1', 'orch_1', 'exec_1');
    expect(p.parentId).toBe('parent_1');
    expect(p.fingerprint).toBe('fp1');
    expect(p.orchestrationId).toBe('orch_1');
    expect(p.executionId).toBe('exec_1');
  });

  it('retrieves by id', () => {
    const t = new ProvenanceTracker();
    const p = t.track('s', 'manual');
    expect(t.getProvenance(p.id)).toBe(p);
    expect(t.getProvenance('nope')).toBeUndefined();
  });

  it('filters by sourceId', () => {
    const t = new ProvenanceTracker();
    t.track('a', 'manual');
    t.track('b', 'manual');
    t.track('a', 'manual');
    expect(t.getBySourceId('a')).toHaveLength(2);
    expect(t.getBySourceId('b')).toHaveLength(1);
  });

  it('filters by sourceType', () => {
    const t = new ProvenanceTracker();
    t.track('a', 'orchestration');
    t.track('b', 'manual');
    expect(t.getBySourceType('orchestration')).toHaveLength(1);
  });

  it('builds parent chain', () => {
    const t = new ProvenanceTracker();
    const p1 = t.track('a', 'manual');
    const p2 = t.track('b', 'manual', p1.id);
    const p3 = t.track('c', 'manual', p2.id);
    const chain = t.getChain(p3.id);
    expect(chain).toHaveLength(3);
    expect(chain[0]?.sourceId).toBe('c');
    expect(chain[1]?.sourceId).toBe('b');
    expect(chain[2]?.sourceId).toBe('a');
  });

  it('stores to graph when provided', () => {
    const store = new GraphMemoryStore();
    const t = new ProvenanceTracker(store);
    t.track('s', 'orchestration');
    expect(store.provenances.length).toBe(1);
  });

  it('clears', () => {
    const t = new ProvenanceTracker();
    t.track('a', 'manual');
    t.clear();
    expect(t.count).toBe(0);
  });

  it('returns frozen records', () => {
    const t = new ProvenanceTracker();
    t.track('a', 'manual');
    expect(Object.isFrozen(t.records)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/*  ProvenanceChain                                                     */
/* ------------------------------------------------------------------ */
describe('ProvenanceChain', () => {
  it('creates chain tree from root', () => {
    const pc = new ProvenanceChain();
    const root = pc.buildTree('src_root', 'orchestration');
    expect(root.record.sourceId).toBe('src_root');
    expect(root.depth).toBe(0);
    expect(root.children).toEqual([]);
  });

  it('adds child links', () => {
    const pc = new ProvenanceChain();
    const root = pc.buildTree('parent', 'orchestration');
    const child = pc.addChild(root.record.id, 'child', 'manual');
    expect(child).toBeDefined();
    expect(child!.depth).toBe(1);
    expect(child!.record.parentId).toBe(root.record.id);
  });

  it('returns undefined when parent missing', () => {
    const pc = new ProvenanceChain();
    const child = pc.addChild('nope', 'child', 'manual');
    expect(child).toBeUndefined();
  });

  it('walks provenance chain', () => {
    const pc = new ProvenanceChain();
    const root = pc.buildTree('a', 'manual');
    const mid = pc.addChild(root.record.id, 'b', 'manual')!;
    const leaf = pc.addChild(mid.record.id, 'c', 'manual')!;
    const chain = pc.walk(leaf.record.id);
    expect(chain).toHaveLength(3);
    expect(chain[0]?.record.sourceId).toBe('c');
    expect(chain[2]?.record.sourceId).toBe('a');
  });

  it('builds DAG tree', () => {
    const pc = new ProvenanceChain();
    const root = pc.buildTree('root', 'orchestration');
    pc.addChild(root.record.id, 'child1', 'manual');
    pc.addChild(root.record.id, 'child2', 'manual');
    const dag = pc.toDag(root.record.id);
    expect(dag.depth).toBe(0);
    expect(dag.children).toHaveLength(2);
  });
});
