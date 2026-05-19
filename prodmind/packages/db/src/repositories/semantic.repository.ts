import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { semanticClassifications } from '../schema/semantic-metadata.ts';
import type { SemanticClassificationRow, NewSemanticClassificationRow } from '../schema/semantic-metadata.ts';
import { generateId, now } from '../utils.ts';
import type { Result } from '@prodmind/contracts';

export class SemanticRepository {
  constructor(private db: Database) {}

  async insertClassifications(
    snapshotId: string,
    inputs: Omit<NewSemanticClassificationRow, 'id' | 'snapshotId' | 'createdAt'>[],
  ): Promise<Result<SemanticClassificationRow[], string>> {
    try {
      const result = await this.db.transaction(async (tx) => {
        const inserted: SemanticClassificationRow[] = [];
        for (const input of inputs) {
          const [row] = await tx
            .insert(semanticClassifications)
            .values({
              id: generateId(),
              snapshotId,
              nodeId: input.nodeId,
              semanticType: input.semanticType,
              ruleStrength: input.ruleStrength,
              classificationReasonsJson: input.classificationReasonsJson ?? null,
              matchedHeuristicsJson: input.matchedHeuristicsJson ?? null,
              infraScore: input.infraScore ?? null,
              businessScore: input.businessScore ?? null,
              dominantRole: input.dominantRole ?? null,
              createdAt: now(),
            })
            .returning();
          inserted.push(row!);
        }
        return inserted;
      });
      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Classification insertion failed',
      };
    }
  }

  async getClassificationsBySnapshot(snapshotId: string): Promise<SemanticClassificationRow[]> {
    return this.db
      .select()
      .from(semanticClassifications)
      .where(eq(semanticClassifications.snapshotId, snapshotId))
      .orderBy(semanticClassifications.nodeId);
  }

  async getClassificationByNode(nodeId: string, snapshotId: string): Promise<SemanticClassificationRow | null> {
    const [result] = await this.db
      .select()
      .from(semanticClassifications)
      .where(
        eq(semanticClassifications.nodeId, nodeId) &&
        eq(semanticClassifications.snapshotId, snapshotId),
      )
      .limit(1);
    return result ?? null;
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(semanticClassifications).where(eq(semanticClassifications.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete classifications',
      };
    }
  }
}
