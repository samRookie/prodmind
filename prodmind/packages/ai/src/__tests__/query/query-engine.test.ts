import { describe, it, expect } from 'vitest';
import { QueryEngine } from '../../query/query-engine.ts';
import type { QueryContext } from '../../query/query-types.ts';

const baseContext: QueryContext = {
  nodes: [
    { id: 'n1', type: 'module', name: 'core', subsystem: 'engine', namespace: 'core' },
    { id: 'n2', type: 'module', name: 'utils', subsystem: 'engine', namespace: 'utils' },
    { id: 'n3', type: 'module', name: 'api', subsystem: 'server', namespace: 'api' },
  ],
  edges: [
    { sourceId: 'n1', targetId: 'n2', type: 'depends' },
    { sourceId: 'n2', targetId: 'n3', type: 'depends' },
  ],
  risks: [{ riskType: 'STABILITY_RISK', severity: 'CRITICAL', normalizedScore: 0.85, impactedNodes: ['n1'] }],
};

describe('QueryEngine', () => {
  it('executes NODE_QUERY', () => {
    const engine = new QueryEngine();
    const result = engine.query({ type: 'NODE_QUERY' }, baseContext);
    expect(result.data).toHaveLength(3);
    expect(result.total).toBe(3);
  });

  it('filters by field', () => {
    const engine = new QueryEngine();
    const result = engine.query({ type: 'NODE_QUERY', filters: [{ field: 'subsystem', comparator: 'EQ', value: 'engine' }] }, baseContext);
    expect(result.data).toHaveLength(2);
  });

  it('uses cache for repeated queries', () => {
    const engine = new QueryEngine();
    const a = engine.query({ type: 'NODE_QUERY' }, baseContext);
    const b = engine.query({ type: 'NODE_QUERY' }, baseContext);
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it('executes RISK_QUERY', () => {
    const engine = new QueryEngine();
    const result = engine.query({ type: 'RISK_QUERY' }, baseContext);
    expect(result.data).toHaveLength(1);
  });

  it('executes EDGE_QUERY', () => {
    const engine = new QueryEngine();
    const result = engine.query({ type: 'EDGE_QUERY' }, baseContext);
    expect(result.data).toHaveLength(2);
  });

  it('executes HISTORY_QUERY', () => {
    const engine = new QueryEngine();
    const result = engine.query({ type: 'HISTORY_QUERY' }, { historicalSnapshots: [{ id: 's1', createdAt: '2024-01-01' }, { id: 's2', createdAt: '2024-02-01' }] });
    expect(result.data).toHaveLength(2);
  });

  it('falls back to NODE_QUERY for unknown type', () => {
    const engine = new QueryEngine();
    const result = engine.query({ type: 'UNKNOWN' as any }, baseContext);
    expect(result.data).toBeDefined();
  });

  it('supports pagination', () => {
    const engine = new QueryEngine();
    const result = engine.query({ type: 'NODE_QUERY', limit: 2 }, baseContext);
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(3);
  });
});
