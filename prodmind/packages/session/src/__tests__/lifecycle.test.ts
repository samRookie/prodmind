import { describe, it, expect } from 'vitest';
import { LifecycleManager } from '../lifecycle/lifecycle-manager.ts';
import { LifecyclePolicy } from '../lifecycle/lifecycle-policy.ts';
import { SessionArchiver } from '../lifecycle/archival.ts';
import { SessionRetention } from '../lifecycle/retention.ts';
import { SessionExpiration } from '../lifecycle/expiration.ts';
import { LifecycleEventBus } from '../lifecycle/lifecycle-events.ts';
import { LifecycleError } from '../errors/index.ts';

describe('LifecycleManager', () => {
  it('should create session', () => {
    const lm = new LifecycleManager();
    const session = lm.createSession('proj-1');
    expect(session.status).toBe('CREATED');
    expect(session.id).toBeDefined();
  });

  it('should create session with goal', () => {
    const lm = new LifecycleManager();
    const session = lm.createSession('proj-1', 'test goal');
    expect(session.goal).toBe('test goal');
  });

  it('should activate session', () => {
    const lm = new LifecycleManager();
    const s = lm.createSession('proj-1');
    const active = lm.activateSession(s.id);
    expect(active.status).toBe('ACTIVE');
  });

  it('should throw on activate invalid status', () => {
    const lm = new LifecycleManager();
    const s = lm.createSession('proj-1');
    lm.activateSession(s.id);
    expect(() => lm.activateSession(s.id)).toThrow(LifecycleError);
  });

  it('should pause session', () => {
    const lm = new LifecycleManager();
    const s = lm.createSession('proj-1');
    lm.activateSession(s.id);
    const paused = lm.pauseSession(s.id);
    expect(paused.status).toBe('PAUSED');
  });

  it('should resume session', () => {
    const lm = new LifecycleManager();
    const s = lm.createSession('proj-1');
    lm.activateSession(s.id);
    lm.pauseSession(s.id);
    const resumed = lm.resumeSession(s.id);
    expect(resumed.status).toBe('ACTIVE');
  });

  it('should complete session', () => {
    const lm = new LifecycleManager();
    const s = lm.createSession('proj-1');
    lm.activateSession(s.id);
    const completed = lm.completeSession(s.id);
    expect(completed.status).toBe('COMPLETED');
  });

  it('should fail session', () => {
    const lm = new LifecycleManager();
    const s = lm.createSession('proj-1');
    const failed = lm.failSession(s.id, 'reason');
    expect(failed.status).toBe('FAILED');
    expect(failed.failureReason).toBe('reason');
  });

  it('should archive session', () => {
    const lm = new LifecycleManager();
    const s = lm.createSession('proj-1');
    lm.activateSession(s.id);
    lm.completeSession(s.id);
    const archived = lm.archiveSession(s.id);
    expect(archived.status).toBe('ARCHIVED');
  });

  it('should throw on archive from wrong status', () => {
    const lm = new LifecycleManager();
    const s = lm.createSession('proj-1');
    expect(() => lm.archiveSession(s.id)).toThrow(LifecycleError);
  });

  it('should delete session', () => {
    const lm = new LifecycleManager();
    const s = lm.createSession('proj-1');
    lm.deleteSession(s.id);
    expect(lm.getSession(s.id)).toBeUndefined();
  });

  it('should throw on delete non-existent', () => {
    const lm = new LifecycleManager();
    expect(() => lm.deleteSession('nonexistent')).toThrow(LifecycleError);
  });

  it('should get session', () => {
    const lm = new LifecycleManager();
    const s = lm.createSession('proj-1');
    expect(lm.getSession(s.id)).toBeDefined();
    expect(lm.getSession('nonexistent')).toBeUndefined();
  });
});

describe('LifecyclePolicy', () => {
  const policy = new LifecyclePolicy();

  it('should allow activation from CREATED', () => {
    expect(policy.canActivate({ status: 'CREATED' }).allowed).toBe(true);
  });

  it('should deny activation from ACTIVE', () => {
    expect(policy.canActivate({ status: 'ACTIVE' }).allowed).toBe(false);
  });

  it('should allow archive from COMPLETED', () => {
    expect(policy.canArchive({ status: 'COMPLETED' }).allowed).toBe(true);
  });

  it('should deny archive from CREATED', () => {
    expect(policy.canArchive({ status: 'CREATED' }).allowed).toBe(false);
  });

  it('should allow delete from ARCHIVED', () => {
    expect(policy.canDelete({ status: 'ARCHIVED' }).allowed).toBe(true);
  });

  it('should deny delete from CREATED', () => {
    expect(policy.canDelete({ status: 'CREATED' }).allowed).toBe(false);
  });

  it('should allow pause from ACTIVE', () => {
    expect(policy.canPause({ status: 'ACTIVE' }).allowed).toBe(true);
  });

  it('should deny pause from PAUSED', () => {
    expect(policy.canPause({ status: 'PAUSED' }).allowed).toBe(false);
  });

  it('should get and set max pause duration', () => {
    policy.setMaxPauseDuration(5000);
    expect(policy.getMaxPauseDuration()).toBe(5000);
  });

  it('should throw on invalid max pause duration', () => {
    expect(() => policy.setMaxPauseDuration(-1)).toThrow(LifecycleError);
  });

  it('should get and set max session duration', () => {
    policy.setMaxSessionDuration(10000);
    expect(policy.getMaxSessionDuration()).toBe(10000);
  });

  it('should throw on invalid max session duration', () => {
    expect(() => policy.setMaxSessionDuration(0)).toThrow(LifecycleError);
  });
});

describe('SessionArchiver', () => {
  it('should archive session', () => {
    const archiver = new SessionArchiver();
    const record = archiver.archive('sess-1');
    expect(record.sessionId).toBe('sess-1');
    expect(record.id).toBeDefined();
  });

  it('should return existing archive on duplicate', () => {
    const archiver = new SessionArchiver();
    archiver.archive('sess-1');
    const r2 = archiver.archive('sess-1');
    expect(r2.sessionId).toBe('sess-1');
  });

  it('should unarchive session', () => {
    const archiver = new SessionArchiver();
    archiver.archive('sess-1');
    const record = archiver.unarchive('sess-1');
    expect(record.sessionId).toBe('sess-1');
  });

  it('should throw on unarchive non-existent', () => {
    const archiver = new SessionArchiver();
    expect(() => archiver.unarchive('nonexistent')).toThrow(LifecycleError);
  });

  it('should get archived sessions', () => {
    const archiver = new SessionArchiver();
    archiver.archive('sess-1');
    archiver.archive('sess-2');
    expect(archiver.getArchivedSessions()).toHaveLength(2);
  });

  it('should purge archived before date', () => {
    const archiver = new SessionArchiver();
    archiver.archive('sess-1');
    const purged = archiver.purgeArchived(new Date(Date.now() + 86400000));
    expect(purged).toHaveLength(1);
    expect(archiver.getArchivedSessions()).toHaveLength(0);
  });

  it('should get archive stats', () => {
    const archiver = new SessionArchiver();
    const stats = archiver.getArchiveStats();
    expect(stats.totalArchived).toBe(0);
    expect(stats.totalPurged).toBe(0);
  });
});

describe('SessionRetention', () => {
  it('should apply retention policy', () => {
    const retention = new SessionRetention();
    const sessions = [{ id: 'sess-1', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 100).toISOString() }];
    const expired = retention.applyRetentionPolicy(sessions);
    expect(expired).toHaveLength(1);
  });

  it('should not expire recent sessions', () => {
    const retention = new SessionRetention();
    retention.setRetentionPeriod(365);
    const sessions = [{ id: 'sess-1', createdAt: new Date().toISOString() }];
    const expired = retention.applyRetentionPolicy(sessions);
    expect(expired).toHaveLength(0);
  });

  it('should get expired sessions', () => {
    const retention = new SessionRetention();
    retention.setRetentionPeriod(1);
    const sessions = [{ id: 'sess-1', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString() }];
    expect(retention.getExpiredSessions(sessions)).toHaveLength(1);
  });

  it('should set and get retention period', () => {
    const retention = new SessionRetention();
    retention.setRetentionPeriod(30);
    expect(retention.getRetentionPeriod()).toBe(30);
  });

  it('should throw on invalid retention period', () => {
    const retention = new SessionRetention();
    expect(() => retention.setRetentionPeriod(-1)).toThrow(LifecycleError);
  });

  it('should check if session is expired', () => {
    const retention = new SessionRetention();
    retention.setRetentionPeriod(1);
    const old = { id: 'sess-1', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString() };
    expect(retention.isExpired(old)).toBe(true);
  });
});

describe('SessionExpiration', () => {
  it('should check expiration', () => {
    const exp = new SessionExpiration();
    const result = exp.checkExpiration({ id: 'sess-1', createdAt: new Date().toISOString() });
    expect(result.expired).toBe(false);
  });

  it('should get expiration date', () => {
    const exp = new SessionExpiration();
    const date = exp.getExpirationDate({ id: 'sess-1', createdAt: '2024-01-01T00:00:00Z' });
    expect(date).toBeDefined();
  });

  it('should extend expiration', () => {
    const exp = new SessionExpiration();
    const sessions = new Map([['sess-1', { id: 'sess-1', createdAt: '2024-01-01T00:00:00Z' }]]);
    const extended = exp.extendExpiration(sessions, 'sess-1', 30);
    expect(extended).toBeDefined();
  });

  it('should throw on extend non-existent session', () => {
    const exp = new SessionExpiration();
    expect(() => exp.extendExpiration(new Map(), 'nonexistent', 30)).toThrow(LifecycleError);
  });

  it('should notify expiring sessions', () => {
    const exp = new SessionExpiration();
    const sessions = [{ id: 'sess-1', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 25).toISOString() }];
    expect(exp.notifyExpiring(sessions, 7)).toHaveLength(1);
  });

  it('should cleanup expired sessions', () => {
    const exp = new SessionExpiration();
    const old = { id: 'sess-1', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 31).toISOString() };
    const sessions = new Map([['sess-1', old]]);
    expect(exp.cleanupExpired(sessions)).toHaveLength(1);
  });
});

describe('LifecycleEventBus', () => {
  it('should emit event', () => {
    const bus = new LifecycleEventBus();
    const event = bus.emit({ type: 'SESSION_CREATED', sessionId: 'sess-1' });
    expect(event.type).toBe('SESSION_CREATED');
    expect(event.id).toBeDefined();
  });

  it('should register handler', () => {
    const bus = new LifecycleEventBus();
    let called = false;
    bus.on('SESSION_CREATED', () => { called = true; });
    bus.emit({ type: 'SESSION_CREATED', sessionId: 'sess-1' });
    expect(called).toBe(true);
  });

  it('should unregister handler', () => {
    const bus = new LifecycleEventBus();
    let called = false;
    const handler = () => { called = true; };
    bus.on('SESSION_CREATED', handler);
    bus.off('SESSION_CREATED', handler);
    bus.emit({ type: 'SESSION_CREATED', sessionId: 'sess-1' });
    expect(called).toBe(false);
  });

  it('should fire handler once', () => {
    const bus = new LifecycleEventBus();
    let count = 0;
    bus.once('SESSION_CREATED', () => { count++; });
    bus.emit({ type: 'SESSION_CREATED', sessionId: 'sess-1' });
    bus.emit({ type: 'SESSION_CREATED', sessionId: 'sess-1' });
    expect(count).toBe(1);
  });

  it('should get event history', () => {
    const bus = new LifecycleEventBus();
    bus.emit({ type: 'SESSION_CREATED', sessionId: 'sess-1' });
    bus.emit({ type: 'SESSION_ACTIVATED', sessionId: 'sess-1' });
    expect(bus.getEventHistory()).toHaveLength(2);
    expect(bus.getEventHistory('SESSION_CREATED')).toHaveLength(1);
  });

  it('should clear history', () => {
    const bus = new LifecycleEventBus();
    bus.emit({ type: 'SESSION_CREATED', sessionId: 'sess-1' });
    bus.clearHistory();
    expect(bus.getEventHistory()).toHaveLength(0);
  });

  it('should handle handler errors silently', () => {
    const bus = new LifecycleEventBus();
    bus.on('SESSION_CREATED', () => { throw new Error('handler error'); });
    expect(() => bus.emit({ type: 'SESSION_CREATED', sessionId: 'sess-1' })).not.toThrow();
  });
});
