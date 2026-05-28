import { eq, and } from 'drizzle-orm';
import {
  investigationMetadata,
  type InvestigationMetadata,
  type Database,
} from '@prodmind/db';
import { PersistenceError } from '../errors/index.ts';
import { generateCausationId, nowISO } from '../utils/index.ts';

export class MetadataRepository {
  private readonly db: Database;

  public constructor(db: Database) {
    this.db = db;
  }

  public async findBySessionId(sessionId: string): Promise<InvestigationMetadata[]> {
    try {
      return await this.db
        .select()
        .from(investigationMetadata)
        .where(eq(investigationMetadata.sessionId, sessionId));
    } catch (cause) {
      throw new PersistenceError('Failed to find metadata by session id', { sessionId, cause });
    }
  }

  public async findByKey(sessionId: string, key: string): Promise<InvestigationMetadata | null> {
    try {
      const rows = await this.db
        .select()
        .from(investigationMetadata)
        .where(
          and(
            eq(investigationMetadata.sessionId, sessionId),
            eq(investigationMetadata.key, key),
          ),
        )
        .limit(1);

      return rows[0] ?? null;
    } catch (cause) {
      throw new PersistenceError('Failed to find metadata by key', { sessionId, key, cause });
    }
  }

  public async upsert(sessionId: string, key: string, value: string): Promise<void> {
    try {
      const existing = await this.findByKey(sessionId, key);
      const now = nowISO();

      if (existing) {
        await this.db
          .update(investigationMetadata)
          .set({ value, updatedAt: now })
          .where(eq(investigationMetadata.id, existing.id));
      } else {
        await this.db.insert(investigationMetadata).values({
          id: generateCausationId(),
          sessionId,
          key,
          value,
          createdAt: now,
          updatedAt: now,
        });
      }
    } catch (cause) {
      throw new PersistenceError('Failed to upsert metadata', { sessionId, key, cause });
    }
  }

  public async delete(sessionId: string, key: string): Promise<void> {
    try {
      await this.db
        .delete(investigationMetadata)
        .where(
          and(
            eq(investigationMetadata.sessionId, sessionId),
            eq(investigationMetadata.key, key),
          ),
        );
    } catch (cause) {
      throw new PersistenceError('Failed to delete metadata', { sessionId, key, cause });
    }
  }
}
