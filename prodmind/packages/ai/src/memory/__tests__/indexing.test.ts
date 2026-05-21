import { describe, expect, it } from 'vitest';

import { createMemoryRecord, createSemanticNode } from '../contracts/memory-factories.ts';
import { DependencyIndex } from '../indexing/dependency-index.ts';
import { NamespaceIndex } from '../indexing/namespace-index.ts';
import { SemanticIndex } from '../indexing/semantic-index.ts';
import { TokenIndex } from '../indexing/token-index.ts';

/* ------------------------------------------------------------------ */
/*  SemanticIndex                                                       */
/* ------------------------------------------------------------------ */
describe('SemanticIndex', () => {
  it('starts empty', () => {
    const idx = new SemanticIndex();
    expect(idx.size).toBe(0);
    expect(idx.keyCount).toBe(0);
  });

  it('indexes records by key', () => {
    const idx = new SemanticIndex();
    const r = createMemoryRecord({ category: 'execution' });
    idx.indexRecord('foo', r);
    expect(idx.size).toBe(1);
    expect(idx.keyCount).toBe(1);
  });

  it('indexes nodes by key', () => {
    const idx = new SemanticIndex();
    const n = createSemanticNode({ type: 'service', label: 'S', id: 's1' });
    idx.indexNode('bar', n);
    expect(idx.size).toBe(1);
  });

  it('looks up entries by key', () => {
    const idx = new SemanticIndex();
    idx.indexRecord('k1', createMemoryRecord({ category: 'execution' }));
    idx.indexRecord('k1', createMemoryRecord({ category: 'provenance' as never }));
    expect(idx.lookup('k1')).toHaveLength(2);
    expect(idx.lookup('missing')).toEqual([]);
  });

  it('removes entries by refId', () => {
    const idx = new SemanticIndex();
    const r = createMemoryRecord({ category: 'execution' });
    idx.indexRecord('k1', r);
    expect(idx.remove(r.id)).toBe(1);
    expect(idx.size).toBe(0);
  });

  it('clears', () => {
    const idx = new SemanticIndex();
    idx.indexRecord('k1', createMemoryRecord({ category: 'execution' }));
    idx.clear();
    expect(idx.size).toBe(0);
  });

  it('returns all entries', () => {
    const idx = new SemanticIndex();
    idx.indexRecord('a', createMemoryRecord({ category: 'execution' }));
    idx.indexRecord('b', createMemoryRecord({ category: 'execution' }));
    expect(idx.entries()).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------ */
/*  TokenIndex                                                          */
/* ------------------------------------------------------------------ */
describe('TokenIndex', () => {
  it('indexes and looks up tokens', () => {
    const idx = new TokenIndex();
    const r = createMemoryRecord({ category: 'execution' });
    idx.indexRecord(r, ['hello', 'world']);
    expect(idx.lookup('hello')).toHaveLength(1);
    expect(idx.lookup('world')).toHaveLength(1);
    expect(idx.lookup('missing')).toEqual([]);
    expect(idx.size).toBe(2);
  });

  it('removes all entries for a refId', () => {
    const idx = new TokenIndex();
    const r = createMemoryRecord({ category: 'execution' });
    idx.indexRecord(r, ['a', 'b']);
    expect(idx.remove(r.id)).toBe(2);
    expect(idx.size).toBe(0);
  });

  it('clears', () => {
    const idx = new TokenIndex();
    idx.indexRecord(createMemoryRecord({ category: 'execution' }), ['a']);
    idx.clear();
    expect(idx.size).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  NamespaceIndex                                                      */
/* ------------------------------------------------------------------ */
describe('NamespaceIndex', () => {
  it('indexes records by namespace prefix', () => {
    const idx = new NamespaceIndex();
    const r = { ...createMemoryRecord({ category: 'execution' }), id: 'exec:123' };
    idx.indexRecord(r as never);
    expect(idx.lookup('exec')).toHaveLength(1);
  });

  it('indexes nodes by namespace prefix', () => {
    const idx = new NamespaceIndex();
    const n = createSemanticNode({ type: 'service', label: 'S', id: 'svc:db' });
    idx.indexNode(n);
    expect(idx.lookup('svc')).toHaveLength(1);
  });

  it('skips records without namespace separator', () => {
    const idx = new NamespaceIndex();
    const r = { ...createMemoryRecord({ category: 'execution' }), id: 'plain' };
    idx.indexRecord(r as never);
    expect(idx.lookup('plain')).toEqual([]);
    expect(idx.size).toBe(0);
  });

  it('removes and clears', () => {
    const idx = new NamespaceIndex();
    const r = { ...createMemoryRecord({ category: 'execution' }), id: 'ns:1' };
    idx.indexRecord(r as never);
    expect(idx.remove(r.id)).toBe(1);
    expect(idx.size).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  DependencyIndex                                                      */
/* ------------------------------------------------------------------ */
describe('DependencyIndex', () => {
  it('starts empty', () => {
    const idx = new DependencyIndex();
    expect(idx.size).toBe(0);
  });

  it('adds and retrieves forward dependencies', () => {
    const idx = new DependencyIndex();
    idx.addDependency('a', 'b');
    idx.addDependency('a', 'c');
    const deps = idx.getDependents('a');
    expect(deps).toHaveLength(2);
    expect(deps[0]?.to).toBe('b');
    expect(deps[1]?.to).toBe('c');
  });

  it('retrieves reverse dependencies', () => {
    const idx = new DependencyIndex();
    idx.addDependency('a', 'b');
    idx.addDependency('c', 'b');
    const deps = idx.getDependencies('b');
    expect(deps).toHaveLength(2);
  });

  it('checks specific dependency existence', () => {
    const idx = new DependencyIndex();
    idx.addDependency('a', 'b');
    expect(idx.hasDependency('a', 'b')).toBe(true);
    expect(idx.hasDependency('b', 'a')).toBe(false);
  });

  it('removes all edges for an id', () => {
    const idx = new DependencyIndex();
    idx.addDependency('a', 'b');
    idx.addDependency('a', 'c');
    expect(idx.remove('a')).toBe(2);
    expect(idx.size).toBe(0);
    expect(idx.getDependents('a')).toEqual([]);
  });

  it('clears', () => {
    const idx = new DependencyIndex();
    idx.addDependency('a', 'b');
    idx.clear();
    expect(idx.size).toBe(0);
  });

  it('returns frozen arrays', () => {
    const idx = new DependencyIndex();
    idx.addDependency('a', 'b');
    expect(Object.isFrozen(idx.getDependents('a'))).toBe(true);
    expect(Object.isFrozen(idx.getDependencies('b'))).toBe(true);
  });
});
