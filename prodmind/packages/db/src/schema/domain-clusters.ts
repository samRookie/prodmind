import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const domainClusters = sqliteTable(
  'domain_clusters',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    clusterName: text('cluster_name').notNull(),
    nodeIdsJson: text('node_ids_json').notNull(),
    cohesionScore: real('cohesion_score'),
    fragmentationScore: real('fragmentation_score'),
    boundaryMetadataJson: text('boundary_metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_dc_snapshot_id').on(table.snapshotId),
    clusterNameIdx: index('idx_dc_cluster_name').on(table.clusterName),
    snapshotClusterIdx: index('idx_dc_snapshot_cluster').on(table.snapshotId, table.clusterName),
  }),
);

export type DomainClusterRow = typeof domainClusters.$inferSelect;
export type NewDomainClusterRow = typeof domainClusters.$inferInsert;
