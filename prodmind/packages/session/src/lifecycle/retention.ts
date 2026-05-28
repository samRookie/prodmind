import { LifecycleError } from '../errors/index.ts';

export interface RetentionConfig {
  retentionDays: number;
}

export interface SessionExpiryInfo {
  sessionId: string;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
}

export class SessionRetention {
  private retentionDays: number = 90;

  public applyRetentionPolicy(sessions: Array<{ id: string; createdAt: string }>): string[] {
    const expired = this.getExpiredSessions(sessions);
    const now = new Date();
    const expiredIds: string[] = [];

    for (const session of expired) {
      const created = new Date(session.createdAt);
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays > this.retentionDays) {
        expiredIds.push(session.id);
      }
    }

    return expiredIds;
  }

  public getExpiredSessions(sessions: Array<{ id: string; createdAt: string }>): Array<{ id: string; createdAt: string }> {
    const now = new Date();
    return sessions.filter((s) => {
      const created = new Date(s.createdAt);
      const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > this.retentionDays;
    });
  }

  public setRetentionPeriod(days: number): void {
    if (days <= 0) {
      throw new LifecycleError('Retention period must be positive', { days });
    }
    this.retentionDays = days;
  }

  public getRetentionPeriod(): number {
    return this.retentionDays;
  }

  public isExpired(session: { id: string; createdAt: string }): boolean {
    const created = new Date(session.createdAt);
    const now = new Date();
    const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays > this.retentionDays;
  }
}
