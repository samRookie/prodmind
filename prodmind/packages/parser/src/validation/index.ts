export { IntegrityEngine } from './integrity-engine.ts';
export type { ValidationOutput } from './integrity-engine.ts';

export type {
  ValidationInput, ValidationContext, ValidationIssue, ValidationSummary,
  GraphValidationResult, SemanticValidationResult, RetrievalValidationResult,
  SnapshotValidationResult, IntegrityMetrics,
} from './validation-types.ts';
export { createValidationContext } from './validation-types.ts';

export { validateGraphStructure, validateNodeReferences, validateEdgeReferences, validateDuplicateEdges, validateDuplicateNodes, validateOrphanNodes, validateBrokenRegions, validateCycleCorrectness, validateGraphConnectivity } from './graph-integrity.ts';

export { validateDependencyStructure, validateBrokenDependencyTargets, validateCircularDependencies, validateDependencyDepthLimits, validateAliasResolutionIntegrity, validateReExportChains } from './dependency-validation.ts';

export { validateSemanticStructure, validateSemanticClassification, validateBoundaryConsistency, validateClusterIntegrity, validateNamespaceOwnership, validateSemanticIsolation, validateCrossBoundaryLeaks } from './semantic-validation.ts';

export { validateSymbolStructure, validateCanonicalOwnership, validateDuplicateSymbolOwnership, validateUnresolvedSymbols, validateSymbolNamespaceConsistency, validateCrossModuleOwnership } from './symbol-validation.ts';

export { validateRetrievalStructure, validateNeighborhoodTraversal, validateDepthBoundaries, validateRetrievalDeterminism, validateBlastRadiusConsistency, validateRetrievalOrdering, validateCacheConsistency } from './retrieval-validation.ts';

export { validateMetricsStructure, validateMetricRanges, validateCentralityConsistency, validateInstabilityScores, validateComplexityScores, validatePropagationScores } from './metrics-validation.ts';

export { validateSnapshotReadiness, computeReadinessScore, computeIntegrityScore, determineValidationState, checkReadiness } from './snapshot-readiness.ts';
export type { ReadinessCheck } from './snapshot-readiness.ts';

export { generateValidationReport, aggregateValidationMetrics, summarizeCriticalIssues } from './validation-report.ts';
export type { ValidationReport } from './validation-report.ts';

export { ValidationError, GraphIntegrityError, RetrievalIntegrityError, SnapshotIntegrityError } from './validation-errors.ts';

export { Phase4SystemVerifier, SnapshotFreezer, SystemBenchmark } from '../verification/index.ts';
export type {
  VerificationReport, VerificationIssue as VerifierIssue,
  VerificationSummary, PerformanceMetrics, DeterminismFlags,
  SystemHealth, RemediationSummary, VerificationStatus,
  FreezableSnapshot, FrozenSnapshot,
  BenchmarkScale, BenchmarkTarget, ScaleBenchmarkResult, BenchmarkReport,
} from '../verification/index.ts';
export { VerificationError as VerifierError, SystemVerificationError, SnapshotFrozenError, BenchmarkTargetError } from '../verification/index.ts';
