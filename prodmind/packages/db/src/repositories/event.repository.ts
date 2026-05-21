import { eq, desc, lt } from 'drizzle-orm';
import { getLimits } from '@prodmind/core';
import type { Database } from '../client.ts';
import { eventLogs } from '../schema/event-log.ts';
import { generateId, now, safeJsonParse } from '../utils.ts';
import type { EventLog } from '../schema/event-log.ts';

export class EventRepository {
  constructor(private db: Database) {}

  async log(
    eventType: string,
    payload?: Record<string, unknown>,
  ): Promise<EventLog> {
    const [event] = await this.db
      .insert(eventLogs)
      .values({
        id: generateId(),
        eventType,
        payloadJson: payload ? JSON.stringify(payload) : null,
        createdAt: now(),
      })
      .returning();

    return event!;
  }

  async list(limit?: number, offset = 0): Promise<EventLog[]> {
    const limits = getLimits();
    const actualLimit = limit ?? limits.db.defaultPageSize;
    return this.db
      .select()
      .from(eventLogs)
      .orderBy(desc(eventLogs.createdAt))
      .limit(actualLimit)
      .offset(offset);
  }

  async findByType(
    eventType: string,
    limit?: number,
    offset = 0,
  ): Promise<EventLog[]> {
    const limits = getLimits();
    const actualLimit = limit ?? limits.db.defaultPageSize;
    return this.db
      .select()
      .from(eventLogs)
      .where(eq(eventLogs.eventType, eventType))
      .orderBy(desc(eventLogs.createdAt))
      .limit(actualLimit)
      .offset(offset);
  }

  parsePayload<T>(event: EventLog): T | null {
    return safeJsonParse<T>(event.payloadJson);
  }

  async deleteOlderThan(days?: number): Promise<number> {
    const limits = getLimits();
    const actualDays = days ?? limits.db.maxRetentionDays;
    const cutoff = new Date(Date.now() - actualDays * 24 * 60 * 60 * 1000).toISOString();
    const result = await this.db
      .delete(eventLogs)
      .where(lt(eventLogs.createdAt, cutoff));
    return result.rowsAffected;
  }
}
