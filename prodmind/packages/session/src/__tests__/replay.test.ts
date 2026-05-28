import { describe, it, expect } from 'vitest';
import { SessionReplay } from '../replay/session-replay.ts';
import { ReplayLinkageEngine } from '../replay/linkage.ts';
import { ReplayRestorationEngine } from '../replay/restoration.ts';
import { ReplayValidator } from '../replay/validation.ts';
import { ReplayAudit } from '../replay/audit.ts';
import { ReplayError, RestorationError } from '../errors/index.ts';

describe('SessionReplay', () => {
  it('should create with required fields', () => {
    const replay = new SessionReplay({ sessionId: 'sess-1', linkType: 'FULL_RESTORE' });
    expect(replay.id).toBeDefined();
    expect(replay.sessionId).toBe('sess-1');
    expect(replay.status).toBe('PENDING');
  });

  it('should link to snapshot', () => {
    const replay = new SessionReplay({ sessionId: 'sess-1', linkType: 'FULL_RESTORE' });
    replay.link({ id: 'snap-1', stateHash: 'hash123' }, 'FULL_RESTORE');
    expect(replay.snapshotId).toBe('snap-1');
    expect(replay.status).toBe('LINKED');
    expect(replay.verificationHash).toBeDefined();
  });

  it('should verify linked replay', () => {
    const replay = new SessionReplay({ sessionId: 'sess-1', linkType: 'FULL_RESTORE' });
    replay.link({ id: 'snap-1', stateHash: 'hash123' }, 'FULL_RESTORE');
    expect(replay.verify()).toBe(true);
    expect(replay.status).toBe('VERIFIED');
  });

  it('should throw on verify without snapshot', () => {
    const replay = new SessionReplay({ sessionId: 'sess-1', linkType: 'FULL_RESTORE' });
    expect(() => replay.verify()).toThrow(ReplayError);
  });

  it('should unlink replay', () => {
    const replay = new SessionReplay({ sessionId: 'sess-1', linkType: 'FULL_RESTORE' });
    replay.link({ id: 'snap-1' }, 'FULL_RESTORE');
    replay.unlink();
    expect(replay.status).toBe('STALE');
    expect(replay.snapshotId).toBeUndefined();
  });

  it('should mark as verified', () => {
    const replay = new SessionReplay({ sessionId: 'sess-1', linkType: 'FULL_RESTORE' });
    replay.markAsVerified();
    expect(replay.status).toBe('VERIFIED');
  });

  it('should mark as failed', () => {
    const replay = new SessionReplay({ sessionId: 'sess-1', linkType: 'FULL_RESTORE' });
    replay.markAsFailed('reason');
    expect(replay.status).toBe('FAILED');
    expect(replay.failureReason).toBe('reason');
  });

  it('should serialize and deserialize via JSON', () => {
    const original = new SessionReplay({ sessionId: 'sess-1', linkType: 'STATE_SYNC' });
    const json = original.toJSON();
    const restored = SessionReplay.fromJSON(json);
    expect(restored.sessionId).toBe('sess-1');
    expect(restored.linkType).toBe('STATE_SYNC');
  });
});

describe('ReplayLinkageEngine', () => {
  it('should create link', () => {
    const engine = new ReplayLinkageEngine();
    const link = engine.createLink('sess-1', 'snap-1', 'FULL_RESTORE');
    expect(link.sessionId).toBe('sess-1');
    expect(link.status).toBe('PENDING');
  });

  it('should get links by session', () => {
    const engine = new ReplayLinkageEngine();
    engine.createLink('sess-1', 'snap-1', 'FULL_RESTORE');
    engine.createLink('sess-1', 'snap-2', 'VERIFICATION');
    expect(engine.getLinksBySession('sess-1')).toHaveLength(2);
  });

  it('should get active link', () => {
    const engine = new ReplayLinkageEngine();
    const link = engine.createLink('sess-1', 'snap-1', 'FULL_RESTORE');
    expect(engine.getActiveLink('sess-1')?.id).toBe(link.id);
  });

  it('should verify link', () => {
    const engine = new ReplayLinkageEngine();
    const link = engine.createLink('sess-1', 'snap-1', 'FULL_RESTORE');
    link.status = 'LINKED';
    expect(engine.verifyLink(link)).toBe(true);
  });

  it('should throw on verify non-existent link', () => {
    const engine = new ReplayLinkageEngine();
    expect(() => engine.verifyLink({ id: 'nonexistent', sessionId: 'sess-1', snapshotId: 'snap-1', linkType: 'FULL_RESTORE', status: 'LINKED', createdAt: new Date().toISOString() })).toThrow(ReplayError);
  });

  it('should deactivate link', () => {
    const engine = new ReplayLinkageEngine();
    const link = engine.createLink('sess-1', 'snap-1', 'FULL_RESTORE');
    engine.deactivateLink(link.id);
    expect(engine.getActiveLink('sess-1')).toBeUndefined();
  });

  it('should throw on deactivate non-existent link', () => {
    const engine = new ReplayLinkageEngine();
    expect(() => engine.deactivateLink('nonexistent')).toThrow(ReplayError);
  });

  it('should remove link', () => {
    const engine = new ReplayLinkageEngine();
    const link = engine.createLink('sess-1', 'snap-1', 'FULL_RESTORE');
    engine.removeLink(link.id);
    expect(engine.getLinksBySession('sess-1')).toHaveLength(0);
  });

  it('should create full restore and verification links', () => {
    const engine = new ReplayLinkageEngine();
    const fr = engine.createFullRestoreLink('sess-1', 'snap-1');
    const vr = engine.createVerificationLink('sess-1', 'snap-1');
    expect(fr.linkType).toBe('FULL_RESTORE');
    expect(vr.linkType).toBe('VERIFICATION');
  });

  it('should convert from SessionReplay', () => {
    const replay = new SessionReplay({ sessionId: 'sess-1', linkType: 'FULL_RESTORE' });
    const link = ReplayLinkageEngine.fromReplay(replay);
    expect(link.sessionId).toBe('sess-1');
  });
});

describe('ReplayRestorationEngine', () => {
  it('should restore from snapshot', () => {
    const engine = new ReplayRestorationEngine();
    const state = engine.restoreFromSnapshot({ id: 'sess-1' }, { id: 'snap-1', stateHash: 'hash123' });
    expect(state.status).toBe('COMPLETED');
    expect(state.snapshotId).toBe('snap-1');
  });

  it('should restore from link', () => {
    const engine = new ReplayRestorationEngine();
    const state = engine.restoreFromLink({ sessionId: 'sess-1', snapshotId: 'snap-1', status: 'VERIFIED', linkType: 'FULL_RESTORE' });
    expect(state.status).toBe('COMPLETED');
  });

  it('should throw on restore from unverified link', () => {
    const engine = new ReplayRestorationEngine();
    expect(() => engine.restoreFromLink({ sessionId: 'sess-1', snapshotId: 'snap-1', status: 'PENDING', linkType: 'FULL_RESTORE' })).toThrow(RestorationError);
  });

  it('should throw on restore from link without snapshot', () => {
    const engine = new ReplayRestorationEngine();
    expect(() => engine.restoreFromLink({ sessionId: 'sess-1', status: 'VERIFIED', linkType: 'FULL_RESTORE' })).toThrow(RestorationError);
  });

  it('should get restorable state', () => {
    const engine = new ReplayRestorationEngine();
    expect(engine.getRestorableState('sess-1')).toBeUndefined();
    engine.restoreFromSnapshot({ id: 'sess-1' }, { id: 'snap-1' });
    expect(engine.getRestorableState('sess-1')).toBeDefined();
  });

  it('should compute restoration diff', () => {
    const engine = new ReplayRestorationEngine();
    const diff = engine.computeRestorationDiff({ id: 'sess-1', stateHash: 'abc' }, { id: 'snap-1', stateHash: 'def' });
    expect(diff.changedKeys).toContain('state');
  });

  it('should validate restore target', () => {
    const engine = new ReplayRestorationEngine();
    expect(engine.validateRestoreTarget({ id: 'sess-1', status: 'ACTIVE' }, { id: 'snap-1' })).toBe(true);
    expect(engine.validateRestoreTarget({ id: 'sess-1', status: 'FAILED' }, { id: 'snap-1' })).toBe(false);
  });
});

describe('ReplayValidator', () => {
  const validator = new ReplayValidator();

  it('should validate valid replay link', () => {
    const result = validator.validateReplayLink({ id: 'r1', sessionId: 'sess-1', snapshotId: 'snap-1', linkType: 'FULL_RESTORE', status: 'PENDING' });
    expect(result.valid).toBe(true);
  });

  it('should detect missing sessionId', () => {
    const result = validator.validateReplayLink({ id: 'r1', linkType: 'FULL_RESTORE' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Link missing sessionId');
  });

  it('should detect invalid link type', () => {
    const result = validator.validateReplayLink({ id: 'r1', sessionId: 'sess-1', linkType: 'INVALID' });
    expect(result.valid).toBe(false);
  });

  it('should validate replay integrity', () => {
    const result = validator.validateReplayIntegrity({ id: 'sess-1', stateHash: 'abc' }, { id: 'snap-1', stateHash: 'def' });
    expect(result).toBe(true);
  });

  it('should return false when state hashes missing', () => {
    const result = validator.validateReplayIntegrity({ id: 'sess-1' }, { id: 'snap-1' });
    expect(result).toBe(false);
  });

  it('should validate replay chain', () => {
    const result = validator.validateReplayChain([
      { id: 'r1', sessionId: 'sess-1', snapshotId: 'snap-1', status: 'VERIFIED', linkType: 'FULL_RESTORE', createdAt: '2024-01-01T00:00:00Z' },
    ]);
    expect(result.valid).toBe(true);
  });

  it('should reject empty chain', () => {
    const result = validator.validateReplayChain([]);
    expect(result.valid).toBe(false);
  });

  it('should detect wrong restoration point', () => {
    const result = validator.validateRestorationPoint({ id: 'sess-1', status: 'FAILED' }, { id: 'snap-1' });
    expect(result.valid).toBe(false);
  });
});

describe('ReplayAudit', () => {
  it('should record link creation', () => {
    const audit = new ReplayAudit();
    const entry = audit.recordLinkCreation({ id: 'r1', sessionId: 'sess-1', snapshotId: 'snap-1', linkType: 'FULL_RESTORE' });
    expect(entry.action).toBe('LINK_CREATED');
    expect(audit.getAuditTrail('sess-1')).toHaveLength(1);
  });

  it('should record link verification', () => {
    const audit = new ReplayAudit();
    audit.recordLinkVerification({ id: 'r1', sessionId: 'sess-1' }, true);
    expect(audit.getAuditTrail('sess-1')[0]?.action).toBe('LINK_VERIFIED');
  });

  it('should record restoration outcome', () => {
    const audit = new ReplayAudit();
    audit.recordRestoration('sess-1', 'snap-1', 'COMPLETED');
    expect(audit.getAuditTrail('sess-1')[0]?.action).toBe('RESTORATION_COMPLETED');
  });

  it('should get replay history summary', () => {
    const audit = new ReplayAudit();
    audit.recordLinkCreation({ id: 'r1', sessionId: 'sess-1', snapshotId: 'snap-1', linkType: 'FULL_RESTORE' });
    audit.recordLinkVerification({ id: 'r1', sessionId: 'sess-1' }, true);
    const summary = audit.getReplayHistory('sess-1');
    expect(summary.totalLinks).toBe(1);
    expect(summary.verifiedLinks).toBe(1);
  });

  it('should return empty audit trail for unknown session', () => {
    const audit = new ReplayAudit();
    expect(audit.getAuditTrail('nonexistent')).toEqual([]);
  });
});
