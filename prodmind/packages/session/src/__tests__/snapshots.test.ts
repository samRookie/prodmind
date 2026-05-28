import { describe, it, expect } from 'vitest';
import { ReasoningSnapshot } from '../snapshots/reasoning-snapshot.ts';
import { SnapshotManager } from '../snapshots/snapshot-manager.ts';
import { SnapshotDiffEngine } from '../snapshots/snapshot-diff.ts';
import { SnapshotFingerprint } from '../snapshots/snapshot-fingerprint.ts';
import { SnapshotQueryEngine } from '../snapshots/snapshot-query.ts';
import { serializeSnapshot, deserializeSnapshot, serializeSnapshotChain, deserializeSnapshotChain } from '../snapshots/snapshot-serializer.ts';
import { SnapshotError } from '../errors/index.ts';

describe('ReasoningSnapshot', () => {
  it('should create snapshot with required fields', () => {
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1' });
    expect(snap.id).toBeDefined();
    expect(snap.sessionId).toBe('sess-1');
    expect(snap.version).toBe(1);
    expect(snap.snapshotType).toBe('FULL');
  });

  it('should capture state from context', () => {
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1' });
    snap.capture({ hypothesis: { statement: 'test' }, timelineCursor: 5, interactionCursor: 3, graphReferences: ['g1'], compressedContext: 'ctx' });
    expect(snap.timelineCursor).toBe(5);
    expect(snap.interactionCursor).toBe(3);
    expect(snap.stateHash).toBeDefined();
  });

  it('should compute state hash deterministically', () => {
    const snap1 = new ReasoningSnapshot({ id: 'fixed-id', sessionId: 'sess-1', version: 1 });
    const snap2 = new ReasoningSnapshot({ id: 'fixed-id', sessionId: 'sess-1', version: 1 });
    snap1.capture({ hypothesis: { a: 1 } });
    snap2.capture({ hypothesis: { a: 1 } });
    expect(snap1.stateHash).toBe(snap2.stateHash);
  });

  it('should compute fingerprint', () => {
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1' });
    const fp = snap.computeFingerprint();
    expect(fp).toBeDefined();
    expect(fp.length).toBeGreaterThan(0);
  });

  it('should be compatible with same session and type', () => {
    const a = new ReasoningSnapshot({ sessionId: 'sess-1', snapshotType: 'FULL' });
    const b = new ReasoningSnapshot({ sessionId: 'sess-1', snapshotType: 'FULL' });
    expect(a.isCompatibleWith(b)).toBe(true);
  });

  it('should be incompatible with different session', () => {
    const a = new ReasoningSnapshot({ sessionId: 'sess-1' });
    const b = new ReasoningSnapshot({ sessionId: 'sess-2' });
    expect(a.isCompatibleWith(b)).toBe(false);
  });

  it('should serialize and deserialize via JSON', () => {
    const original = new ReasoningSnapshot({ sessionId: 'sess-1', snapshotType: 'FULL', version: 3 });
    const json = original.toJSON();
    const restored = ReasoningSnapshot.fromJSON(json);
    expect(restored.sessionId).toBe('sess-1');
    expect(restored.version).toBe(3);
  });
});

describe('SnapshotManager', () => {
  it('should create snapshot with incrementing versions', () => {
    const manager = new SnapshotManager();
    const s1 = manager.createSnapshot('sess-1', { hypothesis: { a: 1 } });
    const s2 = manager.createSnapshot('sess-1', { hypothesis: { a: 2 } });
    expect(s1.version).toBe(1);
    expect(s2.version).toBe(2);
  });

  it('should get snapshot by ID', () => {
    const manager = new SnapshotManager();
    const snap = manager.createSnapshot('sess-1', {});
    expect(manager.getSnapshot(snap.id)).toBe(snap);
  });

  it('should return undefined for non-existent snapshot', () => {
    const manager = new SnapshotManager();
    expect(manager.getSnapshot('nonexistent')).toBeUndefined();
  });

  it('should get latest snapshot', () => {
    const manager = new SnapshotManager();
    manager.createSnapshot('sess-1', {});
    const latest = manager.createSnapshot('sess-1', {});
    expect(manager.getLatestSnapshot('sess-1')?.id).toBe(latest.id);
  });

  it('should get snapshot by version', () => {
    const manager = new SnapshotManager();
    manager.createSnapshot('sess-1', {});
    const s2 = manager.createSnapshot('sess-1', {});
    expect(manager.getSnapshotByVersion('sess-1', 2)?.id).toBe(s2.id);
  });

  it('should list snapshots for session', () => {
    const manager = new SnapshotManager();
    manager.createSnapshot('sess-1', {});
    manager.createSnapshot('sess-1', {});
    manager.createSnapshot('sess-2', {});
    expect(manager.listSnapshots('sess-1')).toHaveLength(2);
  });

  it('should return undefined for non-existent version', () => {
    const manager = new SnapshotManager();
    expect(manager.getSnapshotByVersion('sess-1', 99)).toBeUndefined();
  });

  it('should compare snapshots', () => {
    const manager = new SnapshotManager();
    const s1 = manager.createSnapshot('sess-1', { hypothesis: { a: 1 }, timelineCursor: 5 });
    const s2 = manager.createSnapshot('sess-1', { hypothesis: { a: 2 }, timelineCursor: 10 });
    const diff = manager.compareSnapshots(s1.id, s2.id);
    expect(diff.changedFields).toContain('currentHypothesis');
    expect(diff.timelineCursorsDiff).toBe(5);
  });

  it('should throw on compare non-existent snapshot', () => {
    const manager = new SnapshotManager();
    const snap = manager.createSnapshot('sess-1', {});
    expect(() => manager.compareSnapshots(snap.id, 'nonexistent')).toThrow(SnapshotError);
  });

  it('should delete snapshot', () => {
    const manager = new SnapshotManager();
    const snap = manager.createSnapshot('sess-1', {});
    expect(manager.deleteSnapshot(snap.id)).toBe(true);
    expect(manager.getSnapshot(snap.id)).toBeUndefined();
  });
});

describe('SnapshotDiffEngine', () => {
  it('should diff two snapshots', () => {
    const engine = new SnapshotDiffEngine();
    const a = new ReasoningSnapshot({ sessionId: 'sess-1', version: 1 },);
    const b = new ReasoningSnapshot({ sessionId: 'sess-1', version: 2 });
    a.capture({ hypothesis: { x: 1 } });
    b.capture({ hypothesis: { x: 2 } });
    const diff = engine.diff(a, b);
    expect(diff.snapshotAId).toBe(a.id);
    expect(diff.snapshotBId).toBe(b.id);
  });

  it('should compute changes between snapshots', () => {
    const engine = new SnapshotDiffEngine();
    const a = new ReasoningSnapshot({ sessionId: 'sess-1', version: 1 });
    const b = new ReasoningSnapshot({ sessionId: 'sess-1', version: 2 });
    a.capture({ hypothesis: { x: 1 } });
    b.capture({ hypothesis: { x: 2 } });
    const changes = engine.computeChanges(a, b);
    expect(changes.length).toBeGreaterThan(0);
  });

  it('should detect significant change for hypothesis change', () => {
    const engine = new SnapshotDiffEngine();
    const a = new ReasoningSnapshot({ sessionId: 'sess-1', version: 1 });
    const b = new ReasoningSnapshot({ sessionId: 'sess-1', version: 2 });
    a.capture({ hypothesis: { x: 1 } });
    b.capture({ hypothesis: { x: 2 } });
    const diff = engine.diff(a, b);
    expect(engine.isSignificantChange(diff)).toBe(true);
  });

  it('should generate diff summary', () => {
    const engine = new SnapshotDiffEngine();
    const a = new ReasoningSnapshot({ sessionId: 'sess-1', version: 1 });
    const b = new ReasoningSnapshot({ sessionId: 'sess-1', version: 2 });
    a.capture({ hypothesis: { x: 1 } });
    b.capture({ hypothesis: { x: 2 } });
    const diff = engine.diff(a, b);
    const summary = engine.generateDiffSummary(diff);
    expect(summary).toContain(a.id);
    expect(summary).toContain(b.id);
  });
});

describe('SnapshotFingerprint', () => {
  const fp = new SnapshotFingerprint();

  it('should generate fingerprint', () => {
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1' });
    const hash = fp.generate(snap);
    expect(hash).toBeDefined();
    expect(snap.fingerprintHash).toBe(hash);
  });

  it('should verify fingerprint', () => {
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1' });
    const hash = fp.generate(snap);
    expect(fp.verify(snap, hash)).toBe(true);
  });

  it('should detect tampered fingerprint', () => {
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1' });
    const originalHash = fp.generate(snap);
    snap.version = 99;
    expect(fp.isTampered(snap, originalHash)).toBe(true);
  });

  it('should compare two fingerprints', () => {
    expect(fp.compare('abc', 'abc')).toBe(true);
    expect(fp.compare('abc', 'def')).toBe(false);
  });

  it('should throw on isTampered with empty original', () => {
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1' });
    expect(() => fp.isTampered(snap, '')).toThrow(SnapshotError);
  });
});

describe('SnapshotQueryEngine', () => {
  it('should find by state hash', () => {
    const map = new Map<string, ReasoningSnapshot>();
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1' });
    snap.capture({ hypothesis: { x: 1 } });
    map.set(snap.id, snap);
    const engine = new SnapshotQueryEngine(map);
    const found = engine.findByStateHash('sess-1', snap.stateHash);
    expect(found?.id).toBe(snap.id);
  });

  it('should find by type', () => {
    const map = new Map<string, ReasoningSnapshot>();
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1', snapshotType: 'CHECKPOINT' });
    map.set(snap.id, snap);
    const engine = new SnapshotQueryEngine(map);
    const found = engine.findByType('sess-1', 'CHECKPOINT');
    expect(found).toHaveLength(1);
  });

  it('should find by fingerprint', () => {
    const map = new Map<string, ReasoningSnapshot>();
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1' });
    snap.capture({ hypothesis: { x: 1 } });
    map.set(snap.id, snap);
    const engine = new SnapshotQueryEngine(map);
    const found = engine.findByFingerprint('sess-1', snap.fingerprintHash!);
    expect(found?.id).toBe(snap.id);
  });

  it('should get snapshot chain', () => {
    const map = new Map<string, ReasoningSnapshot>();
    const s1 = new ReasoningSnapshot({ id: 's1', sessionId: 'sess-1', version: 1 });
    const s2 = new ReasoningSnapshot({ id: 's2', sessionId: 'sess-1', version: 2, previousSnapshotId: 's1' });
    map.set('s1', s1);
    map.set('s2', s2);
    const engine = new SnapshotQueryEngine(map);
    const chain = engine.getSnapshotChain('sess-1');
    expect(chain).toHaveLength(2);
  });

  it('should return empty chain for no snapshots', () => {
    const engine = new SnapshotQueryEngine(new Map());
    expect(engine.getSnapshotChain('sess-1')).toEqual([]);
  });

  it('should find in time range', () => {
    const map = new Map<string, ReasoningSnapshot>();
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1', createdAt: '2024-06-01T00:00:00Z' });
    map.set(snap.id, snap);
    const engine = new SnapshotQueryEngine(map);
    const result = engine.findInTimeRange('sess-1', '2024-01-01T00:00:00Z', '2024-12-31T00:00:00Z');
    expect(result).toHaveLength(1);
  });

  it('should get snapshot timeline', () => {
    const map = new Map<string, ReasoningSnapshot>();
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1', version: 1, snapshotType: 'FULL' });
    map.set(snap.id, snap);
    const engine = new SnapshotQueryEngine(map);
    const timeline = engine.getSnapshotTimeline('sess-1');
    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.version).toBe(1);
  });
});

describe('snapshot serialization', () => {
  it('should serialize and deserialize individual snapshot', () => {
    const snap = new ReasoningSnapshot({ sessionId: 'sess-1', version: 5, snapshotType: 'CHECKPOINT' });
    const serialized = JSON.stringify(serializeSnapshot(snap));
    const data = JSON.parse(serialized);
    const restored = deserializeSnapshot(data);
    expect(restored.sessionId).toBe('sess-1');
    expect(restored.version).toBe(5);
  });

  it('should serialize and deserialize snapshot chain', () => {
    const chain = [
      new ReasoningSnapshot({ sessionId: 'sess-1', version: 1 }),
      new ReasoningSnapshot({ sessionId: 'sess-1', version: 2 }),
    ];
    const serialized = serializeSnapshotChain(chain);
    const restored = deserializeSnapshotChain(serialized);
    expect(restored).toHaveLength(2);
    expect(restored[1]?.version).toBe(2);
  });
});
