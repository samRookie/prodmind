export { RetrievalEngine } from './retrieval-engine.ts';
export type { RetrievalInput } from './retrieval-engine.ts';
export type {
  RetrievalQuery,
  RetrievalContext,
  RetrievalResult,
  RetrievalMetadata,
  RetrievalStats,
  RetrievedNode,
  RetrievedEdge,
  NeighborhoodResult,
  BlastRadiusResult,
  ArchitecturalSliceResult,
  SymbolNeighborhoodResult,
} from './retrieval-types.ts';

export { createRetrievalCache } from './retrieval-cache.ts';

export { retrieveDependencyNeighborhood, retrieveReverseDependencies, retrieveBidirectionalNeighborhood, retrieveDepthLimitedSubgraph } from './graph-neighborhood.ts';
export { retrieveSymbolOwners, retrieveSymbolNeighbors, retrieveSharedNamespaces, retrieveCrossModuleSymbolUsage } from './symbol-neighborhood.ts';
export { retrieveBlastRadiusSubgraph, rankPropagationRisk, computeTraversalPressure, retrieveCriticalPropagationPaths } from './blast-radius-retrieval.ts';
export { retrieveArchitecturalSlice, retrieveInfrastructureSlice, retrieveBusinessDomainSlice, retrieveSemanticClusterSlice } from './architectural-slice.ts';
export { rankRetrievedNodes, computeRetrievalWeight, applyMetricWeighting, applySemanticWeighting, applyRiskWeighting } from './retrieval-ranking.ts';
export { stableNodeSort, stableEdgeSort, stableMetricSort } from './deterministic-ordering.ts';

export { RetrievalError, RetrievalTraversalError, RetrievalOrderingError } from './retrieval-errors.ts';
