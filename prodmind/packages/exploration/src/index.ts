export {
  GraphTraverser,
  BFSTraverser,
  DFSTraverser,
  BoundedTraverser,
  LayeredTraverser,
  WeightedTraverser,
  TraversalContext,
  TraversalState,
  TraversalCache,
  TraversalOrdering,
  TraversalFingerprint,
} from './traversal/index.ts';
export type { TraversalContextOptions } from './traversal/traversal-context.ts';
export type { OrderingStrategy } from './traversal/traversal-ordering.ts';

export {
  GraphQueryEngine,
  GraphQueryParser,
  GraphQueryValidator,
  GraphQueryCompiler,
  GraphQueryExecutor,
  GraphQueryOptimizer,
  createQueryNode,
  createTargetNode,
  createConditionNode,
  createLogicNode,
  createParameterNode,
  QueryError,
} from './query/index.ts';
export type { QueryNode } from './query/index.ts';

export {
  SemanticExplorer,
  SemanticNeighborhood,
  SemanticTraversal,
  SemanticQuery,
  SemanticClustering,
  SemanticBoundaryDetector,
  SemanticHotspotAnalyzer,
  SemanticLinkage,
} from './semantic/index.ts';

export {
  PathFinder,
  ShortestPathFinder,
  WeightedPathFinder,
  PathRiskAnalyzer,
  PathComparator,
  PathSerializer,
  PathFingerprint,
  PathQuery,
} from './pathing/index.ts';

export {
  DependencyChainEngine,
  DependencyChainAnalyzer,
  DependencyChainRiskAnalyzer,
  DependencyChainCompressor,
  DependencyDepthAnalyzer,
  TransitiveDependencyAnalyzer,
  ReverseDependencyAnalyzer,
  DependencyExposureAnalyzer,
} from './dependency/index.ts';

export {
  GraphFilterEngine,
  NodeFilter,
  EdgeFilter,
  SemanticFilter,
  MetricFilter,
  StructuralFilter,
  FilterComposer,
  FilterQuery,
} from './filtering/index.ts';
export type { FilterConfig } from './filtering/graph-filter-engine.ts';

export {
  NeighborhoodEngine,
  NeighborhoodDiscovery,
  NeighborhoodRanking,
  NeighborhoodBoundary,
  NeighborhoodClustering,
  NeighborhoodRisk,
} from './neighborhoods/index.ts';
export type { NeighborhoodOptions } from './neighborhoods/neighborhood-engine.ts';

export {
  ExplorationSessionManager,
  ExplorationState,
  ExplorationHistory,
  ExplorationBookmarks,
  ExplorationCheckpoints,
  ExplorationReplay,
} from './sessions/index.ts';

export {
  TraversalReplay,
  QueryReplay,
  ReplayValidator,
  ReplayFingerprint,
  ReplayDiff,
  ReplayComparison,
} from './replay/index.ts';

export {
  TraversalOptimizer,
  QueryOptimizer,
  CachePlanner,
  ExecutionPlanner,
  GraphIndexes,
  BoundedExecution,
  OptimizationMetrics,
} from './optimization/index.ts';

export {
  TraversalSerializer,
  QuerySerializer,
  PathSerializer as PathDataSerializer,
  NeighborhoodSerializer,
  Canonicalization,
} from './serialization/index.ts';

export {
  TraversalValidator,
  QueryValidator,
  PathValidator,
  ReplayValidator as TraversalReplayValidator,
  IntegrityValidator,
} from './validation/index.ts';

export {
  TraversalTelemetry,
  QueryTelemetry,
  ExplorationMetricsCollector,
  PerformanceTelemetry,
} from './telemetry/index.ts';

export {
  TraversalAudit,
  ReplayAudit,
  DeterminismAudit,
  QueryAudit,
  OptimizationAudit,
  ExplorationAudit,
} from './audit/index.ts';

export {
  ExplorationError,
  TraversalError,
  TraversalCancelledError,
  BoundedTraversalExceededError,
  QueryParseError,
  QueryExecutionError,
  QueryValidationError,
  SemanticExplorationError,
  PathNotFoundError,
  DependencyChainError,
  CyclicDependencyError,
  ValidationError,
  ReplayError,
  ReplayMismatchError,
  OptimizationError,
  SerializationError,
  IntegrityError,
} from './errors/index.ts';

export type {
  TraversalStrategy,
  NodeType,
  EdgeType,
  NodeId,
  EdgeId,
  SessionId,
  TraversalId,
  QueryId,
  TraversalStatus,
  QueryOperator,
  QueryLogicOp,
  QueryTarget,
  CycleSeverity,
  FilterOperator,
  FilterComposition,
  RiskLevel,
  ExplorationStatus,
  OptimizationLevel,
  GraphNode,
  GraphEdge,
  GraphSnapshot,
  TraversalStep,
  TraversalResult,
  QueryCondition,
  QueryClause,
  GraphQuery,
  PathResult,
  DependencyChain,
  Neighborhood,
  SemanticCluster,
  SemanticBoundary,
  Hotspot,
  ExplorationSession,
  TraversalCacheEntry,
  QueryPlan,
  ExplorationMetrics,
} from './types/index.ts';

export type { GraphContract, TraversalContract, QueryContract, CacheContract } from './contracts/index.ts';
