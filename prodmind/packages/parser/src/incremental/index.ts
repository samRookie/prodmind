export { IncrementalEngine } from './incremental-engine.ts';
export { SnapshotDiffEngine } from './snapshot-diff-engine.ts';
export { GraphDiffEngine } from './graph-diff-engine.ts';
export { SemanticDiffEngine } from './semantic-diff-engine.ts';
export { CompressionDiffEngine } from './compression-diff-engine.ts';
export { DependencyImpactEngine } from './dependency-impact-engine.ts';
export { ReuseEngine } from './reuse-engine.ts';
export { InvalidationEngine } from './invalidation-engine.ts';
export { DiffMetricsCalculator } from './diff-metrics.ts';

export type {
  IncrementalSnapshotDiffResult,
  IncrementalGraphDiffResult,
  IncrementalSemanticDiffResult,
  IncrementalCompressionDiffResult,
  IncrementalDependencyImpactResult,
  ReusePlan,
  ReusePlanEntry,
  InvalidationResult,
  InvalidationEntry,
  IncrementalAnalysisMetrics,
  IncrementalInput,
  IncrementalOutput,
  FileChangeSet,
  NodeRef,
  EdgeRef,
  SemanticDriftEntry,
} from './diff-types.ts';

export {
  IncrementalError,
  IncrementalSnapshotDiffError,
  IncrementalGraphDiffError,
  IncrementalSemanticDiffError,
  IncrementalCompressionDiffError,
  IncrementalDependencyImpactError,
  IncrementalReuseError,
  IncrementalInvalidationError,
} from './diff-errors.ts';
