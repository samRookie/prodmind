import { describe, expect, it } from 'vitest';

import type { MemoryEntry, SemanticMemory, GraphMemory, MetricsMemory, EvolutionEvent, MemoryRelation } from '../contracts/memory-contracts.ts';
import { SemanticIndexer } from '../indexing/semantic-indexer.ts';
import { GraphIndexer } from '../indexing/graph-indexer.ts';
import { MetricsIndexer } from '../indexing/metrics-indexer.ts';
import { ChangeIndexer } from '../indexing/change-indexer.ts';
import { DependencyIndexer } from '../indexing/dependency-indexer.ts';

/* ------------------------------------------------------------------ */
/*  SemanticIndexer                                                     */
/* ------------------------------------------------------------------ */
describe('SemanticIndexer', () => {
  it('starts empty', () => {
    const idx = new SemanticIndexer();
    expect(idx.termCount).toBe(0);
  });

  it('indexEntry adds terms', () => {
    const idx = new SemanticIndexer();
    const entry: MemoryEntry = Object.freeze({
      id: 'e1',
      category: 'execution',
      timestamp: '2025-01-01T00:00:00Z',
      content: 'hello world',
      fingerprint: 'fp1',
      metadata: Object.freeze({ source: 'test' }),
      tags: Object.freeze(['alpha']),
      provenanceId: 'p1',
      parentId: '',
    });
    idx.indexEntry(entry);
    expect(idx.termCount).toBeGreaterThan(0);
  });

  it('indexSemantic adds concept', () => {
    const idx = new SemanticIndexer();
    const sem: SemanticMemory = Object.freeze({
      id: 's1',
      concept: 'machine learning',
      context: 'ml context',
      nodes: Object.freeze(['n1']),
      edges: Object.freeze(['e1']),
      fingerprint: 'fp-s1',
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.indexSemantic(sem);
    expect(idx.searchByConcept('MACHINE LEARNING')).toContain('s1');
  });

  it('searchByTerm finds entries case-insensitively', () => {
    const idx = new SemanticIndexer();
    const entry: MemoryEntry = Object.freeze({
      id: 'e2',
      category: 'execution',
      timestamp: '2025-01-01T00:00:00Z',
      content: 'Alpha Beta Gamma',
      fingerprint: 'fp2',
      metadata: Object.freeze({}),
      tags: Object.freeze([]),
      provenanceId: 'p1',
      parentId: '',
    });
    idx.indexEntry(entry);
    const results = idx.searchByTerm('alpha');
    expect(results).toHaveLength(1);
    expect(results[0]!.id).toBe('e2');
    expect(Object.isFrozen(results)).toBe(true);
  });

  it('searchByConcept returns ids', () => {
    const idx = new SemanticIndexer();
    const sem: SemanticMemory = Object.freeze({
      id: 's2',
      concept: 'deep learning',
      context: 'dl',
      nodes: Object.freeze(['n2']),
      edges: Object.freeze(['e2']),
      fingerprint: 'fp-s2',
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.indexSemantic(sem);
    const ids = idx.searchByConcept('DEEP LEARNING');
    expect(ids).toEqual(['s2']);
    expect(Object.isFrozen(ids)).toBe(true);
  });

  it('getTopTerms returns sorted entries', () => {
    const idx = new SemanticIndexer();
    const mkEntry = (id: string, content: string): MemoryEntry =>
      Object.freeze({
        id,
        category: 'execution' as const,
        timestamp: '2025-01-01T00:00:00Z',
        content,
        fingerprint: `fp-${id}`,
        metadata: Object.freeze({}),
        tags: Object.freeze([]),
        provenanceId: 'p1',
        parentId: '',
      });
    idx.indexEntry(mkEntry('e1', 'foo bar'));
    idx.indexEntry(mkEntry('e2', 'foo baz'));
    idx.indexEntry(mkEntry('e3', 'foo bar'));

    const top = idx.getTopTerms(2);
    expect(top).toHaveLength(2);
    expect(top[0]!.score).toBeGreaterThanOrEqual(top[1]!.score);
    expect(Object.isFrozen(top)).toBe(true);
    expect(Object.isFrozen(top[0]!.entryIds)).toBe(true);
  });

  it('clear resets', () => {
    const idx = new SemanticIndexer();
    const entry: MemoryEntry = Object.freeze({
      id: 'e-clear',
      category: 'execution',
      timestamp: '2025-01-01T00:00:00Z',
      content: 'something',
      fingerprint: 'fp-clr',
      metadata: Object.freeze({}),
      tags: Object.freeze([]),
      provenanceId: 'p1',
      parentId: '',
    });
    idx.indexEntry(entry);
    expect(idx.termCount).toBeGreaterThan(0);
    idx.clear();
    expect(idx.termCount).toBe(0);
  });

  it('searchByTerm is case-insensitive', () => {
    const idx = new SemanticIndexer();
    const entry: MemoryEntry = Object.freeze({
      id: 'e-ci',
      category: 'execution',
      timestamp: '2025-01-01T00:00:00Z',
      content: 'CaseInsensitive',
      fingerprint: 'fp-ci',
      metadata: Object.freeze({}),
      tags: Object.freeze([]),
      provenanceId: 'p1',
      parentId: '',
    });
    idx.indexEntry(entry);
    expect(idx.searchByTerm('CASEINSENSITIVE')).toHaveLength(1);
    expect(idx.searchByTerm('caseinsensitive')).toHaveLength(1);
    expect(idx.searchByTerm('CaseInsensitive')).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/*  GraphIndexer                                                        */
/* ------------------------------------------------------------------ */
describe('GraphIndexer', () => {
  it('starts empty', () => {
    const idx = new GraphIndexer();
    expect(idx.count).toBe(0);
  });

  it('index adds graph and getBySnapshot retrieves', () => {
    const idx = new GraphIndexer();
    const graph: GraphMemory = Object.freeze({
      id: 'g1',
      snapshotId: 'snap1',
      nodeCount: 10,
      edgeCount: 5,
      density: 0.05,
      sccCount: 2,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(graph);
    expect(idx.count).toBe(1);
    expect(idx.getBySnapshot('snap1')).toBe(graph);
    expect(idx.getBySnapshot('missing')).toBeUndefined();
  });

  it('getByDensity categorizes sparse < 0.1', () => {
    const idx = new GraphIndexer();
    const graph: GraphMemory = Object.freeze({
      id: 'g-sparse',
      snapshotId: 'snap-s',
      nodeCount: 10,
      edgeCount: 2,
      density: 0.05,
      sccCount: 1,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(graph);
    const sparse = idx.getByDensity('sparse');
    expect(sparse).toHaveLength(1);
    expect(sparse[0]!.id).toBe('g-sparse');
    expect(Object.isFrozen(sparse)).toBe(true);
  });

  it('getByDensity categorizes moderate < 0.4', () => {
    const idx = new GraphIndexer();
    const graph: GraphMemory = Object.freeze({
      id: 'g-moderate',
      snapshotId: 'snap-m',
      nodeCount: 10,
      edgeCount: 15,
      density: 0.25,
      sccCount: 2,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(graph);
    expect(idx.getByDensity('moderate')).toHaveLength(1);
    expect(idx.getByDensity('sparse')).toHaveLength(0);
  });

  it('getByDensity categorizes dense >= 0.4', () => {
    const idx = new GraphIndexer();
    const graph: GraphMemory = Object.freeze({
      id: 'g-dense',
      snapshotId: 'snap-d',
      nodeCount: 5,
      edgeCount: 10,
      density: 0.5,
      sccCount: 1,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(graph);
    expect(idx.getByDensity('dense')).toHaveLength(1);
  });

  it('getDensityTrend returns chronological order', () => {
    const idx = new GraphIndexer();
    const g1: GraphMemory = Object.freeze({
      id: 'g-t1',
      snapshotId: 'snap-t1',
      nodeCount: 5,
      edgeCount: 5,
      density: 0.2,
      sccCount: 1,
      timestamp: '2025-01-02T00:00:00Z',
    });
    const g2: GraphMemory = Object.freeze({
      id: 'g-t2',
      snapshotId: 'snap-t2',
      nodeCount: 6,
      edgeCount: 6,
      density: 0.3,
      sccCount: 1,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(g1);
    idx.index(g2);
    const trend = idx.getDensityTrend();
    expect(trend).toHaveLength(2);
    expect(trend[0]!.snapshotId).toBe('snap-t2');
    expect(trend[1]!.snapshotId).toBe('snap-t1');
    expect(Object.isFrozen(trend)).toBe(true);
  });

  it('getAll returns sorted by id', () => {
    const idx = new GraphIndexer();
    const g1: GraphMemory = Object.freeze({
      id: 'z-graph',
      snapshotId: 's1',
      nodeCount: 5,
      edgeCount: 5,
      density: 0.1,
      sccCount: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    const g2: GraphMemory = Object.freeze({
      id: 'a-graph',
      snapshotId: 's2',
      nodeCount: 5,
      edgeCount: 5,
      density: 0.1,
      sccCount: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(g1);
    idx.index(g2);
    const all = idx.getAll();
    expect(all).toHaveLength(2);
    expect(all[0]!.id).toBe('a-graph');
    expect(all[1]!.id).toBe('z-graph');
    expect(Object.isFrozen(all)).toBe(true);
  });

  it('clear resets', () => {
    const idx = new GraphIndexer();
    const graph: GraphMemory = Object.freeze({
      id: 'g-clr',
      snapshotId: 'snap-clr',
      nodeCount: 1,
      edgeCount: 0,
      density: 0,
      sccCount: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(graph);
    expect(idx.count).toBe(1);
    idx.clear();
    expect(idx.count).toBe(0);
    expect(idx.getBySnapshot('snap-clr')).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  MetricsIndexer                                                      */
/* ------------------------------------------------------------------ */
describe('MetricsIndexer', () => {
  it('starts empty', () => {
    const idx = new MetricsIndexer();
    expect(idx.metricCount).toBe(0);
  });

  it('index adds entry', () => {
    const idx = new MetricsIndexer();
    const metric: MetricsMemory = Object.freeze({
      id: 'm1',
      snapshotId: 'snap1',
      instability: 0.3,
      propagationRisk: 0.5,
      fanInAvg: 2,
      fanOutAvg: 3,
      volatility: 0.1,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(metric);
    expect(idx.metricCount).toBe(1);
  });

  it('getMetricHistory returns sorted by timestamp', () => {
    const idx = new MetricsIndexer();
    const m1: MetricsMemory = Object.freeze({
      id: 'metric-a',
      snapshotId: 's1',
      instability: 0.2,
      propagationRisk: 0.3,
      fanInAvg: 1,
      fanOutAvg: 2,
      volatility: 0.1,
      timestamp: '2025-01-02T00:00:00Z',
    });
    const m2: MetricsMemory = Object.freeze({
      id: 'metric-a',
      snapshotId: 's2',
      instability: 0.4,
      propagationRisk: 0.5,
      fanInAvg: 2,
      fanOutAvg: 3,
      volatility: 0.2,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(m1);
    idx.index(m2);
    const history = idx.getMetricHistory('metric-a');
    expect(history).toHaveLength(2);
    expect(history[0]!.snapshotId).toBe('s2');
    expect(history[1]!.snapshotId).toBe('s1');
    expect(Object.isFrozen(history)).toBe(true);
  });

  it('getBySnapshot finds entries', () => {
    const idx = new MetricsIndexer();
    const m1: MetricsMemory = Object.freeze({
      id: 'm-snap-a',
      snapshotId: 'ss1',
      instability: 0.1,
      propagationRisk: 0.2,
      fanInAvg: 1,
      fanOutAvg: 1,
      volatility: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    const m2: MetricsMemory = Object.freeze({
      id: 'm-snap-b',
      snapshotId: 'ss1',
      instability: 0.2,
      propagationRisk: 0.3,
      fanInAvg: 2,
      fanOutAvg: 2,
      volatility: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(m1);
    idx.index(m2);
    const found = idx.getBySnapshot('ss1');
    expect(found).toHaveLength(2);
    expect(Object.isFrozen(found)).toBe(true);

    const empty = idx.getBySnapshot('nonexistent');
    expect(empty).toHaveLength(0);
  });

  it('getTrend returns trend for >=2 points', () => {
    const idx = new MetricsIndexer();
    const m1: MetricsMemory = Object.freeze({
      id: 'trend-metric',
      snapshotId: 's1',
      instability: 0.1,
      propagationRisk: 0.2,
      fanInAvg: 1,
      fanOutAvg: 2,
      volatility: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    const m2: MetricsMemory = Object.freeze({
      id: 'trend-metric',
      snapshotId: 's2',
      instability: 0.3,
      propagationRisk: 0.4,
      fanInAvg: 1,
      fanOutAvg: 2,
      volatility: 0,
      timestamp: '2025-01-02T00:00:00Z',
    });
    idx.index(m1);
    idx.index(m2);
    const trend = idx.getTrend('trend-metric');
    expect(trend).toBeDefined();
    expect(trend!.metricName).toBe('trend-metric');
    expect(trend!.values).toHaveLength(2);
    expect(trend!.direction).toBe('increasing');
    expect(Object.isFrozen(trend)).toBe(true);
    expect(Object.isFrozen(trend!.values)).toBe(true);
  });

  it('getTrend returns undefined for <2 points', () => {
    const idx = new MetricsIndexer();
    const m: MetricsMemory = Object.freeze({
      id: 'single-metric',
      snapshotId: 's1',
      instability: 0.5,
      propagationRisk: 0.5,
      fanInAvg: 1,
      fanOutAvg: 1,
      volatility: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(m);
    expect(idx.getTrend('single-metric')).toBeUndefined();
    expect(idx.getTrend('nonexistent')).toBeUndefined();
  });

  it('getAllMetrics returns sorted keys', () => {
    const idx = new MetricsIndexer();
    const m1: MetricsMemory = Object.freeze({
      id: 'z-metric',
      snapshotId: 's1',
      instability: 0,
      propagationRisk: 0,
      fanInAvg: 0,
      fanOutAvg: 0,
      volatility: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    const m2: MetricsMemory = Object.freeze({
      id: 'a-metric',
      snapshotId: 's2',
      instability: 0,
      propagationRisk: 0,
      fanInAvg: 0,
      fanOutAvg: 0,
      volatility: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(m1);
    idx.index(m2);
    const keys = idx.getAllMetrics();
    expect(keys).toEqual(['a-metric', 'z-metric']);
    expect(Object.isFrozen(keys)).toBe(true);
  });

  it('clear resets', () => {
    const idx = new MetricsIndexer();
    const m: MetricsMemory = Object.freeze({
      id: 'm-clr',
      snapshotId: 's-clr',
      instability: 0,
      propagationRisk: 0,
      fanInAvg: 0,
      fanOutAvg: 0,
      volatility: 0,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.index(m);
    expect(idx.metricCount).toBe(1);
    idx.clear();
    expect(idx.metricCount).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/*  ChangeIndexer                                                       */
/* ------------------------------------------------------------------ */
describe('ChangeIndexer', () => {
  it('starts empty', () => {
    const idx = new ChangeIndexer();
    expect(idx.totalChanges).toBe(0);
  });

  it('recordChange creates ChangeRecord', () => {
    const idx = new ChangeIndexer();
    const entry: MemoryEntry = Object.freeze({
      id: 'entry-1',
      category: 'execution',
      timestamp: '2025-01-01T00:00:00Z',
      content: 'v1',
      fingerprint: 'fp-v1',
      metadata: Object.freeze({}),
      tags: Object.freeze([]),
      provenanceId: 'p1',
      parentId: '',
    });
    const record = idx.recordChange(entry, 'created');
    expect(record.entryId).toBe('entry-1');
    expect(record.changeType).toBe('created');
    expect(record.newFingerprint).toBe('fp-v1');
    expect(record.previousFingerprint).toBe('');
    expect(Object.isFrozen(record)).toBe(true);
  });

  it('getEntryChanges returns history', () => {
    const idx = new ChangeIndexer();
    const mkEntry = (id: string, content: string, ts: string, fp: string): MemoryEntry =>
      Object.freeze({
        id,
        category: 'execution' as const,
        timestamp: ts,
        content,
        fingerprint: fp,
        metadata: Object.freeze({}),
        tags: Object.freeze([]),
        provenanceId: 'p1',
        parentId: '',
      });

    idx.recordChange(mkEntry('e1', 'v1', '2025-01-01T00:00:00Z', 'fp1'), 'created');
    idx.recordChange(mkEntry('e1', 'v2', '2025-01-02T00:00:00Z', 'fp2'), 'modified');

    const changes = idx.getEntryChanges('e1');
    expect(changes).toHaveLength(2);
    expect(changes[0]!.changeType).toBe('created');
    expect(changes[1]!.changeType).toBe('modified');
    expect(Object.isFrozen(changes)).toBe(true);

    expect(idx.getEntryChanges('nonexistent')).toEqual([]);
  });

  it('getAllChanges returns sorted by timestamp', () => {
    const idx = new ChangeIndexer();
    const mkEntry = (id: string, content: string, ts: string, fp: string): MemoryEntry =>
      Object.freeze({
        id,
        category: 'execution' as const,
        timestamp: ts,
        content,
        fingerprint: fp,
        metadata: Object.freeze({}),
        tags: Object.freeze([]),
        provenanceId: 'p1',
        parentId: '',
      });

    idx.recordChange(mkEntry('e1', 'v1', '2025-01-03T00:00:00Z', 'fp1'), 'created');
    idx.recordChange(mkEntry('e2', 'v1', '2025-01-01T00:00:00Z', 'fp2'), 'created');

    const all = idx.getAllChanges();
    expect(all).toHaveLength(2);
    expect(all[0]!.entryId).toBe('e2');
    expect(all[1]!.entryId).toBe('e1');
    expect(Object.isFrozen(all)).toBe(true);
  });

  it('getChangesByType filters correctly', () => {
    const idx = new ChangeIndexer();
    const mkEntry = (id: string, content: string, ts: string, fp: string): MemoryEntry =>
      Object.freeze({
        id,
        category: 'execution' as const,
        timestamp: ts,
        content,
        fingerprint: fp,
        metadata: Object.freeze({}),
        tags: Object.freeze([]),
        provenanceId: 'p1',
        parentId: '',
      });

    idx.recordChange(mkEntry('e1', 'v1', '2025-01-01T00:00:00Z', 'fp1'), 'created');
    idx.recordChange(mkEntry('e1', 'v2', '2025-01-02T00:00:00Z', 'fp2'), 'modified');
    idx.recordChange(mkEntry('e2', 'v1', '2025-01-03T00:00:00Z', 'fp3'), 'created');

    const created = idx.getChangesByType('created');
    expect(created).toHaveLength(2);
    const modified = idx.getChangesByType('modified');
    expect(modified).toHaveLength(1);
    const deleted = idx.getChangesByType('deleted');
    expect(deleted).toHaveLength(0);
    expect(Object.isFrozen(created)).toBe(true);
  });

  it('recordEvolutionEvent and getEvolutionEvents', () => {
    const idx = new ChangeIndexer();
    const evt: EvolutionEvent = Object.freeze({
      id: 'evt-1',
      eventType: 'refactor',
      nodeId: 'n1',
      previousState: 'old',
      newState: 'new',
      timestamp: '2025-01-01T00:00:00Z',
      snapshotId: 'snap1',
    });
    idx.recordEvolutionEvent(evt);
    const events = idx.getEvolutionEvents();
    expect(events).toHaveLength(1);
    expect(events[0]!.id).toBe('evt-1');
    expect(Object.isFrozen(events)).toBe(true);
  });

  it('clear resets', () => {
    const idx = new ChangeIndexer();
    const entry: MemoryEntry = Object.freeze({
      id: 'e-clr',
      category: 'execution',
      timestamp: '2025-01-01T00:00:00Z',
      content: 'v1',
      fingerprint: 'fp-clr',
      metadata: Object.freeze({}),
      tags: Object.freeze([]),
      provenanceId: 'p1',
      parentId: '',
    });
    idx.recordChange(entry, 'created');
    idx.recordEvolutionEvent(
      Object.freeze({
        id: 'evt-clr',
        eventType: 'test',
        nodeId: 'n1',
        previousState: '',
        newState: '',
        timestamp: '2025-01-01T00:00:00Z',
        snapshotId: 's1',
      }),
    );
    expect(idx.totalChanges).toBe(1);
    idx.clear();
    expect(idx.totalChanges).toBe(0);
    expect(idx.getEvolutionEvents()).toHaveLength(0);
  });
});

/* ------------------------------------------------------------------ */
/*  DependencyIndexer                                                   */
/* ------------------------------------------------------------------ */
describe('DependencyIndexer', () => {
  it('starts empty', () => {
    const idx = new DependencyIndexer();
    expect(idx.relationCount).toBe(0);
  });

  it('indexRelation stores and getAllRelations returns', () => {
    const idx = new DependencyIndexer();
    const rel: MemoryRelation = Object.freeze({
      sourceId: 'a',
      targetId: 'b',
      relationType: 'imports',
      weight: 1,
      timestamp: '2025-01-01T00:00:00Z',
    });
    idx.indexRelation(rel);
    expect(idx.relationCount).toBe(1);
    const all = idx.getAllRelations();
    expect(all).toHaveLength(1);
    expect(all[0]!.sourceId).toBe('a');
    expect(Object.isFrozen(all)).toBe(true);
  });

  it('getDependencies returns outgoing targets', () => {
    const idx = new DependencyIndexer();
    idx.indexRelation(
      Object.freeze({ sourceId: 'a', targetId: 'b', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    idx.indexRelation(
      Object.freeze({ sourceId: 'a', targetId: 'c', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    const deps = idx.getDependencies('a');
    expect(deps).toEqual(['b', 'c']);
    expect(Object.isFrozen(deps)).toBe(true);
    expect(idx.getDependencies('missing')).toEqual([]);
  });

  it('getDependents returns incoming sources', () => {
    const idx = new DependencyIndexer();
    idx.indexRelation(
      Object.freeze({ sourceId: 'x', targetId: 'b', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    idx.indexRelation(
      Object.freeze({ sourceId: 'y', targetId: 'b', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    const deps = idx.getDependents('b');
    expect(deps).toEqual(['x', 'y']);
    expect(Object.isFrozen(deps)).toBe(true);
    expect(idx.getDependents('missing')).toEqual([]);
  });

  it('getFanIn counts incoming edges', () => {
    const idx = new DependencyIndexer();
    idx.indexRelation(
      Object.freeze({ sourceId: 'a', targetId: 'x', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    idx.indexRelation(
      Object.freeze({ sourceId: 'b', targetId: 'x', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    expect(idx.getFanIn('x')).toBe(2);
    expect(idx.getFanIn('missing')).toBe(0);
  });

  it('getFanOut counts outgoing edges', () => {
    const idx = new DependencyIndexer();
    idx.indexRelation(
      Object.freeze({ sourceId: 'a', targetId: 'x', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    idx.indexRelation(
      Object.freeze({ sourceId: 'a', targetId: 'y', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    expect(idx.getFanOut('a')).toBe(2);
    expect(idx.getFanOut('missing')).toBe(0);
  });

  it('getInstability calculates fanOut / (fanIn + fanOut)', () => {
    const idx = new DependencyIndexer();
    idx.indexRelation(
      Object.freeze({ sourceId: 'a', targetId: 'b', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    idx.indexRelation(
      Object.freeze({ sourceId: 'c', targetId: 'b', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    // b: fanIn=2, fanOut=0 => 0/(0+2)=0
    expect(idx.getInstability('b')).toBe(0);
    // a: fanIn=0, fanOut=1 => 1/(0+1)=1
    expect(idx.getInstability('a')).toBe(1);
  });

  it('getInstability returns 0 when total is 0', () => {
    const idx = new DependencyIndexer();
    expect(idx.getInstability('isolated')).toBe(0);
  });

  it('buildDependencyGraph returns graph with filtered edges', () => {
    const idx = new DependencyIndexer();
    idx.indexRelation(
      Object.freeze({ sourceId: 'a', targetId: 'b', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    idx.indexRelation(
      Object.freeze({ sourceId: 'a', targetId: 'c', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    idx.indexRelation(
      Object.freeze({ sourceId: 'c', targetId: 'd', relationType: 'imports', weight: 1, timestamp: '' }),
    );

    const graph = idx.buildDependencyGraph(['a', 'b', 'c']);
    expect(graph.nodeIds).toEqual(['a', 'b', 'c']);
    expect(graph.edges).toHaveLength(2);
    expect(graph.fanIn).toEqual({ a: 0, b: 1, c: 1 });
    expect(graph.fanOut).toEqual({ a: 2, b: 0, c: 1 });
    expect(Object.isFrozen(graph)).toBe(true);
    expect(Object.isFrozen(graph.nodeIds)).toBe(true);
    expect(Object.isFrozen(graph.edges)).toBe(true);
    expect(Object.isFrozen(graph.fanIn)).toBe(true);
    expect(Object.isFrozen(graph.fanOut)).toBe(true);
  });

  it('clear resets', () => {
    const idx = new DependencyIndexer();
    idx.indexRelation(
      Object.freeze({ sourceId: 'a', targetId: 'b', relationType: 'imports', weight: 1, timestamp: '' }),
    );
    expect(idx.relationCount).toBe(1);
    idx.clear();
    expect(idx.relationCount).toBe(0);
    expect(idx.getAllRelations()).toEqual([]);
    expect(idx.getDependencies('a')).toEqual([]);
    expect(idx.getDependents('b')).toEqual([]);
  });
});
