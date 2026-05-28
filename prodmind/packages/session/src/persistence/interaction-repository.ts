import { eq, desc } from 'drizzle-orm';
import {
  sessionAIInteractions,
  type SessionAIInteraction,
  type NewSessionAIInteraction,
  type Database,
} from '@prodmind/db';
import { PersistenceError } from '../errors/index.ts';

export class InteractionRepository {
  private readonly db: Database;

  public constructor(db: Database) {
    this.db = db;
  }

  public async findBySessionId(sessionId: string): Promise<SessionAIInteraction[]> {
    try {
      return await this.db
        .select()
        .from(sessionAIInteractions)
        .where(eq(sessionAIInteractions.sessionId, sessionId))
        .orderBy(sessionAIInteractions.sequenceNumber);
    } catch (cause) {
      throw new PersistenceError('Failed to find interactions by session id', { sessionId, cause });
    }
  }

  public async insert(interaction: NewSessionAIInteraction): Promise<void> {
    try {
      await this.db.insert(sessionAIInteractions).values(interaction);
    } catch (cause) {
      throw new PersistenceError('Failed to insert interaction', { interactionId: interaction.id, cause });
    }
  }

  public async insertBatch(interactions: NewSessionAIInteraction[]): Promise<void> {
    try {
      await this.db.insert(sessionAIInteractions).values(interactions);
    } catch (cause) {
      throw new PersistenceError('Failed to insert interactions batch', { count: interactions.length, cause });
    }
  }

  public async getLatestSequenceNumber(sessionId: string): Promise<number> {
    try {
      const rows = await this.db
        .select()
        .from(sessionAIInteractions)
        .where(eq(sessionAIInteractions.sessionId, sessionId))
        .orderBy(desc(sessionAIInteractions.sequenceNumber))
        .limit(1);

      return rows[0]?.sequenceNumber ?? 0;
    } catch (cause) {
      throw new PersistenceError('Failed to get latest interaction sequence number', { sessionId, cause });
    }
  }

  public async deleteBySessionId(sessionId: string): Promise<void> {
    try {
      await this.db
        .delete(sessionAIInteractions)
        .where(eq(sessionAIInteractions.sessionId, sessionId));
    } catch (cause) {
      throw new PersistenceError('Failed to delete interactions by session id', { sessionId, cause });
    }
  }
}
