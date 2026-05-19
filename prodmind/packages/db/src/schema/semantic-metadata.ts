import { sqliteTable, text, real, index } from 'drizzle-orm/sqlite-core';
import { snapshots } from './snapshots.ts';
import { nodes } from './nodes.ts';

export const semanticClassifications = sqliteTable(
  'semantic_classifications',
  {
    id: text('id').primaryKey(),
    snapshotId: text('snapshot_id').notNull().references(() => snapshots.id),
    nodeId: text('node_id').notNull().references(() => nodes.id),
    semanticType: text('semantic_type').notNull(),
    ruleStrength: text('rule_strength').notNull(),
    classificationReasonsJson: text('classification_reasons_json'),
    matchedHeuristicsJson: text('matched_heuristics_json'),
    infraScore: real('infra_score'),
    businessScore: real('business_score'),
    dominantRole: text('dominant_role'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    snapshotIdIdx: index('idx_sc_snapshot_id').on(table.snapshotId),
    nodeIdIdx: index('idx_sc_node_id').on(table.nodeId),
    semanticTypeIdx: index('idx_sc_semantic_type').on(table.semanticType),
    snapshotTypeIdx: index('idx_sc_snapshot_type').on(table.snapshotId, table.semanticType),
    snapshotNodeIdx: index('idx_sc_snapshot_node').on(table.snapshotId, table.nodeId),
  }),
);

export type SemanticClassificationRow = typeof semanticClassifications.$inferSelect;
export type NewSemanticClassificationRow = typeof semanticClassifications.$inferInsert;
