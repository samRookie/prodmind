import { describe, expect, it } from 'vitest';

import { SemanticMemoryStore } from '../repository/semantic-memory.ts';
import { GraphMemoryStoreRepo } from '../repository/graph-memory.ts';
import { MetricsMemoryStore } from '../repository/metrics-memory.ts';
import { ReasoningMemoryStore } from '../repository/reasoning-memory.ts';
import { SnapshotMemory } from '../repository/snapshot-memory.ts';
import { MemoryRepository } from '../repository/memory-repository.ts';

/* ------------------------------------------------------------------ */
/*  SemanticMemoryStore                                                */
/* ------------------------------------------------------------------ */
describe('SemanticMemoryStore', () => {
  it('starts empty', () => {
    const s = new SemanticMemoryStore();
    expect(s.count).toBe(0);
    expect(s.getAll()).toEqual([]);
  });

  it('stores and retrieves by id', () => {
    const s = new SemanticMemoryStore();
    const entry = Object.freeze({ id: 'sem_1', concept: 'service', context: 'user-auth', nodes: [], edges: [], fingerprint: 'fp1', timestamp: '' });
    s.store(entry);
    expect(s.count).toBe(1);
    expect(s.get('sem_1')).toBe(entry);
    expect(s.get('missing')).toBeUndefined();
  });

  it('stores and retrieves by concept', () => {
    const s = new SemanticMemoryStore();
    const e1 = Object.freeze({ id: 'sem_1', concept: 'service', context: 'auth', nodes: [], edges: [], fingerprint: 'fp1', timestamp: '' });
    const e2 = Object.freeze({ id: 'sem_2', concept: 'service', context: 'db', nodes: [], edges: [], fingerprint: 'fp2', timestamp: '' });
    s.store(e1);
    s.store(e2);
    const results = s.getByConcept('service');
    expect(results).toHaveLength(2);
    expect(results[0]!.id).toBe('sem_1');
  });

  it('getByConcept returns empty for unknown concept', () => {
    const s = new SemanticMemoryStore();
    expect(s.getByConcept('unknown')).toEqual([]);
  });

  it('search matches concept and context', () => {
    const s = new SemanticMemoryStore();
    s.store(Object.freeze({ id: 's1', concept: 'database', context: 'postgres connection', nodes: [], edges: [], fingerprint: 'fp1', timestamp: '' }));
    s.store(Object.freeze({ id: 's2', concept: 'service', context: 'api gateway', nodes: [], edges: [], fingerprint: 'fp2', timestamp: '' }));
    const results = s.search('database');
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('s1');
    const both = s.search('connection');
    expect(both).toHaveLength(1);
  });

  it('search is case-insensitive', () => {
    const s = new SemanticMemoryStore();
    s.store(Object.freeze({ id: 's1', concept: 'DataBase', context: '', nodes: [], edges: [], fingerprint: 'fp1', timestamp: '' }));
    expect(s.search('database')).toHaveLength(1);
  });

  it('search returns results sorted by id', () => {
    const s = new SemanticMemoryStore();
    s.store(Object.freeze({ id: 'z_last', concept: 'aaa', context: '', nodes: [], edges: [], fingerprint: 'fp1', timestamp: '' }));
    s.store(Object.freeze({ id: 'a_first', concept: 'aaa', context: '', nodes: [], edges: [], fingerprint: 'fp2', timestamp: '' }));
    const r = s.search('aaa');
    expect(r[0]!.id).toBe('a_first');
    expect(r[1]!.id).toBe('z_last');
  });

  it('getAll returns frozen sorted array', () => {
    const s = new SemanticMemoryStore();
    s.store(Object.freeze({ id: 'b', concept: 'x', context: '', nodes: [], edges: [], fingerprint: 'fp1', timestamp: '' }));
    s.store(Object.freeze({ id: 'a', concept: 'x', context: '', nodes: [], edges: [], fingerprint: 'fp2', timestamp: '' }));
    const all = s.getAll();
    expect(all).toHaveLength(2);
    expect(all[0]!.id).toBe('a');
    expect(Object.isFrozen(all)).toBe(true);
  });

  it('clear removes all', () => {
    const s = new SemanticMemoryStore();
    s.store(Object.freeze({ id: 'sem_1', concept: 'x', context: '', nodes: [], edges: [], fingerprint: 'fp1', timestamp: '' }));
    s.clear();
    expect(s.count).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  GraphMemoryStoreRepo                                               */
/* ------------------------------------------------------------------ */
describe('GraphMemoryStoreRepo', () => {
  it('starts empty', () => {
    const g = new GraphMemoryStoreRepo();
    expect(g.count).toBe(0);
  });

  it('stores and retrieves by id', () => {
    const g = new GraphMemoryStoreRepo();
    const entry = Object.freeze({ id: 'gm_1', snapshotId: 'snap_1', nodeCount: 10, edgeCount: 5, density: 0.5, sccCount: 2, timestamp: '2024-01-01' });
    g.store(entry);
    expect(g.get('gm_1')).toBe(entry);
  });

  it('getBySnapshot returns matching entries', () => {
    const g = new GraphMemoryStoreRepo();
    g.store(Object.freeze({ id: 'g1', snapshotId: 's1', nodeCount: 1, edgeCount: 1, density: 0.1, sccCount: 0, timestamp: '' }));
    g.store(Object.freeze({ id: 'g2', snapshotId: 's1', nodeCount: 2, edgeCount: 2, density: 0.2, sccCount: 0, timestamp: '' }));
    g.store(Object.freeze({ id: 'g3', snapshotId: 's2', nodeCount: 3, edgeCount: 3, density: 0.3, sccCount: 0, timestamp: '' }));
    const s1results = g.getBySnapshot('s1');
    expect(s1results).toHaveLength(2);
    expect(g.getBySnapshot('missing')).toEqual([]);
  });

  it('getLatest returns the most recent entry', () => {
    const g = new GraphMemoryStoreRepo();
    g.store(Object.freeze({ id: 'g1', snapshotId: 's1', nodeCount: 1, edgeCount: 1, density: 0.1, sccCount: 0, timestamp: '2023-01-01' }));
    g.store(Object.freeze({ id: 'g2', snapshotId: 's2', nodeCount: 2, edgeCount: 2, density: 0.2, sccCount: 0, timestamp: '2024-01-01' }));
    const latest = g.getLatest();
    expect(latest!.id).toBe('g2');
  });

  it('getLatest returns undefined when empty', () => {
    const g = new GraphMemoryStoreRepo();
    expect(g.getLatest()).toBeUndefined();
  });

  it('getAll returns frozen sorted array', () => {
    const g = new GraphMemoryStoreRepo();
    g.store(Object.freeze({ id: 'g2', snapshotId: 's1', nodeCount: 1, edgeCount: 1, density: 0.1, sccCount: 0, timestamp: '' }));
    g.store(Object.freeze({ id: 'g1', snapshotId: 's2', nodeCount: 2, edgeCount: 2, density: 0.2, sccCount: 0, timestamp: '' }));
    const all = g.getAll();
    expect(all[0]!.id).toBe('g1');
    expect(Object.isFrozen(all)).toBe(true);
  });

  it('clear removes all', () => {
    const g = new GraphMemoryStoreRepo();
    g.store(Object.freeze({ id: 'g1', snapshotId: 's1', nodeCount: 1, edgeCount: 1, density: 0.1, sccCount: 0, timestamp: '' }));
    g.clear();
    expect(g.count).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  MetricsMemoryStore                                                 */
/* ------------------------------------------------------------------ */
describe('MetricsMemoryStore', () => {
  it('starts empty', () => {
    const m = new MetricsMemoryStore();
    expect(m.count).toBe(0);
  });

  it('stores and retrieves by id', () => {
    const m = new MetricsMemoryStore();
    const entry = Object.freeze({ id: 'mm_1', snapshotId: 's1', instability: 0.5, propagationRisk: 0.3, fanInAvg: 2, fanOutAvg: 3, volatility: 0.1, timestamp: '' });
    m.store(entry);
    expect(m.get('mm_1')).toBe(entry);
  });

  it('getBySnapshot returns matching entries', () => {
    const m = new MetricsMemoryStore();
    m.store(Object.freeze({ id: 'm1', snapshotId: 's1', instability: 0.1, propagationRisk: 0.1, fanInAvg: 1, fanOutAvg: 1, volatility: 0.1, timestamp: '' }));
    m.store(Object.freeze({ id: 'm2', snapshotId: 's1', instability: 0.2, propagationRisk: 0.2, fanInAvg: 2, fanOutAvg: 2, volatility: 0.2, timestamp: '' }));
    expect(m.getBySnapshot('s1')).toHaveLength(2);
  });

  it('getLatest returns most recent by timestamp', () => {
    const m = new MetricsMemoryStore();
    m.store(Object.freeze({ id: 'm1', snapshotId: 's1', instability: 0.1, propagationRisk: 0.1, fanInAvg: 1, fanOutAvg: 1, volatility: 0.1, timestamp: '2023-01-01' }));
    m.store(Object.freeze({ id: 'm2', snapshotId: 's2', instability: 0.5, propagationRisk: 0.5, fanInAvg: 5, fanOutAvg: 5, volatility: 0.5, timestamp: '2024-01-01' }));
    expect(m.getLatest()!.id).toBe('m2');
  });

  it('getMetricHistory filters by name pattern in id', () => {
    const m = new MetricsMemoryStore();
    m.store(Object.freeze({ id: 'instability_s1', snapshotId: 's1', instability: 0.1, propagationRisk: 0.1, fanInAvg: 1, fanOutAvg: 1, volatility: 0.1, timestamp: '2023-01-01' }));
    m.store(Object.freeze({ id: 'instability_s2', snapshotId: 's2', instability: 0.2, propagationRisk: 0.1, fanInAvg: 1, fanOutAvg: 1, volatility: 0.1, timestamp: '2024-01-01' }));
    m.store(Object.freeze({ id: 'propagation_s1', snapshotId: 's1', instability: 0.1, propagationRisk: 0.3, fanInAvg: 1, fanOutAvg: 1, volatility: 0.1, timestamp: '2023-01-01' }));
    const history = m.getMetricHistory('instability');
    expect(history).toHaveLength(2);
    expect(history[0]!.timestamp).toBe('2023-01-01');
    expect(history[1]!.timestamp).toBe('2024-01-01');
  });

  it('getAll returns frozen sorted array', () => {
    const m = new MetricsMemoryStore();
    m.store(Object.freeze({ id: 'b', snapshotId: 's1', instability: 0.1, propagationRisk: 0.1, fanInAvg: 1, fanOutAvg: 1, volatility: 0.1, timestamp: '' }));
    m.store(Object.freeze({ id: 'a', snapshotId: 's2', instability: 0.2, propagationRisk: 0.2, fanInAvg: 2, fanOutAvg: 2, volatility: 0.2, timestamp: '' }));
    expect(m.getAll()[0]!.id).toBe('a');
    expect(Object.isFrozen(m.getAll())).toBe(true);
  });

  it('clear removes all', () => {
    const m = new MetricsMemoryStore();
    m.store(Object.freeze({ id: 'm1', snapshotId: 's1', instability: 0.1, propagationRisk: 0.1, fanInAvg: 1, fanOutAvg: 1, volatility: 0.1, timestamp: '' }));
    m.clear();
    expect(m.count).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  ReasoningMemoryStore                                               */
/* ------------------------------------------------------------------ */
describe('ReasoningMemoryStore', () => {
  it('starts empty', () => {
    const r = new ReasoningMemoryStore();
    expect(r.count).toBe(0);
  });

  it('stores and retrieves by id', () => {
    const r = new ReasoningMemoryStore();
    const entry = Object.freeze({ id: 'rm_1', chainId: 'chain_1', chainType: 'architectural_drift', conclusion: 'test', evidenceIds: ['e1'], confidence: 0.8, timestamp: '' });
    r.store(entry);
    expect(r.get('rm_1')).toBe(entry);
  });

  it('getByChainType filters correctly', () => {
    const r = new ReasoningMemoryStore();
    r.store(Object.freeze({ id: 'r1', chainId: 'c1', chainType: 'architectural_drift', conclusion: 'a', evidenceIds: [], confidence: 0.5, timestamp: '' }));
    r.store(Object.freeze({ id: 'r2', chainId: 'c2', chainType: 'dependency_impact', conclusion: 'b', evidenceIds: [], confidence: 0.6, timestamp: '' }));
    expect(r.getByChainType('architectural_drift')).toHaveLength(1);
    expect(r.getByChainType('unknown')).toEqual([]);
  });

  it('getByEvidenceId finds entries containing evidence', () => {
    const r = new ReasoningMemoryStore();
    r.store(Object.freeze({ id: 'r1', chainId: 'c1', chainType: 'test', conclusion: 'a', evidenceIds: ['ev_1', 'ev_2'], confidence: 0.5, timestamp: '' }));
    r.store(Object.freeze({ id: 'r2', chainId: 'c2', chainType: 'test', conclusion: 'b', evidenceIds: ['ev_2'], confidence: 0.6, timestamp: '' }));
    const results = r.getByEvidenceId('ev_1');
    expect(results).toHaveLength(1);
    expect(r.getByEvidenceId('missing')).toEqual([]);
  });

  it('getAll returns frozen sorted array', () => {
    const r = new ReasoningMemoryStore();
    r.store(Object.freeze({ id: 'b', chainId: 'c1', chainType: 'test', conclusion: 'x', evidenceIds: [], confidence: 0.5, timestamp: '' }));
    r.store(Object.freeze({ id: 'a', chainId: 'c2', chainType: 'test', conclusion: 'x', evidenceIds: [], confidence: 0.5, timestamp: '' }));
    expect(r.getAll()[0]!.id).toBe('a');
    expect(Object.isFrozen(r.getAll())).toBe(true);
  });

  it('clear removes all', () => {
    const r = new ReasoningMemoryStore();
    r.store(Object.freeze({ id: 'r1', chainId: 'c1', chainType: 'test', conclusion: 'x', evidenceIds: [], confidence: 0.5, timestamp: '' }));
    r.clear();
    expect(r.count).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  SnapshotMemory                                                     */
/* ------------------------------------------------------------------ */
describe('SnapshotMemory', () => {
  it('starts empty', () => {
    const s = new SnapshotMemory();
    expect(s.count).toBe(0);
  });

  it('stores and retrieves snapshot records', () => {
    const s = new SnapshotMemory();
    const snap = Object.freeze({ version: '1.0', fingerprint: 'fp1', createdAt: '', records: Object.freeze([]), nodes: Object.freeze([]), edges: Object.freeze([]), provenances: Object.freeze([]) });
    const record = s.store('snap_1', snap);
    expect(record.id).toBe('snap_1');
    expect(record.snapshot.fingerprint).toBe('fp1');
    expect(Object.isFrozen(record)).toBe(true);
    expect(s.get('snap_1')).toBe(record);
    expect(s.get('missing')).toBeUndefined();
  });

  it('tracks parent-child lineage', () => {
    const s = new SnapshotMemory();
    const snap = Object.freeze({ version: '1.0', fingerprint: '', createdAt: '', records: Object.freeze([]), nodes: Object.freeze([]), edges: Object.freeze([]), provenances: Object.freeze([]) });
    s.store('parent', snap);
    s.store('child1', snap, 'parent');
    s.store('child2', snap, 'parent');
    const children = s.getChildren('parent');
    expect(children).toHaveLength(2);
    expect(children.map(c => c.id).sort()).toEqual(['child1', 'child2']);
  });

  it('getChildren returns empty for unknown parent', () => {
    const s = new SnapshotMemory();
    expect(s.getChildren('unknown')).toEqual([]);
  });

  it('getAncestors walks the parent chain', () => {
    const s = new SnapshotMemory();
    const snap = Object.freeze({ version: '1.0', fingerprint: '', createdAt: '', records: Object.freeze([]), nodes: Object.freeze([]), edges: Object.freeze([]), provenances: Object.freeze([]) });
    s.store('root', snap);
    s.store('child', snap, 'root');
    s.store('grandchild', snap, 'child');
    const ancestors = s.getAncestors('grandchild');
    expect(ancestors).toHaveLength(2);
    expect(ancestors[0]!.id).toBe('child');
    expect(ancestors[1]!.id).toBe('root');
  });

  it('getAncestors returns empty for root nodes', () => {
    const s = new SnapshotMemory();
    const snap = Object.freeze({ version: '1.0', fingerprint: '', createdAt: '', records: Object.freeze([]), nodes: Object.freeze([]), edges: Object.freeze([]), provenances: Object.freeze([]) });
    s.store('root', snap);
    expect(s.getAncestors('root')).toEqual([]);
  });

  it('getAncestors returns empty for unknown id', () => {
    const s = new SnapshotMemory();
    expect(s.getAncestors('unknown')).toEqual([]);
  });

  it('getByTimeRange filters correctly', () => {
    const s = new SnapshotMemory();
    const snap = Object.freeze({ version: '1.0', fingerprint: '', createdAt: '', records: Object.freeze([]), nodes: Object.freeze([]), edges: Object.freeze([]), provenances: Object.freeze([]) });
    const r1 = s.store('a', snap);
    const r2 = s.store('b', snap);
    const range = s.getByTimeRange(r1.timestamp, r2.timestamp);
    expect(range).toHaveLength(2);
    expect(s.getByTimeRange(0, 0)).toEqual([]);
  });

  it('getLatest returns n most recent', () => {
    const s = new SnapshotMemory();
    const snap = Object.freeze({ version: '1.0', fingerprint: '', createdAt: '', records: Object.freeze([]), nodes: Object.freeze([]), edges: Object.freeze([]), provenances: Object.freeze([]) });
    s.store('a', snap);
    s.store('b', snap);
    s.store('c', snap);
    const latest = s.getLatest(2);
    expect(latest).toHaveLength(2);
  });

  it('getAllVersions returns all sorted by timestamp', () => {
    const s = new SnapshotMemory();
    const snap = Object.freeze({ version: '1.0', fingerprint: '', createdAt: '', records: Object.freeze([]), nodes: Object.freeze([]), edges: Object.freeze([]), provenances: Object.freeze([]) });
    s.store('a', snap);
    s.store('b', snap);
    expect(s.getAllVersions()).toHaveLength(2);
  });

  it('delete removes a snapshot', () => {
    const s = new SnapshotMemory();
    const snap = Object.freeze({ version: '1.0', fingerprint: '', createdAt: '', records: Object.freeze([]), nodes: Object.freeze([]), edges: Object.freeze([]), provenances: Object.freeze([]) });
    s.store('snap_1', snap);
    expect(s.delete('snap_1')).toBe(true);
    expect(s.get('snap_1')).toBeUndefined();
    expect(s.delete('missing')).toBe(false);
  });

  it('clear removes all', () => {
    const s = new SnapshotMemory();
    const snap = Object.freeze({ version: '1.0', fingerprint: '', createdAt: '', records: Object.freeze([]), nodes: Object.freeze([]), edges: Object.freeze([]), provenances: Object.freeze([]) });
    s.store('a', snap);
    s.clear();
    expect(s.count).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  MemoryRepository                                                   */
/* ------------------------------------------------------------------ */
describe('MemoryRepository', () => {
  it('starts empty with all sub-stores', () => {
    const r = new MemoryRepository();
    expect(r.entryCount).toBe(0);
    expect(r.findingCount).toBe(0);
    expect(r.snapshots.count).toBe(0);
    expect(r.semantic.count).toBe(0);
    expect(r.graph.count).toBe(0);
    expect(r.metrics.count).toBe(0);
    expect(r.reasoning.count).toBe(0);
  });

  it('stores and retrieves entries', () => {
    const r = new MemoryRepository();
    const entry: import('../contracts/memory-contracts.ts').MemoryEntry = Object.freeze({
      id: 'entry_1', category: 'execution', timestamp: '', content: 'test', fingerprint: 'fp1',
      metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '',
    });
    r.storeEntry(entry);
    expect(r.entryCount).toBe(1);
    expect(r.getEntry('entry_1')).toBe(entry);
    expect(r.getEntry('missing')).toBeUndefined();
  });

  it('getEntries returns multiple by id', () => {
    const r = new MemoryRepository();
    const e1: import('../contracts/memory-contracts.ts').MemoryEntry = Object.freeze({ id: 'e1', category: 'execution', timestamp: '', content: 'a', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' });
    const e2: import('../contracts/memory-contracts.ts').MemoryEntry = Object.freeze({ id: 'e2', category: 'execution', timestamp: '', content: 'b', fingerprint: 'fp2', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' });
    r.storeEntry(e1);
    r.storeEntry(e2);
    const results = r.getEntries(['e1', 'e2', 'missing']);
    expect(results).toHaveLength(2);
    expect(Object.isFrozen(results)).toBe(true);
  });

  it('getAllEntries returns sorted entries', () => {
    const r = new MemoryRepository();
    const e2: import('../contracts/memory-contracts.ts').MemoryEntry = Object.freeze({ id: 'z_entry', category: 'execution', timestamp: '', content: 'b', fingerprint: 'fp2', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' });
    const e1: import('../contracts/memory-contracts.ts').MemoryEntry = Object.freeze({ id: 'a_entry', category: 'execution', timestamp: '', content: 'a', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' });
    r.storeEntry(e2);
    r.storeEntry(e1);
    const all = r.getAllEntries();
    expect(all[0]!.id).toBe('a_entry');
  });

  it('getEntriesByCategory filters correctly', () => {
    const r = new MemoryRepository();
    const e1: import('../contracts/memory-contracts.ts').MemoryEntry = Object.freeze({ id: 'e1', category: 'execution', timestamp: '', content: 'a', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' });
    const e2: import('../contracts/memory-contracts.ts').MemoryEntry = Object.freeze({ id: 'e2', category: 'architectural', timestamp: '', content: 'b', fingerprint: 'fp2', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' });
    r.storeEntry(e1);
    r.storeEntry(e2);
    const execEntries = r.getEntriesByCategory('execution');
    expect(execEntries).toHaveLength(1);
    expect(execEntries[0]!.id).toBe('e1');
  });

  it('stores and retrieves findings', () => {
    const r = new MemoryRepository();
    const finding: import('../contracts/memory-contracts.ts').ArchitecturalFinding = Object.freeze({
      id: 'find_1', findingType: 'drift', label: 'label', description: 'desc', severity: 'warning',
      affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp1',
    });
    r.storeFinding(finding);
    expect(r.findingCount).toBe(1);
    expect(r.getFinding('find_1')).toBe(finding);
  });

  it('getAllFindings returns sorted findings', () => {
    const r = new MemoryRepository();
    const f2: import('../contracts/memory-contracts.ts').ArchitecturalFinding = Object.freeze({ id: 'z_find', findingType: 'drift', label: 'b', description: 'd', severity: 'info', affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp2' });
    const f1: import('../contracts/memory-contracts.ts').ArchitecturalFinding = Object.freeze({ id: 'a_find', findingType: 'drift', label: 'a', description: 'd', severity: 'info', affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp1' });
    r.storeFinding(f2);
    r.storeFinding(f1);
    expect(r.getAllFindings()[0]!.id).toBe('a_find');
  });

  it('getFindingsByType filters correctly', () => {
    const r = new MemoryRepository();
    const f1: import('../contracts/memory-contracts.ts').ArchitecturalFinding = Object.freeze({ id: 'f1', findingType: 'drift', label: 'a', description: 'd', severity: 'info', affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp1' });
    const f2: import('../contracts/memory-contracts.ts').ArchitecturalFinding = Object.freeze({ id: 'f2', findingType: 'hotspot', label: 'b', description: 'd', severity: 'info', affectedNodeIds: Object.freeze([]), dependencies: Object.freeze([]), timestamp: '', fingerprint: 'fp2' });
    r.storeFinding(f1);
    r.storeFinding(f2);
    expect(r.getFindingsByType('drift')).toHaveLength(1);
  });

  it('getEntryHistory returns insertion order', () => {
    const r = new MemoryRepository();
    const e1: import('../contracts/memory-contracts.ts').MemoryEntry = Object.freeze({ id: 'e1', category: 'execution', timestamp: '', content: 'a', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' });
    const e2: import('../contracts/memory-contracts.ts').MemoryEntry = Object.freeze({ id: 'e2', category: 'execution', timestamp: '', content: 'b', fingerprint: 'fp2', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' });
    r.storeEntry(e1);
    r.storeEntry(e2);
    expect(r.getEntryHistory()).toEqual(['e1', 'e2']);
    expect(Object.isFrozen(r.getEntryHistory())).toBe(true);
  });

  it('computeRepositoryFingerprint returns deterministic hash', () => {
    const r = new MemoryRepository();
    const e1: import('../contracts/memory-contracts.ts').MemoryEntry = Object.freeze({ id: 'e1', category: 'execution', timestamp: '', content: 'a', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' });
    r.storeEntry(e1);
    const fp1 = r.computeRepositoryFingerprint();
    const fp2 = r.computeRepositoryFingerprint();
    expect(fp1).toBe(fp2);
    expect(fp1.length).toBe(64);
  });

  it('clear resets all stores', () => {
    const r = new MemoryRepository();
    const e1: import('../contracts/memory-contracts.ts').MemoryEntry = Object.freeze({ id: 'e1', category: 'execution', timestamp: '', content: 'a', fingerprint: 'fp1', metadata: Object.freeze({}), tags: Object.freeze([]), provenanceId: '', parentId: '' });
    const snap = Object.freeze({ version: '1.0', fingerprint: '', createdAt: '', records: Object.freeze([]), nodes: Object.freeze([]), edges: Object.freeze([]), provenances: Object.freeze([]) });
    r.storeEntry(e1);
    r.snapshots.store('s1', snap);
    r.clear();
    expect(r.entryCount).toBe(0);
    expect(r.findingCount).toBe(0);
    expect(r.snapshots.count).toBe(0);
    expect(r.semantic.count).toBe(0);
    expect(r.graph.count).toBe(0);
    expect(r.metrics.count).toBe(0);
    expect(r.reasoning.count).toBe(0);
  });
});
