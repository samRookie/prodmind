import { describe, expect, it } from 'vitest';

import {
  createContextWindow,
  createContextWindowEntry,
  createMemoryRecord,
  createMemorySnapshot,
  createProvenanceRecord,
  createRetrievalQuery,
  createSemanticEdge,
  createSemanticNode,
  EDGE_RELATIONSHIPS,
  generateMemoryId,
  MEMORY_RECORD_CATEGORIES,
  PROVENANCE_SOURCE_TYPES,
  RETRIEVAL_STRATEGIES,
  SEMANTIC_NODE_TYPES,
} from '../contracts/index.ts';

describe('MemoryRecord', () => {
  it('creates a frozen record with all fields', () => {
    const record = createMemoryRecord({
      category: 'execution',
      payload: { result: 'ok', duration: 150 },
      metadata: { source: 'test' },
      provenanceId: 'prov_1',
      fingerprint: 'abc123',
    });
    expect(record.id).toBeTruthy();
    expect(record.category).toBe('execution');
    expect(record.payload).toEqual({ result: 'ok', duration: 150 });
    expect(record.metadata).toEqual({ source: 'test' });
    expect(record.provenanceId).toBe('prov_1');
    expect(record.fingerprint).toBe('abc123');
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.payload)).toBe(true);
    expect(Object.isFrozen(record.metadata)).toBe(true);
  });

  it('creates record with defaults', () => {
    const record = createMemoryRecord({ category: 'metrics' });
    expect(record.payload).toEqual({});
    expect(record.metadata).toEqual({});
    expect(record.provenanceId).toBe('');
    expect(record.fingerprint).toBe('');
  });

  it('supports all categories', () => {
    for (const cat of MEMORY_RECORD_CATEGORIES) {
      const r = createMemoryRecord({ category: cat });
      expect(r.category).toBe(cat);
    }
  });

  it('generates unique IDs', () => {
    const a = createMemoryRecord({ category: 'execution' });
    const b = createMemoryRecord({ category: 'execution' });
    expect(a.id).not.toBe(b.id);
  });
});

describe('SemanticNode', () => {
  it('creates a frozen node with all fields', () => {
    const node = createSemanticNode({
      type: 'service',
      label: 'AuthService',
      tags: ['critical', 'api'],
      properties: { version: '2.0' },
      fingerprints: ['fp1'],
    });
    expect(node.type).toBe('service');
    expect(node.label).toBe('AuthService');
    expect(node.tags).toEqual(['critical', 'api']);
    expect(node.properties).toEqual({ version: '2.0' });
    expect(node.fingerprints).toEqual(['fp1']);
    expect(Object.isFrozen(node)).toBe(true);
    expect(Object.isFrozen(node.tags)).toBe(true);
    expect(Object.isFrozen(node.properties)).toBe(true);
  });

  it('creates node with defaults', () => {
    const node = createSemanticNode({ type: 'file', label: 'index.ts' });
    expect(node.tags).toEqual([]);
    expect(node.properties).toEqual({});
    expect(node.fingerprints).toEqual([]);
  });

  it('supports all types', () => {
    for (const t of SEMANTIC_NODE_TYPES) {
      const n = createSemanticNode({ type: t, label: t });
      expect(n.type).toBe(t);
    }
  });
});

describe('SemanticEdge', () => {
  it('creates a frozen edge with all fields', () => {
    const edge = createSemanticEdge({
      sourceId: 'a', targetId: 'b', relationship: 'depends_on', weight: 2, provenanceRef: 'prov_1',
    });
    expect(edge.sourceId).toBe('a');
    expect(edge.targetId).toBe('b');
    expect(edge.relationship).toBe('depends_on');
    expect(edge.weight).toBe(2);
    expect(edge.provenanceRef).toBe('prov_1');
    expect(Object.isFrozen(edge)).toBe(true);
  });

  it('creates edge with defaults', () => {
    const edge = createSemanticEdge({ sourceId: 'x', targetId: 'y', relationship: 'references' });
    expect(edge.weight).toBe(1);
    expect(edge.provenanceRef).toBe('');
  });

  it('supports all relationships', () => {
    for (const rel of EDGE_RELATIONSHIPS) {
      const e = createSemanticEdge({ sourceId: 'a', targetId: 'b', relationship: rel });
      expect(e.relationship).toBe(rel);
    }
  });
});

describe('ContextWindow', () => {
  it('creates a frozen window with entries', () => {
    const entry = createContextWindowEntry({
      source: 'test', content: 'hello', tokenCount: 5, priority: 1, provenanceChain: ['prov_1'],
    });
    expect(entry.source).toBe('test');
    expect(entry.content).toBe('hello');
    expect(entry.tokenCount).toBe(5);
    expect(entry.priority).toBe(1);
    expect(entry.provenanceChain).toEqual(['prov_1']);
    expect(Object.isFrozen(entry)).toBe(true);

    const window = createContextWindow({
      entries: [entry], totalTokens: 5, budget: 100, overflow: false, provenance: ['prov_1'],
    });
    expect(window.entries).toHaveLength(1);
    expect(window.totalTokens).toBe(5);
    expect(window.budget).toBe(100);
    expect(window.overflow).toBe(false);
    expect(Object.isFrozen(window)).toBe(true);
    expect(Object.isFrozen(window.entries)).toBe(true);
  });

  it('creates empty window by default', () => {
    const w = createContextWindow({});
    expect(w.entries).toEqual([]);
    expect(w.totalTokens).toBe(0);
    expect(w.overflow).toBe(false);
  });
});

describe('RetrievalQuery', () => {
  it('creates a frozen query', () => {
    const q = createRetrievalQuery({
      seedIds: ['a', 'b'],
      maxDepth: 3, maxResults: 20,
      namespace: 'test',
      strategy: 'namespace',
      filterCategories: ['execution'],
      queryTerms: ['foo'],
    });
    expect(q.seedIds).toEqual(['a', 'b']);
    expect(q.maxDepth).toBe(3);
    expect(q.maxResults).toBe(20);
    expect(q.namespace).toBe('test');
    expect(q.strategy).toBe('namespace');
    expect(q.filterCategories).toEqual(['execution']);
    expect(q.queryTerms).toEqual(['foo']);
    expect(Object.isFrozen(q)).toBe(true);
    expect(Object.isFrozen(q.seedIds)).toBe(true);
  });

  it('creates query with defaults', () => {
    const q = createRetrievalQuery({ seedIds: ['x'] });
    expect(q.maxDepth).toBe(5);
    expect(q.maxResults).toBe(50);
    expect(q.strategy).toBe('hybrid');
    expect(q.filterCategories).toBeUndefined();
    expect(q.queryTerms).toBeUndefined();
  });

  it('supports all strategies', () => {
    for (const s of RETRIEVAL_STRATEGIES) {
      const q = createRetrievalQuery({ seedIds: ['a'], strategy: s });
      expect(q.strategy).toBe(s);
    }
  });
});

describe('ProvenanceRecord', () => {
  it('creates a frozen provenance record', () => {
    const p = createProvenanceRecord({
      sourceId: 'src_1', sourceType: 'orchestration',
      orchestrationId: 'orch_1', executionId: 'exec_1',
      fingerprint: 'fp1', parentId: 'parent_1',
    });
    expect(p.sourceId).toBe('src_1');
    expect(p.sourceType).toBe('orchestration');
    expect(p.orchestrationId).toBe('orch_1');
    expect(p.executionId).toBe('exec_1');
    expect(p.fingerprint).toBe('fp1');
    expect(p.parentId).toBe('parent_1');
    expect(Object.isFrozen(p)).toBe(true);
  });

  it('creates record with defaults', () => {
    const p = createProvenanceRecord({ sourceId: 's', sourceType: 'manual' });
    expect(p.orchestrationId).toBe('');
    expect(p.executionId).toBe('');
    expect(p.parentId).toBe('');
  });

  it('supports all source types', () => {
    for (const st of PROVENANCE_SOURCE_TYPES) {
      const p = createProvenanceRecord({ sourceId: 's', sourceType: st });
      expect(p.sourceType).toBe(st);
    }
  });
});

describe('MemorySnapshot', () => {
  it('creates a frozen snapshot', () => {
    const snap = createMemorySnapshot({
      version: '1.0', fingerprint: 'fp1', createdAt: 'now',
      records: [createMemoryRecord({ category: 'execution' })],
      nodes: [createSemanticNode({ type: 'file', label: 'f.ts' })],
      edges: [createSemanticEdge({ sourceId: 'a', targetId: 'b', relationship: 'depends_on' })],
      provenances: [createProvenanceRecord({ sourceId: 's', sourceType: 'replay' })],
    });
    expect(snap.version).toBe('1.0');
    expect(snap.fingerprint).toBe('fp1');
    expect(snap.records).toHaveLength(1);
    expect(snap.nodes).toHaveLength(1);
    expect(snap.edges).toHaveLength(1);
    expect(snap.provenances).toHaveLength(1);
    expect(Object.isFrozen(snap)).toBe(true);
    expect(Object.isFrozen(snap.records)).toBe(true);
  });

  it('creates empty snapshot by default', () => {
    const snap = createMemorySnapshot({});
    expect(snap.version).toBe('1.0');
    expect(snap.records).toEqual([]);
  });
});

describe('generateMemoryId', () => {
  it('generates sequential IDs', () => {
    const a = generateMemoryId('test');
    const b = generateMemoryId('test');
    expect(a).toMatch(/^test_\d+$/);
    expect(b).toMatch(/^test_\d+$/);
    expect(a).not.toBe(b);
  });
});
