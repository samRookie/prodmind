import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';
import { nodes } from './nodes.ts';

export const risks = sqliteTable(
  'risks',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    nodeId: text('node_id').notNull().references(() => nodes.id),
    severity: text('severity').notNull(),
    category: text('category').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    fingerprint: text('fingerprint'),
    createdAt: text('created_at').notNull(),
    lastSeenSnapshotId: text('last_seen_snapshot_id'),
  },
  (table) => ({
    snapshotIdIdx: index('idx_risks_snapshot_id').on(table.snapshotId),
    fingerprintIdx: index('idx_risks_fingerprint').on(table.fingerprint),
    severityIdx: index('idx_risks_severity').on(table.severity),
  }),
);

export type Risk = typeof risks.$inferSelect;
export type NewRisk = typeof risks.$inferInsert;
