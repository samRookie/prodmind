import { eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { domainClusters } from '../schema/domain-clusters.ts';
import type { DomainClusterRow, NewDomainClusterRow } from '../schema/domain-clusters.ts';
import { generateId, now } from '../utils.ts';
import type { Result } from '@prodmind/contracts';

export class DomainRepository {
  constructor(private db: Database) {}

  async insertDomainClusters(
    snapshotId: string,
    inputs: Omit<NewDomainClusterRow, 'id' | 'snapshotId' | 'createdAt'>[],
  ): Promise<Result<DomainClusterRow[], string>> {
    try {
      const result = await this.db.transaction(async (tx) => {
        const inserted: DomainClusterRow[] = [];
        for (const input of inputs) {
          const [row] = await tx
            .insert(domainClusters)
            .values({
              id: generateId(),
              snapshotId,
              clusterName: input.clusterName,
              nodeIdsJson: input.nodeIdsJson,
              cohesionScore: input.cohesionScore ?? null,
              fragmentationScore: input.fragmentationScore ?? null,
              boundaryMetadataJson: input.boundaryMetadataJson ?? null,
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
        error: err instanceof Error ? err.message : 'Domain cluster insertion failed',
      };
    }
  }

  async getClustersBySnapshot(snapshotId: string): Promise<DomainClusterRow[]> {
    return this.db
      .select()
      .from(domainClusters)
      .where(eq(domainClusters.snapshotId, snapshotId))
      .orderBy(domainClusters.clusterName);
  }

  async getClusterByName(clusterName: string, snapshotId: string): Promise<DomainClusterRow | null> {
    const [result] = await this.db
      .select()
      .from(domainClusters)
      .where(
        eq(domainClusters.clusterName, clusterName) &&
        eq(domainClusters.snapshotId, snapshotId),
      )
      .limit(1);
    return result ?? null;
  }

  async deleteBySnapshot(snapshotId: string): Promise<Result<void, string>> {
    try {
      await this.db.delete(domainClusters).where(eq(domainClusters.snapshotId, snapshotId));
      return { success: true, data: undefined };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to delete domain clusters',
      };
    }
  }
}
