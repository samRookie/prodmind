import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';

export const reuseArtifacts = sqliteTable(
  'reuse_artifacts',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    sourceSnapshotId: text('source_snapshot_id').notNull().references(() => snapshots.id),
    artifactType: text('artifact_type').notNull(),
    artifactIdentifier: text('artifact_identifier').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdx: index('idx_ra_snapshot_id').on(table.snapshotId),
    artifactTypeIdx: index('idx_ra_artifact_type').on(table.artifactType),
  }),
);

export type ReuseArtifact = typeof reuseArtifacts.$inferSelect;
export type NewReuseArtifact = typeof reuseArtifacts.$inferInsert;
