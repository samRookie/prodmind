import type { SessionStatus } from '../types/index.ts';
import { LifecycleError } from '../errors/index.ts';

export interface PolicyDecision {
  allowed: boolean;
  reason?: string;
}

export class LifecyclePolicy {
  private maxPauseDurationMs: number = 1000 * 60 * 60 * 24 * 7;
  private maxSessionDurationMs: number = 1000 * 60 * 60 * 24 * 30;

  public canActivate(session: { status: SessionStatus; createdAt?: string }): PolicyDecision {
    if (session.status !== 'CREATED') {
      return { allowed: false, reason: `Cannot activate session in status ${session.status}` };
    }
    return { allowed: true };
  }

  public canArchive(session: { status: SessionStatus; createdAt?: string }): PolicyDecision {
    const allowedStatuses: SessionStatus[] = ['COMPLETED', 'FAILED'];
    if (!allowedStatuses.includes(session.status)) {
      return { allowed: false, reason: `Cannot archive session in status ${session.status}` };
    }
    return { allowed: true };
  }

  public canDelete(session: { status: SessionStatus; createdAt?: string }): PolicyDecision {
    const allowedStatuses: SessionStatus[] = ['COMPLETED', 'ARCHIVED', 'FAILED'];
    if (!allowedStatuses.includes(session.status)) {
      return { allowed: false, reason: `Cannot delete session in status ${session.status}` };
    }
    return { allowed: true };
  }

  public canPause(session: { status: SessionStatus; createdAt?: string }): PolicyDecision {
    if (session.status !== 'ACTIVE') {
      return { allowed: false, reason: `Cannot pause session in status ${session.status}` };
    }
    return { allowed: true };
  }

  public getMaxPauseDuration(): number {
    return this.maxPauseDurationMs;
  }

  public getMaxSessionDuration(): number {
    return this.maxSessionDurationMs;
  }

  public setMaxPauseDuration(ms: number): void {
    if (ms <= 0) {
      throw new LifecycleError('Max pause duration must be positive', { ms });
    }
    this.maxPauseDurationMs = ms;
  }

  public setMaxSessionDuration(ms: number): void {
    if (ms <= 0) {
      throw new LifecycleError('Max session duration must be positive', { ms });
    }
    this.maxSessionDurationMs = ms;
  }
}
