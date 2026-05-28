import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { knowledgeGraph } from '../schema/knowledge-graph.ts';
import { generateId, now } from '../utils.ts';
import type { NewKnowledgeGraphRow, KnowledgeGraphRow } from '../schema/knowledge-graph.ts';
import type { Result } from '@prodmind/contracts';

export class KnowledgeGraphRepository {
  constructor(private db: Database) {}

  async insert(input: Omit<NewKnowledgeGraphRow, 'id' | 'createdAt'>): Promise<Result<KnowledgeGraphRow, string>> {
    try {
      const value: NewKnowledgeGraphRow = { id: generateId(), snapshotId: input.snapshotId, nodeType: input.nodeType, fingerprint: input.fingerprint, metadataJson: input.metadataJson ?? null, createdAt: now() };
      const [result] = await this.db.insert(knowledgeGraph).values(value).returning();
      return { success: true, data: result! };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Insert knowledge graph node failed' };
    }
  }

  async queryBySnapshot(snapshotId: string): Promise<KnowledgeGraphRow[]> {
    return this.db.select().from(knowledgeGraph).where(eq(knowledgeGraph.snapshotId, snapshotId)).orderBy(knowledgeGraph.createdAt);
  }

  async queryByType(nodeType: string): Promise<KnowledgeGraphRow[]> {
    return this.db.select().from(knowledgeGraph).where(eq(knowledgeGraph.nodeType, nodeType)).orderBy(knowledgeGraph.createdAt);
  }

  async queryByFingerprint(fingerprint: string): Promise<KnowledgeGraphRow | undefined> {
    const [result] = await this.db.select().from(knowledgeGraph).where(eq(knowledgeGraph.fingerprint, fingerprint)).limit(1);
    return result;
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(knowledgeGraph).where(eq(knowledgeGraph.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Delete knowledge graph failed' };
    }
  }
}
