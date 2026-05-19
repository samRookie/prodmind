import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { couplingEdges } from '../schema/coupling-analysis.ts';
import type { CouplingEdgeRow, NewCouplingEdgeRow } from '../schema/coupling-analysis.ts';
import { generateId, now } from '../utils.ts';
import type { Result } from '@prodmind/contracts';

export class CouplingRepository {
  constructor(private db: Database) {}

  async insertCouplingEdges(
    snapshotId: string,
    inputs: Omit<NewCouplingEdgeRow, 'id' | 'snapshotId' | 'createdAt'>[],
  ): Promise<Result<CouplingEdgeRow[], string>> {
    try {
      const result = await this.db.transaction(async (tx) => {
        const inserted: CouplingEdgeRow[] = [];
        for (const input of inputs) {
          const [row] = await tx
            .insert(couplingEdges)
            .values({
              id: generateId(),
              snapshotId,
              sourceNodeId: input.sourceNodeId,
              targetNodeId: input.targetNodeId,
              couplingType: input.couplingType,
              couplingStrength: input.couplingStrength,
              propagationRisk: input.propagationRisk ?? null,
              metadataJson: input.metadataJson ?? null,
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
        error: err instanceof Error ? err.message : 'Coupling edge insertion failed',
      };
    }
  }

  async getCouplingEdgesBySnapshot(snapshotId: string): Promise<CouplingEdgeRow[]> {
    return this.db
      .select()
      .from(couplingEdges)
      .where(eq(couplingEdges.snapshotId, snapshotId))
      .orderBy(couplingEdges.couplingStrength);
  }

  async getCouplingEdgesBySource(sourceNodeId: string, snapshotId: string): Promise<CouplingEdgeRow[]> {
    return this.db
      .select()
      .from(couplingEdges)
      .where(
        eq(couplingEdges.sourceNodeId, sourceNodeId) &&
        eq(couplingEdges.snapshotId, snapshotId),
      )
      .orderBy(couplingEdges.couplingStrength);
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(couplingEdges).where(eq(couplingEdges.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete coupling edges',
      };
    }
  }
}
