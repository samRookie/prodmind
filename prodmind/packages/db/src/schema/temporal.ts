import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

export const architectureTimelines = sqliteTable(
  'architecture_timelines',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    snapshotId: text('snapshot_id').notNull(),
    sequenceIndex: integer('sequence_index').notNull(),
    timestamp: text('timestamp').notNull(),
    fingerprint: text('fingerprint').notNull(),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_at_project').on(table.projectId),
    snapshotIdx: index('idx_at_snapshot').on(table.snapshotId),
  }),
);

export const evolutionSnapshots = sqliteTable(
  'evolution_snapshots',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    snapshotId: text('snapshot_id').notNull(),
    nodeCount: integer('node_count').notNull(),
    edgeCount: integer('edge_count').notNull(),
    complexity: real('complexity').notNull(),
    instability: real('instability').notNull(),
    coupling: real('coupling').notNull(),
    propagation: real('propagation').notNull(),
    hotspotCount: integer('hotspot_count').default(0),
    semanticScore: real('semantic_score').default(1),
    driftScore: real('drift_score').default(0),
    timestamp: text('timestamp').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_es_project').on(table.projectId),
    snapshotIdx: index('idx_es_snapshot').on(table.snapshotId),
  }),
);

export const forecastReports = sqliteTable(
  'forecast_reports',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    windowStart: text('window_start').notNull(),
    windowEnd: text('window_end').notNull(),
    predictionsJson: text('predictions_json').notNull(),
    evidenceJson: text('evidence_json'),
    confidence: real('confidence').notNull(),
    fingerprint: text('fingerprint').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_fr_project').on(table.projectId),
    fingerprintIdx: index('idx_fr_fingerprint').on(table.fingerprint),
  }),
);

export const trajectoryReports = sqliteTable(
  'trajectory_reports',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    trajectoriesJson: text('trajectories_json').notNull(),
    degradationVelocity: real('degradation_velocity').default(0),
    instabilityAcceleration: real('instability_acceleration').default(0),
    hotspotGrowthRate: real('hotspot_growth_rate').default(0),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_tr_project').on(table.projectId),
  }),
);

export const degradationReports = sqliteTable(
  'degradation_reports',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    erosionScore: real('erosion_score').notNull(),
    fragmentationScore: real('fragmentation_score').notNull(),
    fatigueScore: real('fatigue_score').notNull(),
    overallScore: real('overall_score').notNull(),
    degradationLevel: text('degradation_level').notNull(),
    degradationPointsJson: text('degradation_points_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_dr_project').on(table.projectId),
  }),
);

export const simulationReports = sqliteTable(
  'simulation_reports',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    scenarioName: text('scenario_name').notNull(),
    stepsJson: text('steps_json').notNull(),
    boundsJson: text('bounds_json').notNull(),
    fingerprint: text('fingerprint').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_sr_project').on(table.projectId),
    fingerprintIdx: index('idx_sr_fingerprint').on(table.fingerprint),
  }),
);

export const predictionReports = sqliteTable(
  'prediction_reports',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    predictionsJson: text('predictions_json').notNull(),
    confidence: real('confidence').notNull(),
    reliability: text('reliability').notNull(),
    evidenceJson: text('evidence_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_pr_project').on(table.projectId),
  }),
);

export const temporalReplay = sqliteTable(
  'temporal_replay',
  {
    id: text('id').primaryKey(),
    replayType: text('replay_type').notNull(),
    fingerprint: text('fingerprint').notNull(),
    matchResult: integer('match_result', { mode: 'boolean' }).notNull(),
    originalCount: integer('original_count').notNull(),
    replayedCount: integer('replayed_count').notNull(),
    detailsJson: text('details_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    fingerprintIdx: index('idx_tr2_fingerprint').on(table.fingerprint),
  }),
);

export const remediationEffectiveness = sqliteTable(
  'remediation_effectiveness',
  {
    id: text('id').primaryKey(),
    remediationId: text('remediation_id').notNull(),
    projectId: text('project_id').notNull(),
    targetModule: text('target_module').notNull(),
    actionType: text('action_type').notNull(),
    successScore: real('success_score').notNull(),
    impactScore: real('impact_score').notNull(),
    regressionScore: real('regression_score').default(0),
    timestamp: text('timestamp').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    projectIdx: index('idx_re_project').on(table.projectId),
    moduleIdx: index('idx_re_module').on(table.targetModule),
  }),
);

export type ArchitectureTimeline = typeof architectureTimelines.$inferSelect;
export type NewArchitectureTimeline = typeof architectureTimelines.$inferInsert;
export type EvolutionSnapshot = typeof evolutionSnapshots.$inferSelect;
export type NewEvolutionSnapshot = typeof evolutionSnapshots.$inferInsert;
export type ForecastReport = typeof forecastReports.$inferSelect;
export type NewForecastReport = typeof forecastReports.$inferInsert;
export type TrajectoryReport = typeof trajectoryReports.$inferSelect;
export type NewTrajectoryReport = typeof trajectoryReports.$inferInsert;
export type DegradationReport = typeof degradationReports.$inferSelect;
export type NewDegradationReport = typeof degradationReports.$inferInsert;
export type SimulationReport = typeof simulationReports.$inferSelect;
export type NewSimulationReport = typeof simulationReports.$inferInsert;
export type PredictionReport = typeof predictionReports.$inferSelect;
export type NewPredictionReport = typeof predictionReports.$inferInsert;
export type TemporalReplayRow = typeof temporalReplay.$inferSelect;
export type NewTemporalReplayRow = typeof temporalReplay.$inferInsert;
export type RemediationEffectivenessRow = typeof remediationEffectiveness.$inferSelect;
export type NewRemediationEffectivenessRow = typeof remediationEffectiveness.$inferInsert;
