import type { ExplorationSession, ExplorationStatus, SessionId, TraversalStrategy } from '../types/index.ts';
import { ExplorationHistory } from './exploration-history.ts';
import { ExplorationBookmarks } from './exploration-bookmarks.ts';
import { ExplorationCheckpoints } from './exploration-checkpoints.ts';
import { generateId, nowISO } from '../utils/index.ts';

export class ExplorationSessionManager {
  private sessions: Map<SessionId, ExplorationSession>;
  private history: ExplorationHistory;
  private bookmarksManager: ExplorationBookmarks;
  private checkpoints: ExplorationCheckpoints;

  constructor() {
    this.sessions = new Map<SessionId, ExplorationSession>();
    this.history = new ExplorationHistory();
    this.bookmarksManager = new ExplorationBookmarks();
    this.checkpoints = new ExplorationCheckpoints();
  }

  public createSession(query: string, strategy: TraversalStrategy, startNode?: string): ExplorationSession {
    const id = generateId('sess');
    const now = nowISO();
    const session: ExplorationSession = {
      id,
      status: 'ACTIVE',
      query,
      strategy,
      startNode: startNode ?? null,
      visited: [],
      bookmarks: [],
      checkpoint: null,
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(id, session);
    this.history.record(session);
    return session;
  }

  public getSession(id: SessionId): ExplorationSession | undefined {
    return this.sessions.get(id);
  }

  public updateStatus(id: SessionId, status: ExplorationStatus): void {
    const session = this.sessions.get(id);
    if (!session) return;
    session.status = status;
    session.updatedAt = nowISO();
    this.history.record(session);
  }

  public deleteSession(id: SessionId): void {
    this.sessions.delete(id);
    this.bookmarksManager.clearSession(id);
    this.checkpoints.clearSession(id);
  }

  public listSessions(): ExplorationSession[] {
    return Array.from(this.sessions.values());
  }

  public pauseSession(id: SessionId): void {
    this.updateStatus(id, 'PAUSED');
  }

  public resumeSession(id: SessionId): void {
    this.updateStatus(id, 'ACTIVE');
  }

  public clearCompleted(): void {
    for (const [id, session] of this.sessions) {
      if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
        this.sessions.delete(id);
      }
    }
  }

  public getHistory(): ExplorationHistory {
    return this.history;
  }

  public getBookmarks(): ExplorationBookmarks {
    return this.bookmarksManager;
  }

  public getCheckpoints(): ExplorationCheckpoints {
    return this.checkpoints;
  }
}
