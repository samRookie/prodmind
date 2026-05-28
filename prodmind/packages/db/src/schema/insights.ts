import { sqliteTable, text, real, integer } from 'drizzle-orm/sqlite-core';
import { index } from 'drizzle-orm/sqlite-core';

export const insights = sqliteTable('insights', {
  id: text('id').primaryKey(),
  category: text('category').notNull(),
  severity: text('severity').notNull(),
  status: text('status').notNull().default('active'),
  title: text('title').notNull(),
  description: text('description').notNull(),
  summary: text('summary').notNull(),
  fingerprint: text('fingerprint').notNull(),
  overallScore: real('overall_score').notNull(),
  confidenceScore: real('confidence_score').notNull(),
  severityScore: real('severity_score').notNull(),
  impactScore: real('impact_score').notNull(),
  urgencyScore: real('urgency_score').notNull(),
  complexityScore: real('complexity_score').notNull(),
  timestamp: text('timestamp').notNull(),
  expiration: text('expiration'),
  sourceGraphSnapshot: text('source_graph_snapshot'),
  contextJson: text('context_json').notNull(),
  evidenceJson: text('evidence_json').notNull(),
  remediationIds: text('remediation_ids'),
  relatedInsightIds: text('related_insight_ids'),
}, (table) => ({
  categoryIdx: index('idx_insights_category').on(table.category),
  severityIdx: index('idx_insights_severity').on(table.severity),
  statusIdx: index('idx_insights_status').on(table.status),
  fingerprintIdx: index('idx_insights_fingerprint').on(table.fingerprint),
  timestampIdx: index('idx_insights_timestamp').on(table.timestamp),
}));

export const insightEvidence = sqliteTable('insight_evidence', {
  id: text('id').primaryKey(),
  insightId: text('insight_id').notNull().references(() => insights.id),
  type: text('type').notNull(),
  source: text('source').notNull(),
  description: text('description').notNull(),
  dataJson: text('data_json').notNull(),
  timestamp: text('timestamp').notNull(),
  fingerprint: text('fingerprint').notNull(),
}, (table) => ({
  insightIdx: index('idx_ie_insight_id').on(table.insightId),
  typeIdx: index('idx_ie_type').on(table.type),
}));

export const remediationPlans = sqliteTable('remediation_plans', {
  id: text('id').primaryKey(),
  insightId: text('insight_id').notNull().references(() => insights.id),
  strategy: text('strategy').notNull(),
  priority: text('priority').notNull(),
  stepsJson: text('steps_json').notNull(),
  impactJson: text('impact_json').notNull(),
  estimatedEffort: text('estimated_effort').notNull(),
  graphEvidenceJson: text('graph_evidence_json').notNull(),
}, (table) => ({
  insightIdx: index('idx_rp_insight_id').on(table.insightId),
}));

export const driftReports = sqliteTable('drift_reports', {
  id: text('id').primaryKey(),
  driftType: text('drift_type').notNull(),
  severity: text('severity').notNull(),
  description: text('description').notNull(),
  previousSnapshotId: text('previous_snapshot_id').notNull(),
  currentSnapshotId: text('current_snapshot_id').notNull(),
  changesJson: text('changes_json').notNull(),
  metricsJson: text('metrics_json').notNull(),
}, (table) => ({
  typeIdx: index('idx_drift_type').on(table.driftType),
}));

export const hotspotReports = sqliteTable('hotspot_reports', {
  id: text('id').primaryKey(),
  hotspotType: text('hotspot_type').notNull(),
  nodeId: text('node_id').notNull(),
  intensity: real('intensity').notNull(),
  ranking: integer('ranking').notNull(),
  risk: real('risk').notNull(),
  description: text('description').notNull(),
  clusterIds: text('cluster_ids'),
  metricsJson: text('metrics_json').notNull(),
}, (table) => ({
  nodeIdx: index('idx_hr_node_id').on(table.nodeId),
}));

export const insightReplay = sqliteTable('insight_replay', {
  id: text('id').primaryKey(),
  insightId: text('insight_id').notNull(),
  replayFingerprint: text('replay_fingerprint').notNull(),
  deterministic: integer('deterministic', { mode: 'boolean' }).notNull(),
  matchScore: real('match_score').notNull(),
  diffsJson: text('diffs_json').notNull(),
  timestamp: text('timestamp').notNull(),
}, (table) => ({
  insightIdx: index('idx_ir_insight_id').on(table.insightId),
}));

export const insightExplanations = sqliteTable('insight_explanations', {
  id: text('id').primaryKey(),
  insightId: text('insight_id').notNull().references(() => insights.id),
  summary: text('summary').notNull(),
  reasoningJson: text('reasoning_json').notNull(),
  evidenceSummary: text('evidence_summary').notNull(),
  graphContext: text('graph_context').notNull(),
  confidence: real('confidence').notNull(),
  deterministic: integer('deterministic', { mode: 'boolean' }).notNull(),
}, (table) => ({
  insightIdx: index('idx_iexp_insight_id').on(table.insightId),
}));

export type InsightRow = typeof insights.$inferSelect;
export type NewInsightRow = typeof insights.$inferInsert;
export type InsightEvidenceRow = typeof insightEvidence.$inferSelect;
export type NewInsightEvidenceRow = typeof insightEvidence.$inferInsert;
export type RemediationPlanRow = typeof remediationPlans.$inferSelect;
export type NewRemediationPlanRow = typeof remediationPlans.$inferInsert;
export type DriftReportRow = typeof driftReports.$inferSelect;
export type NewDriftReportRow = typeof driftReports.$inferInsert;
export type HotspotReportRow = typeof hotspotReports.$inferSelect;
export type NewHotspotReportRow = typeof hotspotReports.$inferInsert;
export type InsightReplayRow = typeof insightReplay.$inferSelect;
export type NewInsightReplayRow = typeof insightReplay.$inferInsert;
export type InsightExplanationRow = typeof insightExplanations.$inferSelect;
export type NewInsightExplanationRow = typeof insightExplanations.$inferInsert;
