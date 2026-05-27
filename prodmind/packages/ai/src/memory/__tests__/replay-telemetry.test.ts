import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';

import { MemoryRepository } from '../repository/memory-repository.ts';
import { DeterministicRetrieval } from '../replay/deterministic-retrieval.ts';
import { MemoryReplay } from '../replay/memory-replay.ts';
import { RetrievalFingerprint } from '../replay/retrieval-fingerprint.ts';
import { MemoryTelemetry } from '../telemetry/memory-telemetry.ts';
import { RetrievalTelemetry } from '../telemetry/retrieval-telemetry.ts';
import { ReasoningTelemetry } from '../telemetry/reasoning-telemetry.ts';
import { computeMemoryFingerprint } from '../hashing/memory-fingerprint.ts';
import type { MemoryEntry, ContextEnvelope } from '../contracts/memory-contracts.ts';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function makeEntry(overrides: Partial<MemoryEntry> & { id: string }): MemoryEntry {
  return Object.freeze({
    category: 'execution' as const,
    timestamp: '',
    content: '',
    fingerprint: 'fp_default',
    metadata: Object.freeze({}),
    tags: Object.freeze([]),
    provenanceId: '',
    parentId: '',
    ...overrides,
  });
}

/* ================================================================== */
/*  DeterministicRetrieval                                             */
/* ================================================================== */
describe('DeterministicRetrieval', () => {
  it('constructor takes MemoryRepository', () => {
    const repo = new MemoryRepository();
    const dr = new DeterministicRetrieval(repo);
    expect(dr).toBeInstanceOf(DeterministicRetrieval);
  });

  it('retrieveStable returns entries sorted by id', () => {
    const repo = new MemoryRepository();
    const b = makeEntry({ id: 'b', fingerprint: 'fp_b' });
    const a = makeEntry({ id: 'a', fingerprint: 'fp_a' });
    repo.storeEntry(b);
    repo.storeEntry(a);

    const dr = new DeterministicRetrieval(repo);
    const result = dr.retrieveStable(['b', 'a']);
    expect(result[0]!.id).toBe('a');
    expect(result[1]!.id).toBe('b');
  });

  it('retrieveByCategoryStable returns category-filtered entries', () => {
    const repo = new MemoryRepository();
    const e1 = makeEntry({ id: 'e1', category: 'execution' });
    const e2 = makeEntry({ id: 'e2', category: 'architectural' });
    repo.storeEntry(e1);
    repo.storeEntry(e2);

    const dr = new DeterministicRetrieval(repo);
    const exec = dr.retrieveByCategoryStable('execution');
    expect(exec).toHaveLength(1);
    expect(exec[0]!.id).toBe('e1');
  });

  it('deterministicSlice returns slice after stable sort', () => {
    const entries = [
      makeEntry({ id: 'z', fingerprint: 'fp_z' }),
      makeEntry({ id: 'a', fingerprint: 'fp_a' }),
      makeEntry({ id: 'm', fingerprint: 'fp_m' }),
    ];
    const dr = new DeterministicRetrieval(new MemoryRepository());
    const slice = dr.deterministicSlice(entries, 0, 2);
    expect(slice).toHaveLength(2);
    expect(slice[0]!.id).toBe('a');
    expect(slice[1]!.id).toBe('m');
    expect(Object.isFrozen(slice)).toBe(true);
  });

  it('computeRetrievalFingerprint returns sha256 of id:fingerprint pairs', () => {
    const repo = new MemoryRepository();
    const e1 = makeEntry({ id: 'e1', fingerprint: 'fp1' });
    const e2 = makeEntry({ id: 'e2', fingerprint: 'fp2' });
    repo.storeEntry(e1);
    repo.storeEntry(e2);

    const dr = new DeterministicRetrieval(repo);
    const fp = dr.computeRetrievalFingerprint(['e2', 'e1']);
    // Sorted by id: e1:fp1, e2:fp2 => "e1:fp1|e2:fp2"
    const expected = computeMemoryFingerprint(['e1:fp1', 'e2:fp2']);
    expect(fp).toBe(expected);
    expect(fp.length).toBe(64);
  });

  it('verifyDeterministic checks fingerprint match', () => {
    const repo = new MemoryRepository();
    const e1 = makeEntry({ id: 'e1', fingerprint: 'fp1' });
    repo.storeEntry(e1);

    const dr = new DeterministicRetrieval(repo);
    const fp = dr.computeRetrievalFingerprint(['e1']);
    expect(dr.verifyDeterministic(fp, ['e1'])).toBe(true);
    expect(dr.verifyDeterministic(fp, ['e2'])).toBe(false); // e2 missing produces different fingerprint
    expect(dr.verifyDeterministic('wrong', ['e1'])).toBe(false);
  });
});

/* ================================================================== */
/*  MemoryReplay                                                        */
/* ================================================================== */
describe('MemoryReplay', () => {
  it('starts with 0 checkpoints', () => {
    const mr = new MemoryReplay();
    expect(mr.checkpointCount).toBe(0);
  });

  it('createCheckpoint stores repository state with fingerprints, returns frozen ReplayCheckpoint', () => {
    const repo = new MemoryRepository();
    const e1 = makeEntry({ id: 'e1', fingerprint: 'fp1', timestamp: '100' });
    repo.storeEntry(e1);

    const mr = new MemoryReplay();
    const cp = mr.createCheckpoint(repo);

    expect(cp.id).toMatch(/^ckpt_\d+$/);
    expect(typeof cp.timestamp).toBe('number');
    expect(cp.entryFingerprints).toEqual(['fp1']);
    expect(cp.repositoryFingerprint).toBe(repo.computeRepositoryFingerprint());
    expect(Object.isFrozen(cp)).toBe(true);
    expect(Object.isFrozen(cp.entryFingerprints)).toBe(true);
  });

  it('getCheckpoint retrieves by id', () => {
    const repo = new MemoryRepository();
    const mr = new MemoryReplay();
    const cp = mr.createCheckpoint(repo);

    expect(mr.getCheckpoint(cp.id)).toBe(cp);
    expect(mr.getCheckpoint('unknown')).toBeUndefined();
  });

  it('getEntryHistory returns frozen entries at checkpoint time', () => {
    const repo = new MemoryRepository();
    const e1 = makeEntry({ id: 'e1', fingerprint: 'fp1' });
    repo.storeEntry(e1);

    const mr = new MemoryReplay();
    const cp = mr.createCheckpoint(repo);

    const history = mr.getEntryHistory(cp.id);
    expect(history).toHaveLength(1);
    expect(history![0]!.id).toBe('e1');
    expect(Object.isFrozen(history!)).toBe(true);

    // Adding more entries later doesn't affect history
    repo.storeEntry(makeEntry({ id: 'e2', fingerprint: 'fp2' }));
    expect(mr.getEntryHistory(cp.id)).toHaveLength(1);

    expect(mr.getEntryHistory('unknown')).toBeUndefined();
  });

  it('compareCheckpoints returns added/removed fingerprint diffs', () => {
    const repo = new MemoryRepository();
    const mr = new MemoryReplay();

    repo.storeEntry(makeEntry({ id: 'e1', fingerprint: 'fp1' }));
    const cpA = mr.createCheckpoint(repo);

    repo.storeEntry(makeEntry({ id: 'e2', fingerprint: 'fp2' }));
    repo.storeEntry(makeEntry({ id: 'e3', fingerprint: 'fp3' }));
    const cpB = mr.createCheckpoint(repo);

    const diff = mr.compareCheckpoints(cpA.id, cpB.id);
    expect(diff.added).toEqual(['fp2', 'fp3']);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toBe(false);

    // Remove fp1 by clearing and re-adding
    repo.clear();
    repo.storeEntry(makeEntry({ id: 'e2', fingerprint: 'fp2' }));
    const cpC = mr.createCheckpoint(repo);

    const diff2 = mr.compareCheckpoints(cpB.id, cpC.id);
    expect(diff2.removed).toEqual(['fp1', 'fp3']);
    expect(diff2.unchanged).toBe(false);
  });

  it('verifyIntegrity checks current repo fingerprint matches checkpoint', () => {
    const repo = new MemoryRepository();
    const e1 = makeEntry({ id: 'e1', fingerprint: 'fp1' });
    repo.storeEntry(e1);

    const mr = new MemoryReplay();
    const cp = mr.createCheckpoint(repo);

    expect(mr.verifyIntegrity(cp.id, repo)).toBe(true);

    repo.storeEntry(makeEntry({ id: 'e2', fingerprint: 'fp2' }));
    expect(mr.verifyIntegrity(cp.id, repo)).toBe(false);

    expect(mr.verifyIntegrity('unknown', repo)).toBe(false);
  });

  it('replayEntries returns entries at checkpoint time', () => {
    const repo = new MemoryRepository();
    const e1 = makeEntry({ id: 'e1', fingerprint: 'fp1' });
    repo.storeEntry(e1);

    const mr = new MemoryReplay();
    const cp = mr.createCheckpoint(repo);

    repo.storeEntry(makeEntry({ id: 'e2', fingerprint: 'fp2' }));

    const replayed = mr.replayEntries(repo, cp.id);
    expect(replayed).toHaveLength(1);
    expect(replayed[0]!.id).toBe('e1');
    expect(Object.isFrozen(replayed)).toBe(true);

    expect(mr.replayEntries(repo, 'unknown')).toEqual([]);
  });

  it('createCheckpoint with empty repo still works', () => {
    const repo = new MemoryRepository();
    const mr = new MemoryReplay();
    const cp = mr.createCheckpoint(repo);

    expect(cp.entryFingerprints).toEqual([]);
    expect(cp.repositoryFingerprint.length).toBe(64);
    expect(mr.checkpointCount).toBe(1);
  });

  it('compareCheckpoints returns unchanged=true when fingerprints match', () => {
    const repo = new MemoryRepository();
    const mr = new MemoryReplay();

    const cpA = mr.createCheckpoint(repo);
    const cpB = mr.createCheckpoint(repo);

    const diff = mr.compareCheckpoints(cpA.id, cpB.id);
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toBe(true);
  });

  it('compareCheckpoints returns empty arrays for unknown ids', () => {
    const mr = new MemoryReplay();
    const diff = mr.compareCheckpoints('unknown_a', 'unknown_b');
    expect(diff.added).toEqual([]);
    expect(diff.removed).toEqual([]);
    expect(diff.unchanged).toBe(true);
  });

  it('clear removes all checkpoints', () => {
    const repo = new MemoryRepository();
    const mr = new MemoryReplay();
    mr.createCheckpoint(repo);
    mr.createCheckpoint(repo);
    expect(mr.checkpointCount).toBe(2);

    mr.clear();
    expect(mr.checkpointCount).toBe(0);
  });
});

/* ================================================================== */
/*  RetrievalFingerprint                                                */
/* ================================================================== */
describe('RetrievalFingerprint', () => {
  it('compute produces deterministic hash from sorted entry id:fingerprint:timestamp', () => {
    const rfp = new RetrievalFingerprint();
    const entries = [
      makeEntry({ id: 'b', fingerprint: 'fp_b', timestamp: '2000' }),
      makeEntry({ id: 'a', fingerprint: 'fp_a', timestamp: '1000' }),
    ];

    const fp = rfp.compute(entries);
    // Sorted by id: a:fp_a:1000, b:fp_b:2000 => sha256("a:fp_a:1000|b:fp_b:2000")
    const expected = computeMemoryFingerprint(['a:fp_a:1000', 'b:fp_b:2000']);
    expect(fp).toBe(expected);
    expect(fp.length).toBe(64);

    // Deterministic: calling again produces same result
    expect(rfp.compute(entries)).toBe(fp);
  });

  it('computeEnvelopeFingerprint uses context fingerprint logic', () => {
    const rfp = new RetrievalFingerprint();
    const entries = [
      makeEntry({ id: 'e2', fingerprint: 'fp2' }),
      makeEntry({ id: 'e1', fingerprint: 'fp1' }),
    ];

    const envelope: ContextEnvelope = Object.freeze({
      id: 'env_1',
      entries,
      findings: Object.freeze([]),
      reasoningChains: Object.freeze([]),
      totalTokens: 100,
      budget: 5000,
      overflow: false,
      fingerprint: 'env_fp',
    });

    const fp = rfp.computeEnvelopeFingerprint(envelope);
    // computeContextFingerprint: sha256("5000|e1|e2")
    const expected = computeMemoryFingerprint(['5000', 'e1', 'e2']);
    expect(fp).toBe(expected);
    expect(fp.length).toBe(64);
  });

  it('computeWithMetadata combines entry fingerprint with deterministic JSON metadata', () => {
    const rfp = new RetrievalFingerprint();
    const entry = makeEntry({ id: 'e1', fingerprint: 'fp1', timestamp: '1000' });
    const metadata = { source: 'test', version: '1' };

    const fp = rfp.computeWithMetadata([entry], metadata);
    const entryPart = rfp.compute([entry]);
    const metaPart = JSON.stringify(metadata, Object.keys(metadata).sort());
    const expected = computeMemoryFingerprint([entryPart, metaPart]);
    expect(fp).toBe(expected);
    expect(fp.length).toBe(64);
  });

  it('verify checks expected vs actual fingerprint', () => {
    const rfp = new RetrievalFingerprint();
    const entry = makeEntry({ id: 'e1', fingerprint: 'fp1', timestamp: '1000' });

    const correct = rfp.compute([entry]);
    expect(rfp.verify(correct, [entry])).toBe(true);
    expect(rfp.verify('wrong_fingerprint', [entry])).toBe(false);
  });

  it('verifyEnvelope checks expected vs actual envelope fingerprint', () => {
    const rfp = new RetrievalFingerprint();
    const envelope: ContextEnvelope = Object.freeze({
      id: 'env_1',
      entries: Object.freeze([]),
      findings: Object.freeze([]),
      reasoningChains: Object.freeze([]),
      totalTokens: 0,
      budget: 1000,
      overflow: false,
      fingerprint: 'env_fp',
    });

    const correct = rfp.computeEnvelopeFingerprint(envelope);
    expect(rfp.verifyEnvelope(correct, envelope)).toBe(true);
    expect(rfp.verifyEnvelope('wrong', envelope)).toBe(false);
  });
});

/* ================================================================== */
/*  MemoryTelemetry                                                     */
/* ================================================================== */
describe('MemoryTelemetry', () => {
  it('starts with 0 events', () => {
    const mt = new MemoryTelemetry();
    expect(mt.totalEvents).toBe(0);
    expect(mt.events).toEqual([]);
  });

  it('record creates event with timestamp, duration, details', () => {
    const mt = new MemoryTelemetry();
    const event = mt.record('retrieval', 42, { query: 'test' });

    expect(event.eventType).toBe('retrieval');
    expect(event.durationMs).toBe(42);
    expect(typeof event.timestamp).toBe('number');
    expect(event.details).toEqual({ query: 'test' });
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.details)).toBe(true);
    expect(mt.totalEvents).toBe(1);
  });

  it('record works without details', () => {
    const mt = new MemoryTelemetry();
    const event = mt.record('reasoning', 10);
    expect(event.details).toEqual({});
  });

  it('getEventsByType filters events', () => {
    const mt = new MemoryTelemetry();
    mt.record('type_a', 1);
    mt.record('type_b', 2);
    mt.record('type_a', 3);

    const typeA = mt.getEventsByType('type_a');
    expect(typeA).toHaveLength(2);
    expect(typeA.every(e => e.eventType === 'type_a')).toBe(true);
    expect(Object.isFrozen(typeA)).toBe(true);

    expect(mt.getEventsByType('unknown')).toEqual([]);
  });

  it('getEventsInRange filters by time range', () => {
    const mt = new MemoryTelemetry();
    mt.record('a', 1);
    mt.record('b', 2);
    const all = mt.events;
    const start = all[0]!.timestamp;
    const end = all[1]!.timestamp;

    const range = mt.getEventsInRange(start, end);
    expect(range).toHaveLength(2);
    expect(Object.isFrozen(range)).toBe(true);

    expect(mt.getEventsInRange(0, 0)).toEqual([]);
  });

  it('getAverageDuration computes avg for type', () => {
    const mt = new MemoryTelemetry();
    mt.record('type_a', 10);
    mt.record('type_a', 20);
    mt.record('type_b', 100);

    expect(mt.getAverageDuration('type_a')).toBe(15);
    expect(mt.getAverageDuration('type_b')).toBe(100);
    expect(mt.getAverageDuration('unknown')).toBe(0);
  });

  it('getTotalDuration computes total for type', () => {
    const mt = new MemoryTelemetry();
    mt.record('type_a', 10);
    mt.record('type_a', 20);
    mt.record('type_b', 100);

    expect(mt.getTotalDuration('type_a')).toBe(30);
    expect(mt.getTotalDuration('type_b')).toBe(100);
    expect(mt.getTotalDuration('unknown')).toBe(0);
  });

  it('getSummary returns per-type stats', () => {
    const mt = new MemoryTelemetry();
    mt.record('x', 10);
    mt.record('x', 30);
    mt.record('y', 100);

    const summary = mt.getSummary();
    expect(Object.isFrozen(summary)).toBe(true);

    expect(summary.x).toEqual({ count: 2, avgMs: 20, totalMs: 40 });
    expect(summary.y).toEqual({ count: 1, avgMs: 100, totalMs: 100 });
  });

  it('getSummary returns empty object with no events', () => {
    const mt = new MemoryTelemetry();
    expect(mt.getSummary()).toEqual({});
  });

  it('clear resets', () => {
    const mt = new MemoryTelemetry();
    mt.record('a', 1);
    mt.record('b', 2);
    expect(mt.totalEvents).toBe(2);

    mt.clear();
    expect(mt.totalEvents).toBe(0);
    expect(mt.events).toEqual([]);
  });
});

/* ================================================================== */
/*  RetrievalTelemetry                                                  */
/* ================================================================== */
describe('RetrievalTelemetry', () => {
  it('constructor creates internal MemoryTelemetry', () => {
    const rt = new RetrievalTelemetry();
    expect(rt.underlying).toBeInstanceOf(MemoryTelemetry);
  });

  it('constructor accepts external MemoryTelemetry', () => {
    const mt = new MemoryTelemetry();
    const rt = new RetrievalTelemetry(mt);
    expect(rt.underlying).toBe(mt);
  });

  it('recordRetrieval creates entry and records to underlying telemetry', () => {
    const rt = new RetrievalTelemetry();
    const entry = rt.recordRetrieval({
      queryId: 'q1',
      entryCount: 5,
      findingCount: 2,
      totalScore: 0.95,
      durationMs: 42,
    });

    expect(entry.queryId).toBe('q1');
    expect(entry.entryCount).toBe(5);
    expect(entry.findingCount).toBe(2);
    expect(entry.totalScore).toBe(0.95);
    expect(entry.durationMs).toBe(42);
    expect(typeof entry.timestamp).toBe('number');
    expect(Object.isFrozen(entry)).toBe(true);

    // Underlying telemetry was also recorded
    expect(rt.underlying.totalEvents).toBe(1);
    const events = rt.underlying.getEventsByType('retrieval');
    expect(events).toHaveLength(1);
    expect(events[0]!.durationMs).toBe(42);
  });

  it('getEntries returns entries', () => {
    const rt = new RetrievalTelemetry();
    rt.recordRetrieval({ queryId: 'q1', entryCount: 1, findingCount: 0, totalScore: 1, durationMs: 10 });
    rt.recordRetrieval({ queryId: 'q2', entryCount: 2, findingCount: 1, totalScore: 0.5, durationMs: 20 });

    const entries = rt.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]!.queryId).toBe('q1');
    expect(entries[1]!.queryId).toBe('q2');
    expect(Object.isFrozen(entries)).toBe(true);
  });

  it('getAverageLatency computes average', () => {
    const rt = new RetrievalTelemetry();
    rt.recordRetrieval({ queryId: 'q1', entryCount: 1, findingCount: 0, totalScore: 1, durationMs: 10 });
    rt.recordRetrieval({ queryId: 'q2', entryCount: 1, findingCount: 0, totalScore: 1, durationMs: 30 });

    expect(rt.getAverageLatency()).toBe(20);
    expect(new RetrievalTelemetry().getAverageLatency()).toBe(0);
  });

  it('getTotalRetrievals returns count', () => {
    const rt = new RetrievalTelemetry();
    expect(rt.getTotalRetrievals()).toBe(0);
    rt.recordRetrieval({ queryId: 'q1', entryCount: 1, findingCount: 0, totalScore: 1, durationMs: 10 });
    rt.recordRetrieval({ queryId: 'q2', entryCount: 1, findingCount: 0, totalScore: 1, durationMs: 20 });
    expect(rt.getTotalRetrievals()).toBe(2);
  });

  it('clear resets both layers', () => {
    const rt = new RetrievalTelemetry();
    rt.recordRetrieval({ queryId: 'q1', entryCount: 1, findingCount: 0, totalScore: 1, durationMs: 10 });
    expect(rt.getTotalRetrievals()).toBe(1);
    expect(rt.underlying.totalEvents).toBe(1);

    rt.clear();
    expect(rt.getTotalRetrievals()).toBe(0);
    // clear does not touch underlying telemetry
    expect(rt.underlying.totalEvents).toBe(1);
  });
});

/* ================================================================== */
/*  ReasoningTelemetry                                                  */
/* ================================================================== */
describe('ReasoningTelemetry', () => {
  it('constructor creates internal MemoryTelemetry', () => {
    const rt = new ReasoningTelemetry();
    expect(rt.underlying).toBeInstanceOf(MemoryTelemetry);
  });

  it('constructor accepts external MemoryTelemetry', () => {
    const mt = new MemoryTelemetry();
    const rt = new ReasoningTelemetry(mt);
    expect(rt.underlying).toBe(mt);
  });

  it('recordReasoning creates entry and records to underlying', () => {
    const rt = new ReasoningTelemetry();
    const entry = rt.recordReasoning({
      chainId: 'ch_1',
      chainType: 'architectural_drift',
      stepCount: 3,
      confidence: 0.85,
      durationMs: 100,
    });

    expect(entry.chainId).toBe('ch_1');
    expect(entry.chainType).toBe('architectural_drift');
    expect(entry.stepCount).toBe(3);
    expect(entry.confidence).toBe(0.85);
    expect(entry.durationMs).toBe(100);
    expect(typeof entry.timestamp).toBe('number');
    expect(Object.isFrozen(entry)).toBe(true);

    // Underlying telemetry was also recorded
    expect(rt.underlying.totalEvents).toBe(1);
    const events = rt.underlying.getEventsByType('reasoning');
    expect(events).toHaveLength(1);
    expect(events[0]!.durationMs).toBe(100);
  });

  it('getAverageConfidence computes average', () => {
    const rt = new ReasoningTelemetry();
    rt.recordReasoning({ chainId: 'c1', chainType: 'a', stepCount: 1, confidence: 0.8, durationMs: 10 });
    rt.recordReasoning({ chainId: 'c2', chainType: 'b', stepCount: 2, confidence: 0.9, durationMs: 20 });

    expect(rt.getAverageConfidence()).toBeCloseTo(0.85);
    expect(new ReasoningTelemetry().getAverageConfidence()).toBe(0);
  });

  it('getByChainType filters by chainType', () => {
    const rt = new ReasoningTelemetry();
    rt.recordReasoning({ chainId: 'c1', chainType: 'drift', stepCount: 1, confidence: 0.8, durationMs: 10 });
    rt.recordReasoning({ chainId: 'c2', chainType: 'impact', stepCount: 2, confidence: 0.9, durationMs: 20 });
    rt.recordReasoning({ chainId: 'c3', chainType: 'drift', stepCount: 3, confidence: 0.7, durationMs: 30 });

    const drifts = rt.getByChainType('drift');
    expect(drifts).toHaveLength(2);
    expect(drifts.every(e => e.chainType === 'drift')).toBe(true);
    expect(Object.isFrozen(drifts)).toBe(true);

    expect(rt.getByChainType('unknown')).toEqual([]);
  });

  it('getTotalReasoningChains returns count', () => {
    const rt = new ReasoningTelemetry();
    expect(rt.getTotalReasoningChains()).toBe(0);
    rt.recordReasoning({ chainId: 'c1', chainType: 'a', stepCount: 1, confidence: 0.5, durationMs: 10 });
    rt.recordReasoning({ chainId: 'c2', chainType: 'b', stepCount: 2, confidence: 0.6, durationMs: 20 });
    expect(rt.getTotalReasoningChains()).toBe(2);
  });

  it('clear resets', () => {
    const rt = new ReasoningTelemetry();
    rt.recordReasoning({ chainId: 'c1', chainType: 'a', stepCount: 1, confidence: 0.5, durationMs: 10 });
    expect(rt.getTotalReasoningChains()).toBe(1);
    expect(rt.underlying.totalEvents).toBe(1);

    rt.clear();
    expect(rt.getTotalReasoningChains()).toBe(0);
    expect(rt.underlying.totalEvents).toBe(1);
  });
});
