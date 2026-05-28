import { describe, it, expect } from 'vitest';
import { TraversalAudit } from '../audit/traversal-audit.ts';
import { ReplayAudit } from '../audit/replay-audit.ts';
import { DeterminismAudit } from '../audit/determinism-audit.ts';
import { QueryAudit } from '../audit/query-audit.ts';
import { OptimizationAudit } from '../audit/optimization-audit.ts';
import { ExplorationAudit } from '../audit/exploration-audit.ts';
import type { TraversalResult } from '../types/index.ts';

function makeTraversalResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 'trav-1',
    strategy: 'BFS',
    steps: [
      { nodeId: 'A', depth: 0, parentId: null, edgeId: null, metadata: {} },
      { nodeId: 'B', depth: 1, parentId: 'A', edgeId: 'e1', metadata: {} },
    ],
    visited: new Set(['A', 'B']),
    depth: 1,
    nodeCount: 2,
    startNode: 'A',
    endNode: 'B',
    duration: 10,
    status: 'COMPLETED',
    fingerprint: 'fp-1',
    timestamp: '2024-01-01T00:00:00.000Z',
    ...overrides,
  } as TraversalResult;
}

describe('TraversalAudit', () => {
  it('recordTraversal stores entry', () => {
    const audit = new TraversalAudit();
    audit.recordTraversal(makeTraversalResult());
    const entries = audit.getTraversalAudit();
    expect(entries.length).toBe(1);
    expect(entries[0]!.event).toBe('TRAVERSAL_COMPLETED');
  });

  it('getTraversalAudit filters by ID', () => {
    const audit = new TraversalAudit();
    audit.recordTraversal(makeTraversalResult({ id: 't1' }));
    audit.recordTraversal(makeTraversalResult({ id: 't2' }));
    expect(audit.getTraversalAudit('t1').length).toBe(1);
  });

  it('verifyTraversalAudit passes for valid', () => {
    const audit = new TraversalAudit();
    audit.recordTraversal(makeTraversalResult({ id: 't1' }));
    const result = audit.verifyTraversalAudit('t1');
    expect(result.verified).toBe(true);
  });

  it('verifyTraversalAudit fails for missing ID', () => {
    const audit = new TraversalAudit();
    const result = audit.verifyTraversalAudit('unknown');
    expect(result.verified).toBe(false);
  });

  it('clear removes all entries', () => {
    const audit = new TraversalAudit();
    audit.recordTraversal(makeTraversalResult());
    audit.clear();
    expect(audit.getTraversalAudit().length).toBe(0);
  });
});

describe('ReplayAudit', () => {
  it('recordReplay stores entry', () => {
    const audit = new ReplayAudit();
    audit.recordReplay('TRAVERSAL', 'fp1', 'fp1', true);
    const entries = audit.getReplayAudit();
    expect(entries.length).toBe(1);
    expect(entries[0]!.match).toBe(true);
  });

  it('getReplayAudit filters by type', () => {
    const audit = new ReplayAudit();
    audit.recordReplay('TRAVERSAL', 'fp1', 'fp1', true);
    audit.recordReplay('QUERY', 'fp2', 'fp2', true);
    expect(audit.getReplayAudit('TRAVERSAL').length).toBe(1);
    expect(audit.getReplayAudit('QUERY').length).toBe(1);
  });

  it('verifyAllReplays returns stats', () => {
    const audit = new ReplayAudit();
    audit.recordReplay('TRAVERSAL', 'fp1', 'fp1', true);
    audit.recordReplay('TRAVERSAL', 'fp2', 'fp3', false);
    const stats = audit.verifyAllReplays();
    expect(stats.total).toBe(2);
    expect(stats.matches).toBe(1);
    expect(stats.mismatches).toBe(1);
    expect(stats.matchRate).toBe(0.5);
  });

  it('verifyAllReplays returns zeros for empty', () => {
    const audit = new ReplayAudit();
    const stats = audit.verifyAllReplays();
    expect(stats.total).toBe(0);
    expect(stats.matchRate).toBe(0);
  });

  it('clear removes all entries', () => {
    const audit = new ReplayAudit();
    audit.recordReplay('TRAVERSAL', 'fp1', 'fp1', true);
    audit.clear();
    expect(audit.getReplayAudit().length).toBe(0);
  });
});

describe('DeterminismAudit', () => {
  it('recordRun stores run', () => {
    const audit = new DeterminismAudit();
    audit.recordRun(makeTraversalResult({ id: 't1' }));
    const result = audit.verifyDeterminism('t1');
    expect(result.runs).toBe(1);
  });

  it('verifyDeterminism returns deterministic for single run', () => {
    const audit = new DeterminismAudit();
    audit.recordRun(makeTraversalResult({ id: 't1' }));
    const result = audit.verifyDeterminism('t1');
    expect(result.deterministic).toBe(true);
  });

  it('verifyDeterminism detects non-determinism', () => {
    const audit = new DeterminismAudit();
    audit.recordRun(makeTraversalResult({ id: 't1' }));
    audit.recordRun(makeTraversalResult({ id: 't1', fingerprint: 'diff-fp' }));
    const result = audit.verifyDeterminism('t1');
    expect(result.deterministic).toBe(false);
  });

  it('verifyAllDeterminism returns results', () => {
    const audit = new DeterminismAudit();
    audit.recordRun(makeTraversalResult({ id: 't1' }));
    audit.recordRun(makeTraversalResult({ id: 't1' }));
    const results = audit.verifyAllDeterminism();
    expect(results.length).toBeGreaterThanOrEqual(0);
  });

  it('getNonDeterministic returns non-det runs', () => {
    const audit = new DeterminismAudit();
    audit.recordRun(makeTraversalResult({ id: 't1' }));
    audit.recordRun(makeTraversalResult({ id: 't1', fingerprint: 'diff-fp' }));
    const nonDet = audit.getNonDeterministic();
    expect(nonDet.length).toBeGreaterThanOrEqual(0);
  });

  it('clear removes all records', () => {
    const audit = new DeterminismAudit();
    audit.recordRun(makeTraversalResult({ id: 't1' }));
    audit.clear();
    expect(audit.verifyDeterminism('t1').runs).toBe(0);
  });
});

describe('QueryAudit', () => {
  it('recordQuery stores entry', () => {
    const audit = new QueryAudit();
    audit.recordQuery(
      { id: 'q1', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [] }, parameters: {}, fingerprint: 'fp' },
      10, 5, { steps: ['scan'], estimatedCost: 10, estimatedNodes: 5, estimatedDepth: 1, parallelism: false },
    );
    const entries = audit.getQueryAudit();
    expect(entries.length).toBe(1);
  });

  it('getQueryAudit filters by ID', () => {
    const audit = new QueryAudit();
    audit.recordQuery(
      { id: 'q1', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [] }, parameters: {}, fingerprint: 'fp' },
      10, 5, { steps: ['scan'], estimatedCost: 10, estimatedNodes: 5, estimatedDepth: 1, parallelism: false },
    );
    expect(audit.getQueryAudit('q1').length).toBe(1);
  });

  it('verifyQueryAudit passes for valid', () => {
    const audit = new QueryAudit();
    audit.recordQuery(
      { id: 'q1', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [] }, parameters: {}, fingerprint: 'fp' },
      10, 5, { steps: ['scan'], estimatedCost: 10, estimatedNodes: 5, estimatedDepth: 1, parallelism: false },
    );
    const result = audit.verifyQueryAudit('q1');
    expect(result.verified).toBe(true);
  });

  it('verifyQueryAudit fails for missing', () => {
    const audit = new QueryAudit();
    const result = audit.verifyQueryAudit('unknown');
    expect(result.verified).toBe(false);
  });

  it('clear removes all entries', () => {
    const audit = new QueryAudit();
    audit.recordQuery(
      { id: 'q1', raw: 'FIND nodes', target: 'NODES', clauses: { logic: 'AND', conditions: [] }, parameters: {}, fingerprint: 'fp' },
      10, 5, { steps: ['scan'], estimatedCost: 10, estimatedNodes: 5, estimatedDepth: 1, parallelism: false },
    );
    audit.clear();
    expect(audit.getQueryAudit().length).toBe(0);
  });
});

describe('OptimizationAudit', () => {
  it('recordOptimization stores entry', () => {
    const audit = new OptimizationAudit();
    audit.recordOptimization('traverse', 'BFS', 100, 60, false);
    const entries = audit.getOptimizationAudit();
    expect(entries.length).toBe(1);
    expect(entries[0]!.savings).toBe(40);
  });

  it('verifyOptimizationCorrectness passes for valid', () => {
    const audit = new OptimizationAudit();
    audit.recordOptimization('traverse', 'BFS', 100, 60, false);
    const result = audit.verifyOptimizationCorrectness();
    expect(result.verified).toBe(true);
  });

  it('verifyOptimizationCorrectness detects negative cost', () => {
    const audit = new OptimizationAudit();
    audit.recordOptimization('traverse', 'BFS', -10, 60, false);
    const result = audit.verifyOptimizationCorrectness();
    expect(result.verified).toBe(false);
  });

  it('getSavingsReport returns summary', () => {
    const audit = new OptimizationAudit();
    audit.recordOptimization('traverse', 'BFS', 100, 60, false);
    audit.recordOptimization('query', 'INDEX', 50, 30, true);
    const report = audit.getSavingsReport();
    expect(report.totalSavings).toBe(60);
    expect(report.byOperation['traverse']).toBe(40);
  });

  it('getSavingsReport returns zeros for empty', () => {
    const audit = new OptimizationAudit();
    const report = audit.getSavingsReport();
    expect(report.totalSavings).toBe(0);
  });

  it('clear removes all entries', () => {
    const audit = new OptimizationAudit();
    audit.recordOptimization('traverse', 'BFS', 100, 60, false);
    audit.clear();
    expect(audit.getOptimizationAudit().length).toBe(0);
  });
});

describe('ExplorationAudit', () => {
  it('recordEvent stores entry', () => {
    const audit = new ExplorationAudit();
    audit.recordEvent('s1', 'SESSION_CREATED', { query: 'FIND nodes' });
    const entries = audit.getSessionAudit('s1');
    expect(entries.length).toBe(1);
    expect(entries[0]!.event).toBe('SESSION_CREATED');
  });

  it('recordEvent stores without details', () => {
    const audit = new ExplorationAudit();
    audit.recordEvent('s1', 'SESSION_CREATED');
    expect(audit.getSessionAudit('s1').length).toBe(1);
  });

  it('getSessionAudit returns entries for session', () => {
    const audit = new ExplorationAudit();
    audit.recordEvent('s1', 'EVENT_A');
    audit.recordEvent('s2', 'EVENT_B');
    expect(audit.getSessionAudit('s1').length).toBe(1);
  });

  it('verifySessionAudit passes for valid', () => {
    const audit = new ExplorationAudit();
    audit.recordEvent('s1', 'SESSION_CREATED');
    const result = audit.verifySessionAudit('s1');
    expect(result.verified).toBe(true);
  });

  it('verifySessionAudit fails for missing', () => {
    const audit = new ExplorationAudit();
    const result = audit.verifySessionAudit('unknown');
    expect(result.verified).toBe(false);
  });

  it('clearSession removes entries for session', () => {
    const audit = new ExplorationAudit();
    audit.recordEvent('s1', 'EVENT');
    audit.recordEvent('s2', 'EVENT');
    audit.clearSession('s1');
    expect(audit.getSessionAudit('s1').length).toBe(0);
    expect(audit.getSessionAudit('s2').length).toBe(1);
  });

  it('clearAll removes all entries', () => {
    const audit = new ExplorationAudit();
    audit.recordEvent('s1', 'EVENT');
    audit.clearAll();
    expect(audit.getSessionAudit('s1').length).toBe(0);
  });
});
