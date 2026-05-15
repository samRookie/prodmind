import { eq, desc } from 'drizzle-orm';
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

  async list(limit = 100, offset = 0): Promise<EventLog[]> {
    return this.db
      .select()
      .from(eventLogs)
      .orderBy(desc(eventLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async findByType(
    eventType: string,
    limit = 100,
    offset = 0,
  ): Promise<EventLog[]> {
    return this.db
      .select()
      .from(eventLogs)
      .where(eq(eventLogs.eventType, eventType))
      .orderBy(desc(eventLogs.createdAt))
      .limit(limit)
      .offset(offset);
  }

  parsePayload<T>(event: EventLog): T | null {
    return safeJsonParse<T>(event.payloadJson);
  }
}
