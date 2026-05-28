import { eq, and, gte, lte, desc } from 'drizzle-orm';
import {
  sessionTimelines,
  type SessionTimeline,
  type NewSessionTimeline,
  type Database,
} from '@prodmind/db';
import { PersistenceError } from '../errors/index.ts';

export class TimelineRepository {
  private readonly db: Database;

  public constructor(db: Database) {
    this.db = db;
  }

  public async findBySessionId(sessionId: string): Promise<SessionTimeline[]> {
    try {
      return await this.db
        .select()
        .from(sessionTimelines)
        .where(eq(sessionTimelines.sessionId, sessionId))
        .orderBy(sessionTimelines.sequenceNumber);
    } catch (cause) {
      throw new PersistenceError('Failed to find timeline events by session id', { sessionId, cause });
    }
  }

  public async insert(event: NewSessionTimeline): Promise<void> {
    try {
      await this.db.insert(sessionTimelines).values(event);
    } catch (cause) {
      throw new PersistenceError('Failed to insert timeline event', { eventId: event.id, cause });
    }
  }

  public async insertBatch(events: NewSessionTimeline[]): Promise<void> {
    try {
      await this.db.insert(sessionTimelines).values(events);
    } catch (cause) {
      throw new PersistenceError('Failed to insert timeline events batch', { count: events.length, cause });
    }
  }

  public async getBySequenceRange(
    sessionId: string,
    start: number,
    end: number,
  ): Promise<SessionTimeline[]> {
    try {
      return await this.db
        .select()
        .from(sessionTimelines)
        .where(
          and(
            eq(sessionTimelines.sessionId, sessionId),
            gte(sessionTimelines.sequenceNumber, start),
            lte(sessionTimelines.sequenceNumber, end),
          ),
        )
        .orderBy(sessionTimelines.sequenceNumber);
    } catch (cause) {
      throw new PersistenceError('Failed to get timeline events by sequence range', {
        sessionId,
        start,
        end,
        cause,
      });
    }
  }

  public async getLatestSequenceNumber(sessionId: string): Promise<number> {
    try {
      const rows = await this.db
        .select()
        .from(sessionTimelines)
        .where(eq(sessionTimelines.sessionId, sessionId))
        .orderBy(desc(sessionTimelines.sequenceNumber))
        .limit(1);

      return rows[0]?.sequenceNumber ?? 0;
    } catch (cause) {
      throw new PersistenceError('Failed to get latest sequence number', { sessionId, cause });
    }
  }

  public async deleteBySessionId(sessionId: string): Promise<void> {
    try {
      await this.db
        .delete(sessionTimelines)
        .where(eq(sessionTimelines.sessionId, sessionId));
    } catch (cause) {
      throw new PersistenceError('Failed to delete timeline events by session id', { sessionId, cause });
    }
  }
}
