export { createDrizzleClient, getDb, closeDb, createTestClient } from './client.ts';
export type { Database, DrizzleClientOptions } from './client.ts';

export { generateId, safeJsonParse, now } from './utils.ts';

export * from './schema/index.ts';

export {
  ProjectRepository,
  SnapshotRepository,
  GraphRepository,
  RiskRepository,
  EventRepository,
  JobRepository,
  CompressionRepository,
  IncrementalRepository,
  SemanticRepository,
  CouplingRepository,
  DomainRepository,
  MetricsRepository,
  RetrievalRepository,
  ValidationRepository,
  InsightsRepository,
} from './repositories/index.ts';

export {
  bfsTraversal,
  computeBlastRadius,
  getDependencyGraph,
  getSubgraph,
  getCircularDependencies,
} from './graph/index.ts';

export type {
  TraversalConfig,
  TraversalLevel,
  TraversalResult,
} from './graph/traversal.ts';

export type {
  BlastRadiusResult,
} from './graph/blast-radius.ts';

export type {
  CircularDependency,
} from './graph/dependency-query.ts';

export {
  getCompressedFileContext,
  getCompressedFileContextsBySnapshot,
  getCompressedModuleContext,
  getAllModuleContexts,
  getHighValueSymbols,
  getCompressedRepositoryContext,
  getCriticalDependencyChains,
  getCompressedTopologySummary,
} from './compression/index.ts';

export type {
  CompressedFileContextResult,
  CompressedModuleContextResult,
  HighValueSymbolResult,
  CompressedRepositoryContextResult,
} from './compression/index.ts';

export {
  getSnapshotLineage,
  getPreviousSnapshotId,
  getSnapshotDiffsBySnapshot,
  getSnapshotDiffByType,
  getReusedArtifacts,
  getReusedArtifactsByType,
  getInvalidatedRegions,
  getInvalidatedByType,
  getIncrementalMetrics,
} from './incremental/index.ts';

export type {
  SnapshotLineageResult,
  SnapshotDiffQueryResult,
  ReuseArtifactResult,
  InvalidationRegionResult,
  IncrementalMetricsQueryResult,
} from './incremental/index.ts';
