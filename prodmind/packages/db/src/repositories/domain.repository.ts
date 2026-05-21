import { eq, and } from 'drizzle-orm';
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
    txDb?: Database,
  ): Promise<Result<DomainClusterRow[], string>> {
    try {
      const dbc = txDb ?? this.db;
      const inserted: DomainClusterRow[] = [];
      const batchSize = 100;
      for (let i = 0; i < inputs.length; i += batchSize) {
        const batch = inputs.slice(i, i + batchSize);
        const values = batch.map((input) => ({
          id: generateId(),
          snapshotId,
          clusterName: input.clusterName,
          nodeIdsJson: input.nodeIdsJson,
          cohesionScore: input.cohesionScore ?? null,
          fragmentationScore: input.fragmentationScore ?? null,
          boundaryMetadataJson: input.boundaryMetadataJson ?? null,
          createdAt: now(),
        }));
        const rows = await dbc.insert(domainClusters).values(values).returning();
        inserted.push(...rows);
      }
      return { success: true, data: inserted };
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
        and(
          eq(domainClusters.clusterName, clusterName),
          eq(domainClusters.snapshotId, snapshotId),
        ),
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
