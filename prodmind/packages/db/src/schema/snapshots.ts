import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';
import { projects } from './projects.ts';

export const snapshots = sqliteTable(
  'snapshots',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => projects.id),
    version: integer('version').notNull(),
    status: text('status').notNull().default('PENDING'),
    uploadFilename: text('upload_filename'),
    uploadHash: text('upload_hash'),
    extractionPath: text('extraction_path'),
    createdAt: text('created_at').notNull(),
    activatedAt: text('activated_at'),
    metadataJson: text('metadata_json'),
    compressionRatio: real('compression_ratio'),
    confidenceScore: real('confidence_score'),
    isDegraded: integer('is_degraded', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => ({
    projectIdIdx: index('idx_snapshots_project_id').on(table.projectId),
    statusIdx: index('idx_snapshots_status').on(table.status),
  }),
);

export type Snapshot = typeof snapshots.$inferSelect;
export type NewSnapshot = typeof snapshots.$inferInsert;
