import { describe, it, expect } from 'vitest';
import { SessionValidator } from '../validation/session-validator.ts';
import { SnapshotValidator } from '../validation/snapshot-validator.ts';
import { TimelineValidator } from '../validation/timeline-validator.ts';
import { ReplayValidator } from '../validation/replay-validator.ts';
import { IntegrityValidator } from '../validation/integrity-validator.ts';

describe('SessionValidator', () => {
  const validator = new SessionValidator();

  it('should validate valid session', () => {
    const result = validator.validateSession({
      id: 'sess-1', projectId: 'proj-1', status: 'ACTIVE',
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    });
    expect(result.valid).toBe(true);
  });

  it('should detect missing ID', () => {
    const result = validator.validateSession({ projectId: 'proj-1', status: 'ACTIVE' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Session ID is required and must be a string');
  });

  it('should detect missing project ID', () => {
    const result = validator.validateSession({ id: 'sess-1', status: 'ACTIVE' });
    expect(result.valid).toBe(false);
  });

  it('should detect invalid status', () => {
    const result = validator.validateSession({ id: 'sess-1', projectId: 'proj-1', status: 'INVALID' });
    expect(result.valid).toBe(false);
  });

  it('should validate session status', () => {
    const result = validator.validateSessionStatus({ status: 'ACTIVE' });
    expect(result.valid).toBe(true);
  });

  it('should detect missing status', () => {
    const result = validator.validateSessionStatus({});
    expect(result.valid).toBe(false);
  });

  it('should validate session timestamps', () => {
    const result = validator.validateSessionTimestamps({
      createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z',
    });
    expect(result.valid).toBe(true);
  });

  it('should detect updated before created', () => {
    const result = validator.validateSessionTimestamps({
      createdAt: '2024-01-02T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z',
    });
    expect(result.valid).toBe(false);
  });

  it('should validate session references', () => {
    const result = validator.validateSessionReferences({ projectId: 'proj-1' });
    expect(result.valid).toBe(true);
  });

  it('should validate new session input', () => {
    const result = validator.validateNewSessionInput({ projectId: 'proj-1' });
    expect(result.valid).toBe(true);
  });

  it('should reject new session input without project ID', () => {
    const result = validator.validateNewSessionInput({ projectId: '', investigationGoal: 'test' });
    expect(result.valid).toBe(false);
  });
});

describe('SnapshotValidator', () => {
  const validator = new SnapshotValidator();
  const validSnapshot = {
    id: 'snap-1', sessionId: 'sess-1', version: 1, snapshotType: 'FULL',
    stateHash: 'hash123', createdAt: '2024-01-01T00:00:00Z',
  };

  it('should validate valid snapshot', () => {
    const result = validator.validateSnapshot(validSnapshot);
    expect(result.valid).toBe(true);
  });

  it('should detect missing ID', () => {
    const result = validator.validateSnapshot({ ...validSnapshot, id: undefined });
    expect(result.valid).toBe(false);
  });

  it('should detect missing version', () => {
    const result = validator.validateSnapshot({ ...validSnapshot, version: undefined });
    expect(result.valid).toBe(false);
  });

  it('should detect invalid version', () => {
    const result = validator.validateSnapshot({ ...validSnapshot, version: 0 });
    expect(result.valid).toBe(false);
  });

  it('should detect invalid snapshot type', () => {
    const result = validator.validateSnapshot({ ...validSnapshot, snapshotType: 'BAD' });
    expect(result.valid).toBe(false);
  });

  it('should validate snapshot chain', () => {
    const result = validator.validateSnapshotChain([validSnapshot]);
    expect(result.valid).toBe(true);
  });

  it('should detect duplicate versions in chain', () => {
    const result = validator.validateSnapshotChain([
      validSnapshot,
      { ...validSnapshot, id: 'snap-2', version: 1 },
    ]);
    expect(result.valid).toBe(false);
  });

  it('should warn on version gaps', () => {
    const result = validator.validateSnapshotChain([
      validSnapshot,
      { ...validSnapshot, id: 'snap-2', version: 3 },
    ]);
    expect(result.warnings).toHaveLength(1);
  });

  it('should validate state hash', () => {
    const snap = { ...validSnapshot, stateHash: 'somehash' };
    const result = validator.validateStateHash(snap);
    expect(result.valid).toBe(false);
  });

  it('should detect missing state hash for validation', () => {
    const result = validator.validateStateHash({ ...validSnapshot, stateHash: undefined });
    expect(result.valid).toBe(false);
  });

  it('should validate snapshot versioning', () => {
    const result = validator.validateSnapshotVersioning([validSnapshot]);
    expect(result.valid).toBe(true);
  });

  it('should validate fingerprint', () => {
    const snap = { ...validSnapshot, fingerprintHash: 'somefp' };
    const result = validator.validateFingerprint(snap);
    expect(result.valid).toBe(false);
  });

  it('should detect missing fingerprint', () => {
    const result = validator.validateFingerprint({ ...validSnapshot, fingerprintHash: undefined });
    expect(result.valid).toBe(false);
  });
});

describe('TimelineValidator', () => {
  const validator = new TimelineValidator();
  const makeEvent = (overrides: Record<string, unknown> = {}) => ({
    id: 'evt-1', sessionId: 'sess-1', eventType: 'SESSION_CREATED',
    timestamp: '2024-01-01T00:00:00Z', sequenceNumber: 1,
    correlationId: 'c1', causationId: 'caus-1',
    payloadJson: '{}', metadataJson: '{}',
    ...overrides,
  });

  it('should validate valid timeline', () => {
    const result = validator.validateTimeline([makeEvent()]);
    expect(result.valid).toBe(true);
  });

  it('should warn on empty timeline', () => {
    const result = validator.validateTimeline([]);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain('Timeline is empty');
  });

  it('should detect events from multiple sessions', () => {
    const result = validator.validateTimeline([makeEvent(), makeEvent({ sessionId: 'other' })]);
    expect(result.valid).toBe(false);
  });

  it('should validate event sequence', () => {
    const result = validator.validateEventSequence([
      makeEvent({ sequenceNumber: 1 }),
      makeEvent({ id: 'evt-2', sequenceNumber: 2 }),
    ]);
    expect(result.valid).toBe(true);
  });

  it('should detect sequence starting not from 1', () => {
    const result = validator.validateEventSequence([makeEvent({ sequenceNumber: 2 })]);
    expect(result.valid).toBe(false);
  });

  it('should detect duplicate sequence numbers', () => {
    const result = validator.validateEventSequence([
      makeEvent({ sequenceNumber: 1 }),
      makeEvent({ id: 'evt-2', sequenceNumber: 1 }),
    ]);
    expect(result.valid).toBe(false);
  });

  it('should validate event ordering', () => {
    const result = validator.validateEventOrdering([
      makeEvent({ sequenceNumber: 1 }),
      makeEvent({ id: 'evt-2', sequenceNumber: 2 }),
    ]);
    expect(result.valid).toBe(true);
  });

  it('should detect descending sequence', () => {
    const result = validator.validateEventOrdering([
      makeEvent({ sequenceNumber: 2 }),
      makeEvent({ id: 'evt-2', sequenceNumber: 1 }),
    ]);
    expect(result.valid).toBe(false);
  });

  it('should validate event payload', () => {
    const result = validator.validateEventPayload(makeEvent());
    expect(result.valid).toBe(true);
  });

  it('should detect anomalies', () => {
    const result = validator.detectAnomalies([
      makeEvent({ sequenceNumber: 1 }),
      makeEvent({ id: 'evt-2', sequenceNumber: 10 }),
    ]);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should detect duplicate events', () => {
    const result = validator.detectAnomalies([
      makeEvent({ id: 'dup' }),
      makeEvent({ id: 'dup' }),
    ]);
    expect(result.some((a) => a.type === 'DUPLICATE_ANOMALY')).toBe(true);
  });
});

describe('ReplayValidator', () => {
  const validator = new ReplayValidator();
  const link = {
    id: 'r-1', sessionId: 'sess-1', snapshotId: 'snap-1', linkType: 'FULL_RESTORE',
    status: 'PENDING', createdAt: '2024-01-01T00:00:00Z',
  };

  it('should validate valid replay link', () => {
    const result = validator.validateReplayLink(link);
    expect(result.valid).toBe(true);
  });

  it('should detect missing link ID', () => {
    const result = validator.validateReplayLink({ ...link, id: undefined });
    expect(result.valid).toBe(false);
  });

  it('should detect invalid link type', () => {
    const result = validator.validateReplayLink({ ...link, linkType: 'BAD' });
    expect(result.valid).toBe(false);
  });

  it('should validate replay integrity', () => {
    const result = validator.validateReplayIntegrity(
      { id: 'sess-1' } as never,
      { id: 'snap-1', sessionId: 'sess-1', stateHash: 'hash' } as never,
      link,
    );
    expect(result.snapshotExists).toBe(true);
    expect(result.stateMatch).toBe(true);
  });

  it('should validate replay chain', () => {
    const result = validator.validateReplayChain([link]);
    expect(result.valid).toBe(true);
  });

  it('should warn on empty replay chain', () => {
    const result = validator.validateReplayChain([]);
    expect(result.valid).toBe(true);
  });

  it('should validate replay state', () => {
    const result = validator.validateReplayState(
      { id: 'sess-1' } as never,
      { id: 'snap-1', sessionId: 'sess-1', stateHash: 'hash' } as never,
    );
    expect(result.valid).toBe(true);
  });
});

describe('IntegrityValidator', () => {
  const validator = new IntegrityValidator();

  it('should validate session integrity', () => {
    const result = validator.validateSessionIntegrity(
      { id: 'sess-1', projectId: 'proj-1', status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', eventCount: 0, snapshotCount: 0, interactionCount: 0, tags: [], priority: 'HIGH' },
      [],
      [],
      [],
    );
    expect(result.valid).toBe(true);
  });

  it('should check referential integrity', () => {
    const result = validator.checkReferentialIntegrity('sess-1', [], []);
    expect(result.valid).toBe(true);
  });

  it('should check temporal integrity', () => {
    const result = validator.checkTemporalIntegrity('sess-1', []);
    expect(result.valid).toBe(true);
  });

  it('should check state consistency', () => {
    const result = validator.checkStateConsistency(
      { id: 'sess-1', status: 'COMPLETED' } as never,
      { id: 'snap-1', sessionId: 'sess-1', version: 1, stateHash: 'hash' } as never,
    );
    expect(result.valid).toBe(true);
  });

  it('should generate integrity report', () => {
    const report = validator.generateIntegrityReport('sess-1', null, [], [], []);
    expect(report.passed).toBe(false);
    expect(report.sessionId).toBe('sess-1');
  });

  it('should generate integrity report with valid session', () => {
    const report = validator.generateIntegrityReport(
      'sess-1',
      { id: 'sess-1', projectId: 'proj-1', status: 'ACTIVE', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z', eventCount: 0, snapshotCount: 0, interactionCount: 0, tags: [], priority: 'HIGH' },
      [{ id: 'evt-1', sessionId: 'sess-1', eventType: 'SESSION_CREATED', timestamp: '2024-01-01T00:00:00Z', sequenceNumber: 1, correlationId: 'c1', causationId: 'caus-1', payloadJson: '{}', metadataJson: '{}' }],
      [],
      [],
    );
    expect(report.sessionId).toBe('sess-1');
  });
});
