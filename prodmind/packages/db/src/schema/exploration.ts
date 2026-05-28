import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { index } from 'drizzle-orm/sqlite-core';

export const explorationSessions = sqliteTable('exploration_sessions', {
  id: text('id').primaryKey(),
  status: text('status', { enum: ['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'] }).notNull().default('ACTIVE'),
  query: text('query').notNull(),
  strategy: text('strategy', { enum: ['BFS', 'DFS', 'BOUNDED', 'WEIGHTED', 'LAYERED', 'REVERSE', 'SEMANTIC', 'SCC_AWARE', 'DEPENDENCY_AWARE'] }).notNull(),
  startNode: text('start_node'),
  visited: text('visited').notNull().default('[]'),
  bookmarks: text('bookmarks').notNull().default('[]'),
  checkpoint: text('checkpoint'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
}, (table) => ({
  statusIdx: index('idx_exploration_sessions_status').on(table.status),
  queryIdx: index('idx_exploration_sessions_query').on(table.query),
  createdAtIdx: index('idx_exploration_sessions_created_at').on(table.createdAt),
}));

export const explorationQueries = sqliteTable('exploration_queries', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  dsl: text('dsl').notNull(),
  target: text('target', { enum: ['NODES', 'EDGES', 'PATHS', 'NEIGHBORHOODS', 'CYCLES', 'HOTSPOTS'] }).notNull(),
  resultCount: integer('result_count').notNull().default(0),
  duration: real('duration').notNull().default(0),
  fingerprint: text('fingerprint').notNull(),
  cached: integer('cached', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  sessionIdx: index('idx_exploration_queries_session').on(table.sessionId),
  targetIdx: index('idx_exploration_queries_target').on(table.target),
  createdAtIdx: index('idx_exploration_queries_created_at').on(table.createdAt),
}));

export const traversalHistory = sqliteTable('traversal_history', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  strategy: text('strategy', { enum: ['BFS', 'DFS', 'BOUNDED', 'WEIGHTED', 'LAYERED', 'REVERSE', 'SEMANTIC', 'SCC_AWARE', 'DEPENDENCY_AWARE'] }).notNull(),
  startNode: text('start_node').notNull(),
  nodeCount: integer('node_count').notNull().default(0),
  depth: integer('depth').notNull().default(0),
  duration: real('duration').notNull().default(0),
  status: text('status', { enum: ['PENDING', 'RUNNING', 'COMPLETED', 'CANCELLED', 'FAILED', 'BOUNDED'] }).notNull(),
  fingerprint: text('fingerprint').notNull(),
  steps: text('steps').notNull().default('[]'),
  visited: text('visited').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  sessionIdx: index('idx_traversal_history_session').on(table.sessionId),
  strategyIdx: index('idx_traversal_history_strategy').on(table.strategy),
  statusIdx: index('idx_traversal_history_status').on(table.status),
}));

export const explorationBookmarksDb = sqliteTable('exploration_bookmarks', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  nodeId: text('node_id').notNull(),
  label: text('label').notNull(),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  sessionIdx: index('idx_exploration_bookmarks_session').on(table.sessionId),
  nodeIdx: index('idx_exploration_bookmarks_node').on(table.nodeId),
}));

export const traversalReplayDb = sqliteTable('traversal_replay', {
  id: text('id').primaryKey(),
  originalTraversalId: text('original_traversal_id').notNull(),
  fingerprint: text('fingerprint').notNull(),
  replayedFingerprint: text('replayed_fingerprint').notNull(),
  match: integer('match', { mode: 'boolean' }).notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  originalIdx: index('idx_traversal_replay_original').on(table.originalTraversalId),
}));

export const pathAnalysisResults = sqliteTable('path_analysis_results', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  fromNode: text('from_node').notNull(),
  toNode: text('to_node').notNull(),
  path: text('path').notNull().default('[]'),
  totalWeight: real('total_weight').notNull().default(0),
  riskScore: real('risk_score').notNull().default(0),
  riskLevel: text('risk_level', { enum: ['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] }).notNull().default('NONE'),
  fingerprint: text('fingerprint').notNull(),
  createdAt: text('created_at').notNull(),
}, (table) => ({
  sessionIdx: index('idx_path_analysis_session').on(table.sessionId),
  fromIdx: index('idx_path_analysis_from').on(table.fromNode),
  toIdx: index('idx_path_analysis_to').on(table.toNode),
}));

export const neighborhoodCache = sqliteTable('neighborhood_cache', {
  id: text('id').primaryKey(),
  centerNode: text('center_node').notNull(),
  radius: integer('radius').notNull(),
  nodes: text('nodes').notNull().default('[]'),
  edges: text('edges').notNull().default('[]'),
  nodeCount: integer('node_count').notNull().default(0),
  edgeCount: integer('edge_count').notNull().default(0),
  density: real('density').notNull().default(0),
  fingerprint: text('fingerprint').notNull(),
  createdAt: text('created_at').notNull(),
  expiresAt: text('expires_at'),
}, (table) => ({
  centerIdx: index('idx_neighborhood_cache_center').on(table.centerNode),
  radiusIdx: index('idx_neighborhood_cache_radius').on(table.radius),
}));

export type ExplorationSessionRow = typeof explorationSessions.$inferSelect;
export type NewExplorationSessionRow = typeof explorationSessions.$inferInsert;
export type ExplorationQueryRow = typeof explorationQueries.$inferSelect;
export type NewExplorationQueryRow = typeof explorationQueries.$inferInsert;
export type TraversalHistoryRow = typeof traversalHistory.$inferSelect;
export type NewTraversalHistoryRow = typeof traversalHistory.$inferInsert;
export type ExplorationBookmarkRow = typeof explorationBookmarksDb.$inferSelect;
export type NewExplorationBookmarkRow = typeof explorationBookmarksDb.$inferInsert;
export type TraversalReplayRow = typeof traversalReplayDb.$inferSelect;
export type NewTraversalReplayRow = typeof traversalReplayDb.$inferInsert;
export type PathAnalysisResultRow = typeof pathAnalysisResults.$inferSelect;
export type NewPathAnalysisResultRow = typeof pathAnalysisResults.$inferInsert;
export type NeighborhoodCacheRow = typeof neighborhoodCache.$inferSelect;
export type NewNeighborhoodCacheRow = typeof neighborhoodCache.$inferInsert;
