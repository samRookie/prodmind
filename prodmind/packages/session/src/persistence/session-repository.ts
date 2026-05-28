import { eq, and, sql } from 'drizzle-orm';
import {
  analysisSessions,
  type AnalysisSession,
  type NewAnalysisSession,
  type Database,
} from '@prodmind/db';
import { PersistenceError, SessionNotFoundError } from '../errors/index.ts';

export type SessionFilter = {
  projectId?: string;
  status?: string;
  priority?: string;
};

export class SessionRepository {
  private readonly db: Database;

  public constructor(db: Database) {
    this.db = db;
  }

  public async findById(id: string): Promise<AnalysisSession | null> {
    try {
      const rows = await this.db
        .select()
        .from(analysisSessions)
        .where(eq(analysisSessions.id, id))
        .limit(1);

      return rows[0] ?? null;
    } catch (cause) {
      throw new PersistenceError('Failed to find session by id', { id, cause });
    }
  }

  public async findAll(filter?: SessionFilter): Promise<AnalysisSession[]> {
    try {
      const conditions = [];

      if (filter?.projectId) {
        conditions.push(eq(analysisSessions.projectId, filter.projectId));
      }
      if (filter?.status) {
        conditions.push(eq(analysisSessions.status, filter.status));
      }
      if (filter?.priority) {
        conditions.push(eq(analysisSessions.priority, filter.priority));
      }

      const query = this.db.select().from(analysisSessions);

      if (conditions.length > 0) {
        query.where(and(...conditions));
      }

      return await query;
    } catch (cause) {
      throw new PersistenceError('Failed to find all sessions', { filter, cause });
    }
  }

  public async insert(session: NewAnalysisSession): Promise<void> {
    try {
      await this.db.insert(analysisSessions).values(session);
    } catch (cause) {
      throw new PersistenceError('Failed to insert session', { sessionId: session.id, cause });
    }
  }

  public async update(id: string, data: Partial<NewAnalysisSession>): Promise<void> {
    try {
      const existing = await this.findById(id);
      if (!existing) {
        throw new SessionNotFoundError(id);
      }

      await this.db
        .update(analysisSessions)
        .set(data)
        .where(eq(analysisSessions.id, id));
    } catch (cause) {
      if (cause instanceof SessionNotFoundError) throw cause;
      throw new PersistenceError('Failed to update session', { id, cause });
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      await this.db
        .delete(analysisSessions)
        .where(eq(analysisSessions.id, id));
    } catch (cause) {
      throw new PersistenceError('Failed to delete session', { id, cause });
    }
  }

  public async countByStatus(): Promise<Record<string, number>> {
    try {
      const rows = await this.db
        .select({
          status: analysisSessions.status,
          count: sql<number>`count(*)`,
        })
        .from(analysisSessions)
        .groupBy(analysisSessions.status);

      const result: Record<string, number> = {};
      for (const row of rows) {
        result[row.status] = row.count;
      }
      return result;
    } catch (cause) {
      throw new PersistenceError('Failed to count by status', { cause });
    }
  }
}
