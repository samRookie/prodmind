import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const analysisSessions = sqliteTable(
  'analysis_sessions',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    status: text('status', {
      enum: ['CREATED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED', 'FAILED'],
    }).notNull().default('CREATED'),
    investigationGoal: text('investigation_goal'),
    currentHypothesis: text('current_hypothesis'),
    priority: text('priority', { enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }).notNull().default('MEDIUM'),
    tags: text('tags'),
    metadataJson: text('metadata_json'),
    eventCount: integer('event_count').notNull().default(0),
    snapshotCount: integer('snapshot_count').notNull().default(0),
    interactionCount: integer('interaction_count').notNull().default(0),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    activatedAt: text('activated_at'),
    completedAt: text('completed_at'),
    archivedAt: text('archived_at'),
    failedAt: text('failed_at'),
    failureReason: text('failure_reason'),
  },
  (table) => ({
    projectIdIdx: index('idx_analysis_sessions_project_id').on(table.projectId),
    statusIdx: index('idx_analysis_sessions_status').on(table.status),
    priorityIdx: index('idx_analysis_sessions_priority').on(table.priority),
    createdAtIdx: index('idx_analysis_sessions_created_at').on(table.createdAt),
    projectStatusIdx: index('idx_analysis_sessions_project_status').on(table.projectId, table.status),
  }),
);

export const sessionTimelines = sqliteTable(
  'session_timelines',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull().references(() => analysisSessions.id),
    eventType: text('event_type', {
      enum: [
        'SESSION_CREATED', 'SESSION_ACTIVATED', 'SESSION_PAUSED', 'SESSION_RESUMED',
        'SESSION_COMPLETED', 'SESSION_ARCHIVED', 'SESSION_FAILED',
        'HYPOTHESIS_FORMED', 'HYPOTHESIS_UPDATED', 'HYPOTHESIS_CONFIRMED', 'HYPOTHESIS_REJECTED',
        'SNAPSHOT_CAPTURED', 'SNAPSHOT_RESTORED', 'SNAPSHOT_DIFFED',
        'AI_INTERACTION', 'AI_QUERY', 'AI_RESPONSE',
        'GRAPH_REFERENCE_ADDED', 'GRAPH_REFERENCE_REMOVED',
        'INSIGHT_RECORDED', 'RISK_IDENTIFIED',
        'REPLAY_STARTED', 'REPLAY_COMPLETED', 'REPLAY_FAILED',
        'RESTORATION_STARTED', 'RESTORATION_COMPLETED', 'RESTORATION_FAILED',
        'LIFECYCLE_ARCHIVED', 'LIFECYCLE_EXPIRED', 'LIFECYCLE_RETENTION_APPLIED',
      ],
    }).notNull(),
    payloadJson: text('payload_json'),
    sequenceNumber: integer('sequence_number').notNull(),
    timestamp: text('timestamp').notNull(),
    causationId: text('causation_id'),
    correlationId: text('correlation_id'),
    metadataJson: text('metadata_json'),
  },
  (table) => ({
    sessionIdIdx: index('idx_session_timelines_session_id').on(table.sessionId),
    eventTypeIdx: index('idx_session_timelines_event_type').on(table.eventType),
    sequenceIdx: index('idx_session_timelines_sequence').on(table.sessionId, table.sequenceNumber),
    timestampIdx: index('idx_session_timelines_timestamp').on(table.timestamp),
    causationIdx: index('idx_session_timelines_causation_id').on(table.causationId),
    correlationIdx: index('idx_session_timelines_correlation_id').on(table.correlationId),
  }),
);

export const reasoningSnapshots = sqliteTable(
  'reasoning_snapshots',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull().references(() => analysisSessions.id),
    version: integer('version').notNull(),
    snapshotType: text('snapshot_type', {
      enum: ['FULL', 'INCREMENTAL', 'DIFF_ONLY', 'CHECKPOINT'],
    }).notNull().default('FULL'),
    stateHash: text('state_hash').notNull(),
    previousSnapshotId: text('previous_snapshot_id'),
    currentHypothesis: text('current_hypothesis'),
    timelineCursor: integer('timeline_cursor').notNull().default(0),
    interactionCursor: integer('interaction_cursor').notNull().default(0),
    graphReferencesJson: text('graph_references_json'),
    compressedContextJson: text('compressed_context_json'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
    fingerprintHash: text('fingerprint_hash'),
  },
  (table) => ({
    sessionIdIdx: index('idx_reasoning_snapshots_session_id').on(table.sessionId),
    versionIdx: uniqueIndex('idx_reasoning_snapshots_session_version').on(table.sessionId, table.version),
    stateHashIdx: index('idx_reasoning_snapshots_state_hash').on(table.stateHash),
    fingerprintIdx: index('idx_reasoning_snapshots_fingerprint').on(table.fingerprintHash),
    snapshotTypeIdx: index('idx_reasoning_snapshots_type').on(table.snapshotType),
  }),
);

export const investigationMetadata = sqliteTable(
  'investigation_metadata',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull().references(() => analysisSessions.id),
    key: text('key').notNull(),
    value: text('value'),
    valueJson: text('value_json'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    sessionIdIdx: index('idx_investigation_metadata_session_id').on(table.sessionId),
    keyIdx: uniqueIndex('idx_investigation_metadata_session_key').on(table.sessionId, table.key),
  }),
);

export const sessionReplayLinks = sqliteTable(
  'session_replay_links',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull().references(() => analysisSessions.id),
    replayId: text('replay_id').notNull(),
    snapshotId: text('snapshot_id'),
    linkType: text('link_type', {
      enum: ['FULL_RESTORE', 'STATE_SYNC', 'PARTIAL_RESTORE', 'VERIFICATION'],
    }).notNull(),
    status: text('status', {
      enum: ['PENDING', 'LINKED', 'VERIFIED', 'FAILED', 'STALE'],
    }).notNull().default('PENDING'),
    restoredFromSnapshotId: text('restored_from_snapshot_id'),
    verificationHash: text('verification_hash'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
    linkedAt: text('linked_at'),
    verifiedAt: text('verified_at'),
  },
  (table) => ({
    sessionIdIdx: index('idx_session_replay_links_session_id').on(table.sessionId),
    replayIdIdx: index('idx_session_replay_links_replay_id').on(table.replayId),
    snapshotIdIdx: index('idx_session_replay_links_snapshot_id').on(table.snapshotId),
    statusIdx: index('idx_session_replay_links_status').on(table.status),
    linkTypeIdx: index('idx_session_replay_links_type').on(table.linkType),
  }),
);

export const sessionAIInteractions = sqliteTable(
  'session_ai_interactions',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id').notNull().references(() => analysisSessions.id),
    interactionType: text('interaction_type', {
      enum: ['QUERY', 'RESPONSE', 'REASONING', 'DECISION', 'HYPOTHESIS', 'ANALYSIS', 'ERROR'],
    }).notNull(),
    role: text('role', { enum: ['USER', 'AI', 'SYSTEM'] }).notNull(),
    content: text('content').notNull(),
    contentHash: text('content_hash'),
    tokensUsed: integer('tokens_used'),
    modelId: text('model_id'),
    sequenceNumber: integer('sequence_number').notNull(),
    parentInteractionId: text('parent_interaction_id'),
    metadataJson: text('metadata_json'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    sessionIdIdx: index('idx_session_ai_interactions_session_id').on(table.sessionId),
    sequenceIdx: index('idx_session_ai_interactions_sequence').on(table.sessionId, table.sequenceNumber),
    interactionTypeIdx: index('idx_session_ai_interactions_type').on(table.interactionType),
    contentHashIdx: index('idx_session_ai_interactions_content_hash').on(table.contentHash),
    parentIdx: index('idx_session_ai_interactions_parent').on(table.parentInteractionId),
    createdAtIdx: index('idx_session_ai_interactions_created_at').on(table.createdAt),
  }),
);

export type AnalysisSession = typeof analysisSessions.$inferSelect;
export type NewAnalysisSession = typeof analysisSessions.$inferInsert;
export type SessionTimeline = typeof sessionTimelines.$inferSelect;
export type NewSessionTimeline = typeof sessionTimelines.$inferInsert;
export type ReasoningSnapshot = typeof reasoningSnapshots.$inferSelect;
export type NewReasoningSnapshot = typeof reasoningSnapshots.$inferInsert;
export type InvestigationMetadata = typeof investigationMetadata.$inferSelect;
export type NewInvestigationMetadata = typeof investigationMetadata.$inferInsert;
export type SessionReplayLink = typeof sessionReplayLinks.$inferSelect;
export type NewSessionReplayLink = typeof sessionReplayLinks.$inferInsert;
export type SessionAIInteraction = typeof sessionAIInteractions.$inferSelect;
export type NewSessionAIInteraction = typeof sessionAIInteractions.$inferInsert;
