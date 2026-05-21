export { SemanticEngine } from './semantic-engine.ts';
export type {
  SemanticInput,
  SemanticOutput,
  ClassificationResult,
  ClassificationHeuristic,
  InfraBusinessResult,
  DomainClusterResult,
  CouplingEdgeResult,
} from './types.ts';

export { classifyNodeSemanticType, classifyFileSemanticRole, classifyModuleSemanticRole, computeSemanticRuleStrength } from './classifier.ts';
export { detectInfrastructureLayer, detectBusinessLogicLayer, computeInfraWeight, computeBusinessWeight } from './infra-detector.ts';
export { clusterDomainRegions, computeClusterAffinity, detectSharedClusters, detectFragmentedDomains } from './domain-clustering.ts';
export { detectArchitecturalRegions } from './architectural-region.ts';
export type { ArchitecturalRegion } from './architectural-region.ts';
export { analyzeDirectEdges, detectCouplingHotspots, classifyCoupling, computeCouplingStrength, computePropagationRisk } from './coupling-analysis.ts';
export type { CouplingAnalysisInput } from './coupling-analysis.ts';

export { SemanticError, ClassificationError, CouplingAnalysisError, DomainClusteringError } from './semantic-errors.ts';
