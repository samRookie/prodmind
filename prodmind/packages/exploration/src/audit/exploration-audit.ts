import { nowISO, computeHash } from '../utils/index.ts';

export class ExplorationAudit {
  private entries: Array<{
    sessionId: string;
    event: string;
    details: Record<string, unknown>;
    timestamp: string;
    fingerprint: string;
  }> = [];

  public recordEvent(
    sessionId: string,
    event: string,
    details?: Record<string, unknown>,
  ): void {
    const entry = {
      sessionId,
      event,
      details: details ?? {},
      timestamp: nowISO(),
      fingerprint: computeHash(
        `${sessionId}|${event}|${JSON.stringify(details ?? {})}|${nowISO()}`,
      ),
    };
    this.entries.push(entry);
  }

  public getSessionAudit(
    sessionId: string,
  ): Array<{
    sessionId: string;
    event: string;
    details: Record<string, unknown>;
    timestamp: string;
    fingerprint: string;
  }> {
    return this.entries.filter((e) => e.sessionId === sessionId);
  }

  public verifySessionAudit(sessionId: string): {
    verified: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    const relevant = this.entries.filter((e) => e.sessionId === sessionId);
    if (relevant.length === 0) {
      return {
        verified: false,
        issues: [`No audit entries for session ${sessionId}`],
      };
    }
    for (const entry of relevant) {
      if (!entry.event) issues.push('Entry missing event');
      if (!entry.timestamp) issues.push('Entry missing timestamp');
      if (!entry.fingerprint) issues.push('Entry missing fingerprint');
    }
    return { verified: issues.length === 0, issues };
  }

  public clearSession(sessionId: string): void {
    this.entries = this.entries.filter((e) => e.sessionId !== sessionId);
  }

  public clearAll(): void {
    this.entries = [];
  }
}
