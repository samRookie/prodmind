import { describe, it, expect } from 'vitest';
import { DeterministicSerializer } from '../serialization/deterministic-serializer.ts';
import { serializeTimeline, deserializeTimeline, serializeTimelineBatch, deserializeTimelineBatch, exportTimeline } from '../serialization/timeline-serializer.ts';
import { serializeSnapshot, deserializeSnapshot, serializeSnapshotChain, deserializeSnapshotChain, exportSnapshot } from '../serialization/snapshot-serializer.ts';
import { serializeReplayLink, deserializeReplayLink, serializeReplayBatch, deserializeReplayBatch, exportReplayAudit } from '../serialization/replay-serializer.ts';
import { CanonicalizationEngine } from '../serialization/canonicalization.ts';
import { SerializationError } from '../errors/index.ts';

describe('DeterministicSerializer', () => {
  const ds = new DeterministicSerializer();

  it('should serialize and deserialize', () => {
    const json = ds.serialize({ a: 1, b: 2 });
    const obj = ds.deserialize<Record<string, number>>(json);
    expect(obj.a).toBe(1);
  });

  it('should normalize keys alphabetically', () => {
    const json = ds.serialize({ b: 2, a: 1 });
    expect(json).toBe('{"a":1,"b":2}');
  });

  it('should exclude undefined values', () => {
    const json = ds.serialize({ a: 1, b: undefined });
    expect(json).toBe('{"a":1}');
  });

  it('should handle null', () => {
    const json = ds.serialize(null);
    expect(json).toBe('null');
  });

  it('should serialize with hashing', () => {
    const result = ds.serializeWithHashing({ a: 1 });
    expect(result.json).toBe('{"a":1}');
    expect(result.hash).toBeDefined();
  });

  it('should compare serialization', () => {
    expect(ds.compareSerialization({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(ds.compareSerialization({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('should normalize data', () => {
    const normalized = ds.normalize({ b: 2, a: 1, c: undefined });
    expect(normalized).toEqual({ a: 1, b: 2 });
  });

  it('should throw on deserialize empty string', () => {
    expect(() => ds.deserialize('')).toThrow(SerializationError);
  });

  it('should throw on deserialize invalid JSON', () => {
    expect(() => ds.deserialize('not json')).toThrow(SerializationError);
  });

  it('should handle non-finite numbers', () => {
    const json = ds.serialize({ a: NaN });
    expect(json).toBe('{"a":null}');
  });
});

describe('TimelineSerializer', () => {
  const events = [
    { id: 'evt-1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', timestamp: '2024-01-01T00:00:00Z', sequenceNumber: 2, correlationId: 'c1', causationId: 'caus-1', payloadJson: '{}', metadataJson: '{}' },
    { id: 'evt-2', sessionId: 'sess-1', eventType: 'SESSION_ACTIVATED', timestamp: '2024-01-01T01:00:00Z', sequenceNumber: 1, correlationId: 'c2', causationId: 'caus-2', payloadJson: '{}', metadataJson: '{}' },
  ];

  it('should serialize and deserialize timeline', () => {
    const json = serializeTimeline(events);
    const restored = deserializeTimeline(json);
    expect(restored).toHaveLength(2);
  });

  it('should sort by sequence number on serialization', () => {
    const json = serializeTimeline(events);
    const restored = deserializeTimeline(json);
    expect(restored[0]?.sequenceNumber).toBe(1);
    expect(restored[1]?.sequenceNumber).toBe(2);
  });

  it('should serialize and deserialize batch', () => {
    const json = serializeTimelineBatch(events);
    const restored = deserializeTimelineBatch(json);
    expect(restored).toHaveLength(2);
  });

  it('should throw on deserialize empty timeline', () => {
    expect(() => deserializeTimeline('')).toThrow(SerializationError);
  });

  it('should throw on deserialize empty batch', () => {
    expect(() => deserializeTimelineBatch('')).toThrow(SerializationError);
  });

  it('should export in compact format', () => {
    const json = exportTimeline(events, 'compact');
    const parsed = JSON.parse(json);
    expect(parsed[0]?.seq).toBeDefined();
  });

  it('should export in pretty format', () => {
    const json = exportTimeline(events, 'pretty');
    expect(json).toContain('\n');
  });

  it('should export in default json format', () => {
    const json = exportTimeline(events);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(2);
  });
});

describe('SnapshotSerializer', () => {
  const snapshot = {
    id: 'snap-1', sessionId: 'sess-1', version: 1, snapshotType: 'FULL', stateHash: 'hash123',
    fingerprintHash: 'fp123', previousSnapshotId: undefined, currentHypothesis: 'hyp-1',
    timelineCursor: 'evt-5', interactionCursor: 'int-3', graphReferences: [],
    compressedContext: null, metadataJson: '{}', createdAt: '2024-01-01T00:00:00Z',
  };

  it('should serialize and deserialize snapshot', () => {
    const json = serializeSnapshot(snapshot);
    const restored = deserializeSnapshot(json);
    expect(restored.id).toBe('snap-1');
  });

  it('should throw on deserialize empty snapshot', () => {
    expect(() => deserializeSnapshot('')).toThrow(SerializationError);
  });

  it('should serialize and deserialize chain', () => {
    const chain = [snapshot, { ...snapshot, id: 'snap-2', version: 2 }];
    const json = serializeSnapshotChain(chain);
    const restored = deserializeSnapshotChain(json);
    expect(restored).toHaveLength(2);
  });

  it('should sort chain by version on serialization', () => {
    const chain = [{ ...snapshot, version: 2 }, { ...snapshot, version: 1 }];
    const json = serializeSnapshotChain(chain);
    const restored = deserializeSnapshotChain(json);
    expect(restored[0]?.version).toBe(1);
  });

  it('should throw on deserialize empty chain', () => {
    expect(() => deserializeSnapshotChain('')).toThrow(SerializationError);
  });

  it('should export in minimal format', () => {
    const json = exportSnapshot(snapshot, 'minimal');
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.currentHypothesis).toBeUndefined();
  });

  it('should export in pretty format', () => {
    const json = exportSnapshot(snapshot, 'pretty');
    expect(json).toContain('\n');
  });

  it('should export in default format', () => {
    const json = exportSnapshot(snapshot);
    const parsed = JSON.parse(json);
    expect(parsed.id).toBe('snap-1');
  });
});

describe('ReplaySerializer', () => {
  const link = {
    id: 'r-1', sessionId: 'sess-1', snapshotId: 'snap-1', linkType: 'FULL_RESTORE' as const,
    status: 'PENDING' as const, verificationHash: 'vhash123', failureReason: undefined,
    createdAt: '2024-01-01T00:00:00Z', verifiedAt: undefined,
  };

  it('should serialize and deserialize replay link', () => {
    const json = serializeReplayLink(link);
    const restored = deserializeReplayLink(json);
    expect(restored.sessionId).toBe('sess-1');
  });

  it('should serialize and deserialize batch', () => {
    const json = serializeReplayBatch([link]);
    const restored = deserializeReplayBatch(json);
    expect(restored).toHaveLength(1);
  });

  it('should throw on deserialize empty', () => {
    expect(() => deserializeReplayLink('')).toThrow(SerializationError);
  });

  it('should throw on deserialize empty batch', () => {
    expect(() => deserializeReplayBatch('')).toThrow(SerializationError);
  });

  it('should export replay audit in json format', () => {
    const json = exportReplayAudit([link]);
    const parsed = JSON.parse(json);
    expect(parsed).toHaveLength(1);
  });

  it('should export replay audit in pretty format', () => {
    const json = exportReplayAudit([link], 'pretty');
    expect(json).toContain('\n');
  });

  it('should export replay audit in audit format', () => {
    const json = exportReplayAudit([link], 'audit');
    expect(json).toContain('FULL_RESTORE');
  });
});

describe('CanonicalizationEngine', () => {
  const ce = new CanonicalizationEngine();

  it('should produce canonical form', () => {
    const canonical = ce.toCanonicalForm({ b: 2, a: 1 });
    expect(canonical).toBe('{"a":1,"b":2}');
  });

  it('should restore from canonical form', () => {
    const obj = ce.fromCanonicalForm<Record<string, number>>('{"a":1}');
    expect(obj.a).toBe(1);
  });

  it('should throw on restore from empty', () => {
    expect(() => ce.fromCanonicalForm('')).toThrow(SerializationError);
  });

  it('should compute canonical hash', () => {
    const hash = ce.canonicalHash({ a: 1 });
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64);
  });

  it('should compare canonical equals', () => {
    expect(ce.canonicalEquals({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
    expect(ce.canonicalEquals({ a: 1 }, { a: 2 })).toBe(false);
  });

  it('should normalize keys', () => {
    const normalized = ce.normalizeKeys({ b: 2, a: 1, c: undefined });
    expect(normalized).toEqual({ a: 1, b: 2 });
  });

  it('should normalize NaN to null', () => {
    const normalized = ce.normalizeKeys(NaN);
    expect(normalized).toBe(null);
  });

  it('should skip undefined in nested objects', () => {
    const normalized = ce.normalizeKeys({ a: { b: 1, c: undefined } });
    expect(normalized).toEqual({ a: { b: 1 } });
  });
});
