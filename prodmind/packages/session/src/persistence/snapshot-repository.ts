import { eq, desc, sql } from 'drizzle-orm';
import {
  reasoningSnapshots,
  type ReasoningSnapshot,
  type NewReasoningSnapshot,
  type Database,
} from '@prodmind/db';
import { PersistenceError } from '../errors/index.ts';

export class SnapshotRepository {
  private readonly db: Database;

  public constructor(db: Database) {
    this.db = db;
  }

  public async findBySessionId(sessionId: string): Promise<ReasoningSnapshot[]> {
    try {
      return await this.db
        .select()
        .from(reasoningSnapshots)
        .where(eq(reasoningSnapshots.sessionId, sessionId))
        .orderBy(desc(reasoningSnapshots.version));
    } catch (cause) {
      throw new PersistenceError('Failed to find snapshots by session id', { sessionId, cause });
    }
  }

  public async findLatestBySessionId(sessionId: string): Promise<ReasoningSnapshot | null> {
    try {
      const rows = await this.db
        .select()
        .from(reasoningSnapshots)
        .where(eq(reasoningSnapshots.sessionId, sessionId))
        .orderBy(desc(reasoningSnapshots.version))
        .limit(1);

      return rows[0] ?? null;
    } catch (cause) {
      throw new PersistenceError('Failed to find latest snapshot by session id', { sessionId, cause });
    }
  }

  public async findById(id: string): Promise<ReasoningSnapshot | null> {
    try {
      const rows = await this.db
        .select()
        .from(reasoningSnapshots)
        .where(eq(reasoningSnapshots.id, id))
        .limit(1);

      return rows[0] ?? null;
    } catch (cause) {
      throw new PersistenceError('Failed to find snapshot by id', { id, cause });
    }
  }

  public async insert(snapshot: NewReasoningSnapshot): Promise<void> {
    try {
      await this.db.insert(reasoningSnapshots).values(snapshot);
    } catch (cause) {
      throw new PersistenceError('Failed to insert snapshot', { snapshotId: snapshot.id, cause });
    }
  }

  public async deleteBySessionId(sessionId: string): Promise<void> {
    try {
      await this.db
        .delete(reasoningSnapshots)
        .where(eq(reasoningSnapshots.sessionId, sessionId));
    } catch (cause) {
      throw new PersistenceError('Failed to delete snapshots by session id', { sessionId, cause });
    }
  }

  public async getSnapshotCount(sessionId: string): Promise<number> {
    try {
      const rows = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(reasoningSnapshots)
        .where(eq(reasoningSnapshots.sessionId, sessionId));

      return rows[0]?.count ?? 0;
    } catch (cause) {
      throw new PersistenceError('Failed to get snapshot count', { sessionId, cause });
    }
  }
}
