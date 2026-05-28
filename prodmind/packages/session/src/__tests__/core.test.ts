import { describe, it, expect } from 'vitest';
import { AnalysisSession } from '../core/analysis-session.ts';
import type { AnalysisSessionData } from '../core/analysis-session.ts';
import { SessionManager } from '../core/session-manager.ts';
import { VALID_TRANSITIONS, isValidTransition, getNextStatuses, isTerminalStatus, statusToString } from '../core/session-state.ts';
import { createSessionContext, addTimelineEvent, addSnapshot, compressContext } from '../core/session-context.ts';
import { createFromScratch, createFromTemplate, createFromReplay, validateSessionInput } from '../core/session-factory.ts';
import { register, unregister, getActive, getByProject, count, isRegistered } from '../core/session-registry.ts';
import { createRuntime, updateActivity, getRuntimeMetrics, isExpired } from '../core/runtime.ts';
import type { SessionRuntime } from '../core/runtime.ts';
import { SessionNotFoundError, SessionStateError, SessionValidationError } from '../errors/index.ts';

describe('AnalysisSession', () => {
  it('should create session with required fields', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    expect(session.id).toBeDefined();
    expect(session.projectId).toBe('proj-1');
    expect(session.status).toBe('CREATED');
    expect(session.priority).toBe('MEDIUM');
    expect(session.createdAt).toBeDefined();
  });

  it('should create session with all fields', () => {
    const data: AnalysisSessionData = {
      id: 'sess-1',
      projectId: 'proj-1',
      status: 'ACTIVE',
      goal: 'Test goal',
      priority: 'HIGH',
      tags: ['urgent'],
      eventCount: 5,
    };
    const session = new AnalysisSession(data);
    expect(session.id).toBe('sess-1');
    expect(session.goal).toBe('Test goal');
    expect(session.tags).toEqual(['urgent']);
  });

  it('should transition to valid status', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    session.transitionTo('ACTIVE');
    expect(session.status).toBe('ACTIVE');
    expect(session.activatedAt).toBeDefined();
  });

  it('should throw on invalid transition', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    session.transitionTo('ACTIVE');
    session.transitionTo('COMPLETED');
    expect(() => session.transitionTo('ACTIVE')).toThrow(SessionStateError);
  });

  it('should set completedAt on COMPLETED transition', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    session.transitionTo('ACTIVE');
    session.transitionTo('COMPLETED');
    expect(session.status).toBe('COMPLETED');
    expect(session.completedAt).toBeDefined();
  });

  it('should set failedAt and failureReason on FAILED transition', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    session.transitionTo('FAILED', 'Something went wrong');
    expect(session.status).toBe('FAILED');
    expect(session.failureReason).toBe('Something went wrong');
    expect(session.failedAt).toBeDefined();
  });

  it('should update goal', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    session.updateGoal('New goal');
    expect(session.goal).toBe('New goal');
  });

  it('should update priority', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    session.updatePriority('CRITICAL');
    expect(session.priority).toBe('CRITICAL');
  });

  it('should update hypothesis', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    const hypothesis = { id: 'hyp-1', statement: 'test', confidence: 0.8, status: 'PROPOSED' as const, createdAt: new Date().toISOString(), evidence: [] };
    session.updateHypothesis(hypothesis);
    expect(session.hypothesis).toEqual(hypothesis);
  });

  it('should canTransitionTo return true for valid transition', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    expect(session.canTransitionTo('ACTIVE')).toBe(true);
  });

  it('should canTransitionTo return false for invalid transition', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    expect(session.canTransitionTo('ARCHIVED')).toBe(false);
  });
});

describe('SessionManager', () => {
  it('should create and retrieve session', () => {
    const manager = new SessionManager();
    const session = manager.createSession({ projectId: 'proj-1' });
    expect(manager.getSession(session.id)).toBe(session);
  });

  it('should throw on get non-existent session', () => {
    const manager = new SessionManager();
    expect(() => manager.getSession('non-existent')).toThrow(SessionNotFoundError);
  });

  it('should list sessions with filters', () => {
    const manager = new SessionManager();
    manager.createSession({ projectId: 'proj-1', status: 'ACTIVE', priority: 'HIGH' });
    manager.createSession({ projectId: 'proj-1', status: 'CREATED', priority: 'LOW' });
    manager.createSession({ projectId: 'proj-2', status: 'ACTIVE', priority: 'MEDIUM' });
    expect(manager.listSessions({ projectId: 'proj-1' })).toHaveLength(2);
    expect(manager.listSessions({ status: 'ACTIVE' })).toHaveLength(2);
    expect(manager.listSessions({ priority: 'HIGH' })).toHaveLength(1);
  });

  it('should update session fields', () => {
    const manager = new SessionManager();
    const session = manager.createSession({ projectId: 'proj-1' });
    manager.updateSession(session.id, { goal: 'Updated goal', priority: 'CRITICAL' });
    expect(session.goal).toBe('Updated goal');
    expect(session.priority).toBe('CRITICAL');
  });

  it('should delete session', () => {
    const manager = new SessionManager();
    const session = manager.createSession({ projectId: 'proj-1' });
    manager.deleteSession(session.id);
    expect(() => manager.getSession(session.id)).toThrow(SessionNotFoundError);
  });

  it('should throw on delete non-existent session', () => {
    const manager = new SessionManager();
    expect(() => manager.deleteSession('non-existent')).toThrow(SessionNotFoundError);
  });

  it('should transition session via manager', () => {
    const manager = new SessionManager();
    const session = manager.createSession({ projectId: 'proj-1' });
    manager.transitionSession(session.id, 'ACTIVE');
    expect(session.status).toBe('ACTIVE');
  });

  it('should getAllSessionsSummary return summaries', () => {
    const manager = new SessionManager();
    manager.createSession({ projectId: 'proj-1', goal: 'Goal 1', tags: ['tag1'] });
    manager.createSession({ projectId: 'proj-2', goal: 'Goal 2' });
    const summaries = manager.getAllSessionsSummary();
    expect(summaries).toHaveLength(2);
    expect(summaries[0]?.investigationGoal).toBe('Goal 1');
    expect(summaries[0]?.tags).toEqual(['tag1']);
  });
});

describe('session-state', () => {
  it('should have all valid transitions defined', () => {
    expect(VALID_TRANSITIONS.has('CREATED')).toBe(true);
    expect(VALID_TRANSITIONS.has('ACTIVE')).toBe(true);
    expect(VALID_TRANSITIONS.has('PAUSED')).toBe(true);
    expect(VALID_TRANSITIONS.has('COMPLETED')).toBe(true);
    expect(VALID_TRANSITIONS.has('ARCHIVED')).toBe(true);
    expect(VALID_TRANSITIONS.has('FAILED')).toBe(true);
  });

  it('should validate CREATED->ACTIVE transition', () => {
    expect(isValidTransition('CREATED', 'ACTIVE')).toBe(true);
  });

  it('should reject COMPLETED->ACTIVE transition', () => {
    expect(isValidTransition('COMPLETED', 'ACTIVE')).toBe(false);
  });

  it('should get next statuses', () => {
    const next = getNextStatuses('PAUSED');
    expect(next).toContain('ACTIVE');
    expect(next).toContain('FAILED');
  });

  it('should return empty array for terminal status', () => {
    expect(getNextStatuses('FAILED')).toEqual([]);
  });

  it('should identify terminal statuses', () => {
    expect(isTerminalStatus('COMPLETED')).toBe(true);
    expect(isTerminalStatus('ARCHIVED')).toBe(true);
    expect(isTerminalStatus('FAILED')).toBe(true);
    expect(isTerminalStatus('CREATED')).toBe(false);
  });

  it('should convert status to string', () => {
    expect(statusToString('CREATED')).toBe('Created');
    expect(statusToString('FAILED')).toBe('Failed');
  });
});

describe('session-context', () => {
  it('should create context from session', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    const context = createSessionContext(session);
    expect(context.session).toBe(session);
    expect(context.timelineEvents).toEqual([]);
  });

  it('should add timeline event to context', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    const context = createSessionContext(session);
    const event = { sessionId: session.id, id: 'evt-1', eventType: 'SESSION_CREATED' as const, sequenceNumber: 1, timestamp: new Date().toISOString() };
    const updated = addTimelineEvent(context, event as never);
    expect(updated.timelineEvents).toHaveLength(1);
  });

  it('should add snapshot to context', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    const context = createSessionContext(session);
    const snapshot = { id: 'snap-1', sessionId: session.id, version: 1, stateHash: 'abc' };
    const updated = addSnapshot(context, snapshot as never);
    expect(updated.snapshots).toHaveLength(1);
  });

  it('should compress context trimming arrays', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    const context = createSessionContext(session);
    for (let i = 0; i < 20; i++) {
      context.timelineEvents?.push({ id: `evt-${i}`, sessionId: session.id, eventType: 'SESSION_CREATED' as const, sequenceNumber: i, timestamp: new Date().toISOString() } as never);
    }
    const compressed = compressContext(context);
    expect(compressed.timelineEvents?.length).toBe(10);
  });
});

describe('session-factory', () => {
  it('should create session from scratch', () => {
    const session = createFromScratch('proj-1', 'Investigate anomaly');
    expect(session.projectId).toBe('proj-1');
    expect(session.goal).toBe('Investigate anomaly');
    expect(session.status).toBe('CREATED');
  });

  it('should create session from template', () => {
    const session = createFromTemplate({ projectId: 'proj-1', goal: 'Template goal', priority: 'HIGH', tags: ['auto'] });
    expect(session.projectId).toBe('proj-1');
    expect(session.priority).toBe('HIGH');
  });

  it('should create session from replay data', () => {
    const session = createFromReplay({ projectId: 'proj-1', status: 'ACTIVE', priority: 'HIGH', eventCount: 10 });
    expect(session.status).toBe('ACTIVE');
    expect(session.eventCount).toBe(10);
  });

  it('should validate session input', () => {
    expect(() => validateSessionInput({ projectId: '' })).toThrow(SessionValidationError);
  });

  it('should accept valid session input', () => {
    const result = validateSessionInput({ projectId: 'proj-1', goal: 'Test' });
    expect(result.projectId).toBe('proj-1');
  });
});

describe('session-registry', () => {
  beforeEach(() => {
    const sessions = [new AnalysisSession({ id: 'reg-1', projectId: 'proj-1', status: 'ACTIVE' })];
    sessions.forEach((s) => { unregister(s.id); });
  });

  it('should register and check session', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    register(session);
    expect(isRegistered(session.id)).toBe(true);
  });

  it('should unregister session', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    register(session);
    unregister(session.id);
    expect(isRegistered(session.id)).toBe(false);
  });

  it('should get active sessions', () => {
    const active = new AnalysisSession({ id: 'act-1', projectId: 'proj-1', status: 'ACTIVE' });
    const created = new AnalysisSession({ id: 'cre-1', projectId: 'proj-1', status: 'CREATED' });
    register(active);
    register(created);
    expect(getActive()).toHaveLength(1);
    unregister('act-1');
    unregister('cre-1');
  });

  it('should get sessions by project', () => {
    const s1 = new AnalysisSession({ id: 'proj-s1', projectId: 'proj-x' });
    const s2 = new AnalysisSession({ id: 'proj-s2', projectId: 'proj-y' });
    register(s1);
    register(s2);
    expect(getByProject('proj-x')).toHaveLength(1);
    unregister('proj-s1');
    unregister('proj-s2');
  });

  it('should count registered sessions', () => {
    const registryCount = count();
    const s1 = new AnalysisSession({ id: 'cnt-1', projectId: 'proj-1' });
    const s2 = new AnalysisSession({ id: 'cnt-2', projectId: 'proj-1' });
    register(s1);
    register(s2);
    expect(count()).toBe(registryCount + 2);
    unregister('cnt-1');
    unregister('cnt-2');
  });
});

describe('runtime', () => {
  it('should create runtime from session', () => {
    const session = new AnalysisSession({ projectId: 'proj-1', status: 'ACTIVE' });
    const config = { maxTimelineEvents: 100, maxSnapshots: 50, autoSnapshotInterval: 60, retentionDays: 30, maxInteractionsPerSession: 200 };
    const runtime = createRuntime(session, config);
    expect(runtime.sessionId).toBe(session.id);
    expect(runtime.metrics.elapsedMs).toBe(0);
  });

  it('should update activity timestamp', () => {
    const session = new AnalysisSession({ projectId: 'proj-1' });
    const config = { maxTimelineEvents: 100, maxSnapshots: 50, autoSnapshotInterval: 60, retentionDays: 30, maxInteractionsPerSession: 200 };
    const runtime = createRuntime(session, config);
    const updated = updateActivity(runtime);
    expect(updated).not.toBe(runtime);
    expect(updated.sessionId).toBe(runtime.sessionId);
  });

  it('should get runtime metrics', () => {
    const runtime: SessionRuntime = {
      sessionId: 'sess-1',
      config: { maxTimelineEvents: 100, maxSnapshots: 50, autoSnapshotInterval: 60, retentionDays: 30, maxInteractionsPerSession: 200 },
      startTime: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      metrics: { elapsedMs: 0, eventRate: 0, interactionRate: 0, snapshotRate: 0 },
    };
    const metrics = getRuntimeMetrics(runtime);
    expect(metrics.elapsedMs).toBe(0);
  });

  it('should check expiration', () => {
    const runtime: SessionRuntime = {
      sessionId: 'sess-1',
      config: { maxTimelineEvents: 100, maxSnapshots: 50, autoSnapshotInterval: 60, retentionDays: 30, maxInteractionsPerSession: 200 },
      startTime: new Date(Date.now() - 100_000).toISOString(),
      lastActivity: new Date().toISOString(),
      metrics: { elapsedMs: 100_000, eventRate: 0, interactionRate: 0, snapshotRate: 0 },
    };
    expect(isExpired(runtime, 50_000)).toBe(true);
    expect(isExpired(runtime, 200_000)).toBe(false);
  });
});
