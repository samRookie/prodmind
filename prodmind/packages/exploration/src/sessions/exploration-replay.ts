import type { ExplorationSession, SessionId } from '../types/index.ts';
import { ExplorationSessionManager } from './exploration-session.ts';
import { computeHash } from '../utils/index.ts';

export class ExplorationReplay {
  private sessionManager: ExplorationSessionManager;

  constructor(sessionManager: ExplorationSessionManager) {
    this.sessionManager = sessionManager;
  }

  public replaySession(sessionId: SessionId): ExplorationSession {
    const original = this.sessionManager.getSession(sessionId);
    if (!original) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    return this.sessionManager.createSession(original.query, original.strategy, original.startNode ?? undefined);
  }

  public compareReplays(a: SessionId, b: SessionId): { identical: boolean; differences: string[] } {
    const sessionA = this.sessionManager.getSession(a);
    const sessionB = this.sessionManager.getSession(b);
    if (!sessionA || !sessionB) {
      throw new Error('One or both sessions not found');
    }
    const differences: string[] = [];
    if (sessionA.query !== sessionB.query) differences.push(`query: ${sessionA.query} vs ${sessionB.query}`);
    if (sessionA.strategy !== sessionB.strategy) differences.push(`strategy: ${sessionA.strategy} vs ${sessionB.strategy}`);
    if (sessionA.startNode !== sessionB.startNode) differences.push(`startNode: ${sessionA.startNode} vs ${sessionB.startNode}`);
    return { identical: differences.length === 0, differences };
  }

  public getReplayFingerprint(sessionId: SessionId): string {
    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    const data = JSON.stringify({
      query: session.query,
      strategy: session.strategy,
      startNode: session.startNode,
    });
    return computeHash(data);
  }
}
