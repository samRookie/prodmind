export type {
  ContextAssemblyRequest,
  ContextNode,
  ContextDependencyEdge,
  ContextRegion,
  ContextDependencyChain,
  ContextSlice,
  ContextCompressionEnvelope,
  ContextBudget,
  RetrievalCandidate,
  RankedContextResult,
  AssemblyTraceEntry,
  AssemblyTrace,
  AssemblyMetrics,
  ContextAssemblyResult,
  ContextReplayEnvelope,
  ContextSliceKind,
  CompressionPreference,
  AssemblyOperation,
} from './contracts.ts';

export {
  createContextNode,
  createContextDependencyEdge,
  createContextRegion,
  createContextDependencyChain,
  createContextSlice,
  createContextCompressionEnvelope,
  createContextBudget,
  createRetrievalCandidate,
  createRankedContextResult,
  createAssemblyTraceEntry,
  createAssemblyTrace,
  createAssemblyMetrics,
  createContextAssemblyResult,
  createContextReplayEnvelope,
} from './contracts.ts';

export {
  ContextAssemblyError,
  RetrievalPhaseError,
  RankingError,
  SlicingError,
  BudgetExceededError,
  CompressionError,
  DedupError,
  ReplayMismatchError,
  InvalidRegionError,
  TokenBudgetError,
} from './errors.ts';

export {
  contextWeightsSchema,
  tokenBudgetSchema,
  contextConfigSchema,
  resolveContextConfig,
  resetContextConfig,
} from './config.ts';
export type { ContextWeights, TokenBudget, ContextConfig } from './config.ts';

export { ContextRetrievalEngine } from './retrieval.ts';

export { NeighborhoodEngine } from './neighborhood.ts';

export { RankingEngine } from './ranking.ts';
