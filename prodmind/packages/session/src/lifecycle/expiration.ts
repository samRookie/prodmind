import { LifecycleError } from '../errors/index.ts';

export interface ExpirationCheckResult {
  expired: boolean;
  expirationDate: string;
  remainingMs: number;
}

export class SessionExpiration {
  private defaultMaxLifetimeMs: number = 1000 * 60 * 60 * 24 * 30;

  public checkExpiration(session: { id: string; createdAt: string }): ExpirationCheckResult {
    const expirationDate = this.getExpirationDate(session);
    const now = new Date();
    const expiresAt = new Date(expirationDate);
    const remainingMs = expiresAt.getTime() - now.getTime();

    return {
      expired: remainingMs <= 0,
      expirationDate,
      remainingMs: Math.max(0, remainingMs),
    };
  }

  public getExpirationDate(session: { id: string; createdAt: string }): string {
    const created = new Date(session.createdAt);
    const expiresAt = new Date(created.getTime() + this.defaultMaxLifetimeMs);
    return expiresAt.toISOString();
  }

  public extendExpiration(sessions: Map<string, { id: string; createdAt: string }>, sessionId: string, days: number): string {
    const session = sessions.get(sessionId);
    if (!session) {
      throw new LifecycleError('Session not found', { sessionId });
    }

    const currentExpiry = new Date(this.getExpirationDate(session));
    const extended = new Date(currentExpiry.getTime() + days * 24 * 60 * 60 * 1000);
    const extendedStr = extended.toISOString();

    return extendedStr;
  }

  public notifyExpiring(sessions: Array<{ id: string; createdAt: string }>, thresholdDays: number = 7): Array<{ id: string; createdAt: string }> {
    const now = new Date();
    return sessions.filter((s) => {
      const created = new Date(s.createdAt);
      const expiresAt = new Date(created.getTime() + this.defaultMaxLifetimeMs);
      const remainingMs = expiresAt.getTime() - now.getTime();
      const remainingDays = remainingMs / (1000 * 60 * 60 * 24);
      return remainingDays > 0 && remainingDays <= thresholdDays;
    });
  }

  public cleanupExpired(sessions: Map<string, { id: string; createdAt: string }>): string[] {
    const expiredIds: string[] = [];
    for (const [id, session] of sessions) {
      const check = this.checkExpiration(session);
      if (check.expired) {
        expiredIds.push(id);
      }
    }
    return expiredIds;
  }
}
