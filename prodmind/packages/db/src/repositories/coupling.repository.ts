import { eq, and } from 'drizzle-orm';
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
    txDb?: Database,
  ): Promise<Result<CouplingEdgeRow[], string>> {
    try {
      const dbc = txDb ?? this.db;
      const inserted: CouplingEdgeRow[] = [];
      const batchSize = 100;
      for (let i = 0; i < inputs.length; i += batchSize) {
        const batch = inputs.slice(i, i + batchSize);
        const values = batch.map((input) => ({
          id: generateId(),
          snapshotId,
          sourceNodeId: input.sourceNodeId,
          targetNodeId: input.targetNodeId,
          couplingType: input.couplingType,
          couplingStrength: input.couplingStrength,
          propagationRisk: input.propagationRisk ?? null,
          metadataJson: input.metadataJson ?? null,
          createdAt: now(),
        }));
        const rows = await dbc.insert(couplingEdges).values(values).returning();
        inserted.push(...rows);
      }
      return { success: true, data: inserted };
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
        and(
          eq(couplingEdges.sourceNodeId, sourceNodeId),
          eq(couplingEdges.snapshotId, snapshotId),
        ),
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
