import type { SessionPriority, SessionStatus, SessionSummary } from '../types/index.ts';
import { SessionNotFoundError } from '../errors/index.ts';
import { nowISO } from '../utils/index.ts';
import { AnalysisSession, type AnalysisSessionData } from './analysis-session.ts';

export interface SessionFilter {
  projectId?: string;
  status?: SessionStatus;
  priority?: SessionPriority;
}

export class SessionManager {
  private readonly sessions: Map<string, AnalysisSession> = new Map();

  public createSession(params: AnalysisSessionData): AnalysisSession {
    const session = new AnalysisSession(params);
    this.sessions.set(session.id, session);
    return session;
  }

  public getSession(id: string): AnalysisSession {
    const session = this.sessions.get(id);
    if (!session) {
      throw new SessionNotFoundError(id);
    }
    return session;
  }

  public listSessions(filter?: SessionFilter): AnalysisSession[] {
    let result = Array.from(this.sessions.values());

    if (filter) {
      if (filter.projectId) {
        result = result.filter((s) => s.projectId === filter.projectId);
      }
      if (filter.status) {
        result = result.filter((s) => s.status === filter.status);
      }
      if (filter.priority) {
        result = result.filter((s) => s.priority === filter.priority);
      }
    }

    return result;
  }

  public updateSession(id: string, updates: Partial<AnalysisSessionData>): AnalysisSession {
    const session = this.getSession(id);

    if (updates.goal !== undefined) {
      session.updateGoal(updates.goal);
    }
    if (updates.hypothesis !== undefined) {
      session.hypothesis = updates.hypothesis;
      session.updatedAt = nowISO();
    }
    if (updates.priority !== undefined) {
      session.updatePriority(updates.priority);
    }
    if (updates.tags !== undefined) {
      session.tags = updates.tags;
      session.updatedAt = nowISO();
    }
    if (updates.eventCount !== undefined) {
      session.eventCount = updates.eventCount;
    }
    if (updates.snapshotCount !== undefined) {
      session.snapshotCount = updates.snapshotCount;
    }
    if (updates.interactionCount !== undefined) {
      session.interactionCount = updates.interactionCount;
    }
    if (updates.metadata !== undefined) {
      session.metadata = updates.metadata;
      session.updatedAt = nowISO();
    }

    return session;
  }

  public deleteSession(id: string): void {
    if (!this.sessions.has(id)) {
      throw new SessionNotFoundError(id);
    }
    this.sessions.delete(id);
  }

  public transitionSession(id: string, targetStatus: SessionStatus, failureReason?: string): AnalysisSession {
    const session = this.getSession(id);
    session.transitionTo(targetStatus, failureReason);
    return session;
  }

  public getAllSessionsSummary(): SessionSummary[] {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      projectId: s.projectId,
      status: s.status,
      priority: s.priority,
      investigationGoal: s.goal,
      eventCount: s.eventCount,
      snapshotCount: s.snapshotCount,
      interactionCount: s.interactionCount,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      tags: s.tags.length > 0 ? s.tags : undefined,
    }));
  }
}
