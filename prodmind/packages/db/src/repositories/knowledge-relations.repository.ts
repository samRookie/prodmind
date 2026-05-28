import { eq, and } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { knowledgeRelations } from '../schema/knowledge-relations.ts';
import { generateId, now } from '../utils.ts';
import type { NewKnowledgeRelationRow, KnowledgeRelationRow } from '../schema/knowledge-relations.ts';
import type { Result } from '@prodmind/contracts';

export class KnowledgeRelationsRepository {
  constructor(private db: Database) {}

  async insert(input: Omit<NewKnowledgeRelationRow, 'id' | 'createdAt'>): Promise<Result<KnowledgeRelationRow, string>> {
    try {
      const value: NewKnowledgeRelationRow = { id: generateId(), snapshotId: input.snapshotId, relationType: input.relationType, sourceId: input.sourceId, targetId: input.targetId, fingerprint: input.fingerprint, metadataJson: input.metadataJson ?? null, createdAt: now() };
      const [result] = await this.db.insert(knowledgeRelations).values(value).returning();
      return { success: true, data: result! };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert knowledge relation failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<KnowledgeRelationRow[]> {
    return this.db.select().from(knowledgeRelations).where(eq(knowledgeRelations.snapshotId, snapshotId)).orderBy(knowledgeRelations.createdAt);
  }

  async queryByType(relationType: string): Promise<KnowledgeRelationRow[]> {
    return this.db.select().from(knowledgeRelations).where(eq(knowledgeRelations.relationType, relationType)).orderBy(knowledgeRelations.createdAt);
  }

  async queryBySource(sourceId: string): Promise<KnowledgeRelationRow[]> {
    return this.db.select().from(knowledgeRelations).where(eq(knowledgeRelations.sourceId, sourceId)).orderBy(knowledgeRelations.createdAt);
  }

  async queryByTarget(targetId: string): Promise<KnowledgeRelationRow[]> {
    return this.db.select().from(knowledgeRelations).where(eq(knowledgeRelations.targetId, targetId)).orderBy(knowledgeRelations.createdAt);
  }

  async queryByPair(sourceId: string, targetId: string): Promise<KnowledgeRelationRow[]> {
    return this.db.select().from(knowledgeRelations).where(and(eq(knowledgeRelations.sourceId, sourceId), eq(knowledgeRelations.targetId, targetId))).orderBy(knowledgeRelations.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<KnowledgeRelationRow | undefined> {
    const [result] = await this.db.select().from(knowledgeRelations).where(eq(knowledgeRelations.fingerprint, fingerprint)).limit(1);
    return result;
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(knowledgeRelations).where(eq(knowledgeRelations.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete knowledge relations failed' };
    }
  }
}
