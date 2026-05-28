import { randomBytes } from 'node:crypto';
import type { SessionStatus } from '../types/index.ts';
import { LifecycleError } from '../errors/index.ts';
import { nowISO } from '../utils/index.ts';

export interface SessionLifecycleData {
  id: string;
  projectId: string;
  status: SessionStatus;
  goal?: string;
  failureReason?: string;
  createdAt: string;
  activatedAt?: string;
  pausedAt?: string;
  completedAt?: string;
  archivedAt?: string;
  failedAt?: string;
  deletedAt?: string;
}

function generateLifecycleId(): string {
  return `lifecycle_${randomBytes(12).toString('hex')}`;
}

export class LifecycleManager {
  private sessions: Map<string, SessionLifecycleData> = new Map();

  public createSession(projectId: string, goal?: string): SessionLifecycleData {
    const id = generateLifecycleId();
    const session: SessionLifecycleData = {
      id,
      projectId,
      status: 'CREATED',
      goal,
      createdAt: nowISO(),
    };
    this.sessions.set(id, session);
    return session;
  }

  public activateSession(sessionId: string): SessionLifecycleData {
    const session = this.getSessionOrThrow(sessionId);
    this.assertStatus(session, 'CREATED', 'ACTIVE');

    session.status = 'ACTIVE';
    session.activatedAt = nowISO();
    this.sessions.set(sessionId, session);
    return session;
  }

  public pauseSession(sessionId: string): SessionLifecycleData {
    const session = this.getSessionOrThrow(sessionId);
    this.assertStatus(session, 'ACTIVE', 'PAUSED');

    session.status = 'PAUSED';
    session.pausedAt = nowISO();
    this.sessions.set(sessionId, session);
    return session;
  }

  public resumeSession(sessionId: string): SessionLifecycleData {
    const session = this.getSessionOrThrow(sessionId);
    this.assertStatus(session, 'PAUSED', 'ACTIVE');

    session.status = 'ACTIVE';
    this.sessions.set(sessionId, session);
    return session;
  }

  public completeSession(sessionId: string): SessionLifecycleData {
    const session = this.getSessionOrThrow(sessionId);
    this.assertStatus(session, 'ACTIVE', 'COMPLETED');

    session.status = 'COMPLETED';
    session.completedAt = nowISO();
    this.sessions.set(sessionId, session);
    return session;
  }

  public archiveSession(sessionId: string): SessionLifecycleData {
    const session = this.getSessionOrThrow(sessionId);
    this.assertStatuses(session, ['COMPLETED', 'FAILED'], 'ARCHIVED');

    session.status = 'ARCHIVED';
    session.archivedAt = nowISO();
    this.sessions.set(sessionId, session);
    return session;
  }

  public failSession(sessionId: string, reason: string): SessionLifecycleData {
    const session = this.getSessionOrThrow(sessionId);
    const failAllowedStatuses: SessionStatus[] = ['CREATED', 'ACTIVE', 'PAUSED', 'COMPLETED'];
    if (!failAllowedStatuses.includes(session.status)) {
      throw new LifecycleError(
        `Cannot fail session in status ${session.status}`,
        { sessionId, currentStatus: session.status },
      );
    }

    session.status = 'FAILED';
    session.failedAt = nowISO();
    session.failureReason = reason;
    this.sessions.set(sessionId, session);
    return session;
  }

  public deleteSession(sessionId: string): void {
    if (!this.sessions.has(sessionId)) {
      throw new LifecycleError('Session not found', { sessionId });
    }
    this.sessions.delete(sessionId);
  }

  public getSession(sessionId: string): SessionLifecycleData | undefined {
    return this.sessions.get(sessionId);
  }

  private getSessionOrThrow(sessionId: string): SessionLifecycleData {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new LifecycleError('Session not found', { sessionId });
    }
    return session;
  }

  private assertStatus(session: SessionLifecycleData, expected: SessionStatus, target: SessionStatus): void {
    if (session.status !== expected) {
      throw new LifecycleError(
        `Cannot transition to ${target} from status ${session.status}`,
        { sessionId: session.id, currentStatus: session.status, target },
      );
    }
  }

  private assertStatuses(session: SessionLifecycleData, expected: SessionStatus[], target: SessionStatus): void {
    if (!expected.includes(session.status)) {
      throw new LifecycleError(
        `Cannot transition to ${target} from status ${session.status}`,
        { sessionId: session.id, currentStatus: session.status, target, allowed: expected },
      );
    }
  }
}
