import type { SessionStatus, SessionPriority, SessionSummary } from '../types/index.ts';
import { SessionValidationError } from '../errors/index.ts';
import { paginate } from '../utils/index.ts';

export interface SessionFilter {
  status?: SessionStatus;
  priority?: SessionPriority;
  tags?: string[];
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SessionStats {
  totalSessions: number;
  statusDistribution: Record<string, number>;
  priorityDistribution: Record<string, number>;
  averageEventCount: number;
  averageSnapshotCount: number;
}

export class SessionQueryEngine {
  private readonly sessions: SessionSummary[];

  public constructor(sessions: SessionSummary[] = []) {
    this.sessions = sessions;
  }

  public findSessionsByProject(projectId: string, filter?: SessionFilter, page: number = 1, pageSize: number = 20): PaginatedResult<SessionSummary> {
    if (!projectId) {
      throw new SessionValidationError('Project ID is required', { projectId });
    }

    let results = this.sessions.filter((s) => s.projectId === projectId);

    if (filter) {
      results = this.applyFilter(results, filter);
    }

    return paginate(results, page, pageSize);
  }

  public findSessionsByStatus(status: SessionStatus, filter?: SessionFilter, page: number = 1, pageSize: number = 20): PaginatedResult<SessionSummary> {
    if (!status) {
      throw new SessionValidationError('Status is required', { status });
    }

    let results = this.sessions.filter((s) => s.status === status);

    if (filter) {
      results = this.applyFilter(results, filter);
    }

    return paginate(results, page, pageSize);
  }

  public findSessionsByPriority(priority: SessionPriority, filter?: SessionFilter, page: number = 1, pageSize: number = 20): PaginatedResult<SessionSummary> {
    if (!priority) {
      throw new SessionValidationError('Priority is required', { priority });
    }

    let results = this.sessions.filter((s) => s.priority === priority);

    if (filter) {
      results = this.applyFilter(results, filter);
    }

    return paginate(results, page, pageSize);
  }

  public findSessionsByDateRange(from: string, to: string, filter?: SessionFilter, page: number = 1, pageSize: number = 20): PaginatedResult<SessionSummary> {
    if (!from || !to) {
      throw new SessionValidationError('From and to dates are required', { from, to });
    }

    const fromDate = new Date(from).getTime();
    const toDate = new Date(to).getTime();

    if (isNaN(fromDate) || isNaN(toDate)) {
      throw new SessionValidationError('Invalid date format', { from, to });
    }

    if (fromDate > toDate) {
      throw new SessionValidationError('From date must be before to date', { from, to });
    }

    let results = this.sessions.filter((s) => {
      const createdAt = new Date(s.createdAt).getTime();
      return createdAt >= fromDate && createdAt <= toDate;
    });

    if (filter) {
      results = this.applyFilter(results, filter);
    }

    return paginate(results, page, pageSize);
  }

  public findSessionsByTags(tags: string[], filter?: SessionFilter, page: number = 1, pageSize: number = 20): PaginatedResult<SessionSummary> {
    if (!tags || tags.length === 0) {
      throw new SessionValidationError('At least one tag is required', { tags });
    }

    const lowerTags = tags.map((t) => t.toLowerCase());

    let results = this.sessions.filter((s) => {
      if (!s.tags || s.tags.length === 0) return false;
      const sessionTags = s.tags.map((t) => t.toLowerCase());
      return lowerTags.some((t) => sessionTags.includes(t));
    });

    if (filter) {
      results = this.applyFilter(results, filter);
    }

    return paginate(results, page, pageSize);
  }

  public searchSessions(query: string, filter?: SessionFilter, page: number = 1, pageSize: number = 20): PaginatedResult<SessionSummary> {
    if (!query) {
      throw new SessionValidationError('Search query is required', { query });
    }

    const lowerQuery = query.toLowerCase();

    let results = this.sessions.filter((s) => {
      const searchable = [
        s.id,
        s.projectId,
        s.investigationGoal ?? '',
        s.status,
        s.priority,
        ...(s.tags ?? []),
      ].join(' ').toLowerCase();
      return searchable.includes(lowerQuery);
    });

    if (filter) {
      results = this.applyFilter(results, filter);
    }

    return paginate(results, page, pageSize);
  }

  public getSessionStats(projectId: string): SessionStats {
    if (!projectId) {
      throw new SessionValidationError('Project ID is required', { projectId });
    }

    const projectSessions = this.sessions.filter((s) => s.projectId === projectId);

    const statusDistribution: Record<string, number> = {};
    const priorityDistribution: Record<string, number> = {};
    let totalEventCount = 0;
    let totalSnapshotCount = 0;

    for (const session of projectSessions) {
      statusDistribution[session.status] = (statusDistribution[session.status] ?? 0) + 1;
      priorityDistribution[session.priority] = (priorityDistribution[session.priority] ?? 0) + 1;
      totalEventCount += session.eventCount;
      totalSnapshotCount += session.snapshotCount;
    }

    return {
      totalSessions: projectSessions.length,
      statusDistribution,
      priorityDistribution,
      averageEventCount: projectSessions.length > 0 ? totalEventCount / projectSessions.length : 0,
      averageSnapshotCount: projectSessions.length > 0 ? totalSnapshotCount / projectSessions.length : 0,
    };
  }

  public setSessions(sessions: SessionSummary[]): void {
    (this as unknown as { sessions: SessionSummary[] }).sessions = sessions;
  }

  private applyFilter(sessions: SessionSummary[], filter: SessionFilter): SessionSummary[] {
    return sessions.filter((s) => {
      if (filter.status && s.status !== filter.status) return false;
      if (filter.priority && s.priority !== filter.priority) return false;
      if (filter.projectId && s.projectId !== filter.projectId) return false;
      if (filter.dateFrom && s.createdAt < filter.dateFrom) return false;
      if (filter.dateTo && s.createdAt > filter.dateTo) return false;
      if (filter.tags && filter.tags.length > 0) {
        if (!s.tags || s.tags.length === 0) return false;
        const sessionTags = s.tags.map((t) => t.toLowerCase());
        const match = filter.tags.some((t) => sessionTags.includes(t.toLowerCase()));
        if (!match) return false;
      }
      return true;
    });
  }
}
