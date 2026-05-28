import type { ExplorationSession, SessionId } from '../types/index.ts';
import { nowISO } from '../utils/index.ts';

export class ExplorationHistory {
  private entries: Array<{ sessionId: SessionId; query: string; timestamp: string; status: string }>;

  constructor() {
    this.entries = [];
  }

  public record(session: ExplorationSession): void {
    this.entries.push({
      sessionId: session.id,
      query: session.query,
      timestamp: nowISO(),
      status: session.status,
    });
  }

  public getHistory(sessionId?: SessionId): Array<{ sessionId: SessionId; query: string; timestamp: string; status: string }> {
    if (sessionId) {
      return this.entries.filter((e) => e.sessionId === sessionId);
    }
    return [...this.entries];
  }

  public getRecent(limit: number): Array<{ sessionId: SessionId; query: string; timestamp: string; status: string }> {
    return [...this.entries].reverse().slice(0, limit);
  }

  public clear(sessionId?: SessionId): void {
    if (sessionId) {
      this.entries = this.entries.filter((e) => e.sessionId !== sessionId);
    } else {
      this.entries = [];
    }
  }
}
