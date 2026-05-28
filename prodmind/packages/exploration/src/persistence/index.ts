import { eq, and } from 'drizzle-orm';
import {
  explorationSessions,
  explorationQueries,
  traversalHistory,
  type ExplorationSessionRow,
  type NewExplorationSessionRow,
  type ExplorationQueryRow,
  type NewExplorationQueryRow,
  type TraversalHistoryRow,
  type NewTraversalHistoryRow,
  type Database,
} from '@prodmind/db';

export class ExplorationSessionRepository {
  private readonly db: Database;

  public constructor(db: Database) {
    this.db = db;
  }

  public async findById(id: string): Promise<ExplorationSessionRow | null> {
    const rows = await this.db
      .select()
      .from(explorationSessions)
      .where(eq(explorationSessions.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findAll(filter?: { status?: string }): Promise<ExplorationSessionRow[]> {
    const conditions = [];
    if (filter?.status) {
      conditions.push(eq(explorationSessions.status, filter.status as 'COMPLETED' | 'CANCELLED' | 'ACTIVE' | 'PAUSED'));
    }
    if (conditions.length > 0) {
      return await this.db
        .select()
        .from(explorationSessions)
        .where(and(...conditions));
    }
    return await this.db.select().from(explorationSessions);
  }

  public async insert(row: NewExplorationSessionRow): Promise<ExplorationSessionRow> {
    const rows = await this.db
      .insert(explorationSessions)
      .values(row)
      .returning();
    return rows[0]!;
  }

  public async update(id: string, row: Partial<NewExplorationSessionRow>): Promise<ExplorationSessionRow> {
    const rows = await this.db
      .update(explorationSessions)
      .set(row)
      .where(eq(explorationSessions.id, id))
      .returning();
    return rows[0]!;
  }

  public async delete(id: string): Promise<void> {
    await this.db
      .delete(explorationSessions)
      .where(eq(explorationSessions.id, id));
  }
}

export class TraversalRepository {
  private readonly db: Database;

  public constructor(db: Database) {
    this.db = db;
  }

  public async findById(id: string): Promise<TraversalHistoryRow | null> {
    const rows = await this.db
      .select()
      .from(traversalHistory)
      .where(eq(traversalHistory.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findBySession(sessionId: string): Promise<TraversalHistoryRow[]> {
    return await this.db
      .select()
      .from(traversalHistory)
      .where(eq(traversalHistory.sessionId, sessionId));
  }

  public async insert(row: NewTraversalHistoryRow): Promise<TraversalHistoryRow> {
    const rows = await this.db
      .insert(traversalHistory)
      .values(row)
      .returning();
    return rows[0]!;
  }

  public async deleteBySession(sessionId: string): Promise<void> {
    await this.db
      .delete(traversalHistory)
      .where(eq(traversalHistory.sessionId, sessionId));
  }
}

export class QueryRepository {
  private readonly db: Database;

  public constructor(db: Database) {
    this.db = db;
  }

  public async findById(id: string): Promise<ExplorationQueryRow | null> {
    const rows = await this.db
      .select()
      .from(explorationQueries)
      .where(eq(explorationQueries.id, id))
      .limit(1);
    return rows[0] ?? null;
  }

  public async findBySession(sessionId: string): Promise<ExplorationQueryRow[]> {
    return await this.db
      .select()
      .from(explorationQueries)
      .where(eq(explorationQueries.sessionId, sessionId));
  }

  public async insert(row: NewExplorationQueryRow): Promise<ExplorationQueryRow> {
    const rows = await this.db
      .insert(explorationQueries)
      .values(row)
      .returning();
    return rows[0]!;
  }
}
