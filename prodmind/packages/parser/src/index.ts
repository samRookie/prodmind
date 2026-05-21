export { ZipExtractor } from './extractors/index.ts';
export { ExtractionWorkspace } from './extractors/index.ts';
export type { ExtractionResult, ExtractionLimitsConfig } from './extractors/index.ts';
export {
  ExtractionError,
  ExtractionLimitError,
  CorruptedArchiveError,
} from './extractors/index.ts';

export { RepositorySanitizer } from './sanitizers/index.ts';
export type { SanitizerConfig } from './sanitizers/index.ts';
export { IgnoreRules } from './sanitizers/index.ts';
export type { IgnoreRulesConfig } from './sanitizers/index.ts';
export { FileClassifier } from './sanitizers/index.ts';
export { RelevanceScorer } from './sanitizers/index.ts';
export type { RelevanceScoreConfig } from './sanitizers/index.ts';
export { SecretDetector } from './sanitizers/index.ts';
export { SanitizationReportBuilder } from './sanitizers/index.ts';
export {
  SanitizationError,
  FileClassificationError,
  SecretDetectionError,
} from './sanitizers/index.ts';

export type { ClassifiedFile, FileCategory, Language } from './types/classification.types.ts';
export { FileCategory as FileCategoryEnum } from './types/classification.types.ts';
export { Language as LanguageEnum } from './types/classification.types.ts';
export type {
  FileEntry,
  ParseCandidate,
  SecretMatch,
  SanitizationWarning,
  SanitizationReport,
} from './types/sanitization.types.ts';

export { FileDiscovery } from './hashers/index.ts';
export { Sha256Hasher } from './hashers/index.ts';
export { getContentType } from './hashers/index.ts';
export { ManifestBuilder } from './hashers/index.ts';
export { SnapshotDiff } from './hashers/index.ts';
export {
  HashingError,
  FileDiscoveryError,
  ManifestGenerationError,
  SnapshotDiffError,
} from './hashers/index.ts';

export type { DiscoveredFile, HashResult, FileDiscoveryOptions } from './types/hashing.types.ts';
export type { RepositoryManifest, ManifestFileEntry } from './types/manifest.types.ts';
export type { SnapshotDiffResult, DiffStatistics } from './types/diff.types.ts';

export { parseTypeScriptFile } from './parsers/index.ts';
export { batchParseFiles } from './parsers/index.ts';
export type { BatchParseOptions } from './parsers/index.ts';
export { shouldParseFile, getLanguage } from './parsers/index.ts';


export type {
  ParsedFile,
  ParseSuccess,
  ParseFailure,
  ParseResult,
  SymbolMetadata,
  ImportMetadata,
  ExportMetadata,
  SourceLocation,
  ParseTiming,
} from './types/ast.types.ts';
export { SymbolType as SymbolTypeEnum } from './types/ast.types.ts';

export { PathResolver, ModuleResolver, ExportResolver, SymbolRegistry, DependencyResolver, GraphNormalizer } from './resolution/index.ts';
export type {
  TsconfigPaths, ExportInfo, ExportMap, ResolvedImport, ResolvedSymbol,
  SymbolRegistration, UnresolvedDependency, ExportConflict, SemanticDependency,
  ResolutionResult, ResolvedPath,
} from './resolution/index.ts';
export { ResolutionError, PathResolutionError, ExportResolutionError, CyclicReExportError } from './resolution/index.ts';

export { CompressionEngine, FileCompressor, ModuleCompressor, SymbolCompressor, RepositoryCompressor, CompressionMetricsCalculator } from './compression/index.ts';
export { DEFAULT_COMPRESSION_RULES } from './compression/index.ts';
export type { CompressionRulesConfig } from './compression/index.ts';
export type {
  CompressionInput, CompressionOutput, CompressedFileContext, CompressedModuleContext,
  CompressedRepositoryContext, CompressionMetrics, CompressedSymbolRef, CompressedImport, CompressedExport,
} from './compression/index.ts';
export { CompressionError, FileCompressionError, ModuleCompressionError, RepositoryCompressionError, MetricCalculationError } from './compression/index.ts';

export { IncrementalEngine, SnapshotDiffEngine, GraphDiffEngine, SemanticDiffEngine, CompressionDiffEngine, DependencyImpactEngine, ReuseEngine, InvalidationEngine, DiffMetricsCalculator } from './incremental/index.ts';
export type {
  IncrementalSnapshotDiffResult, IncrementalGraphDiffResult, IncrementalSemanticDiffResult, IncrementalCompressionDiffResult,
  IncrementalDependencyImpactResult, ReusePlan, ReusePlanEntry, InvalidationResult, InvalidationEntry,
  IncrementalAnalysisMetrics, IncrementalInput, IncrementalOutput, FileChangeSet, NodeRef, EdgeRef, SemanticDriftEntry,
} from './incremental/index.ts';
export { IncrementalError, IncrementalSnapshotDiffError, IncrementalGraphDiffError, IncrementalSemanticDiffError, IncrementalCompressionDiffError, IncrementalDependencyImpactError, IncrementalReuseError, IncrementalInvalidationError } from './incremental/index.ts';

export { SemanticEngine } from './semantic/index.ts';
export type {
  SemanticInput, SemanticOutput, ClassificationResult, ClassificationHeuristic,
  InfraBusinessResult, DomainClusterResult, CouplingEdgeResult,
} from './semantic/index.ts';
export { classifyNodeSemanticType, classifyFileSemanticRole, classifyModuleSemanticRole, computeSemanticRuleStrength } from './semantic/index.ts';
export { detectInfrastructureLayer, detectBusinessLogicLayer, computeInfraWeight, computeBusinessWeight } from './semantic/index.ts';
export { clusterDomainRegions, computeClusterAffinity, detectSharedClusters, detectFragmentedDomains } from './semantic/index.ts';
export { detectArchitecturalRegions } from './semantic/index.ts';
export type { ArchitecturalRegion } from './semantic/index.ts';
export { analyzeDirectEdges, detectCouplingHotspots, classifyCoupling, computeCouplingStrength, computePropagationRisk } from './semantic/index.ts';
export type { CouplingAnalysisInput } from './semantic/index.ts';
export { SemanticError, ClassificationError, CouplingAnalysisError, DomainClusteringError } from './semantic/index.ts';

export { MetricsEngine } from './metrics/index.ts';
export type {
  MetricsInput, MetricsOutput, MetricsNode, MetricsEdge, MetricRecord,
  CentralityResult, FanMetricsResult, CouplingDensityResult,
  InstabilityResult, PropagationRiskResult, DepthResult, ComplexityResult,
} from './metrics/index.ts';
export { computeCentrality, computeFanMetrics, classifyFanLevel, isUtilityHotspot, isGodModule } from './metrics/index.ts';
export { computeCouplingDensity, computeInstability, classifyInstability } from './metrics/index.ts';
export { computeComplexity, computeDepthAnalysis } from './metrics/index.ts';
export { createGraphAnalysisCache } from './metrics/index.ts';
export type { GraphAnalysisCache, SCCResult } from './metrics/index.ts';
export { MetricsError, CentralityError, FanMetricsError, CouplingDensityError, InstabilityError, PropagationRiskError, ComplexityError, DepthAnalysisError } from './metrics/index.ts';

export { IntegrityEngine } from './validation/index.ts';
export type { ValidationInput, ValidationOutput, ValidationContext, ValidationIssue, ValidationSummary } from './validation/index.ts';
export type { GraphValidationResult, SemanticValidationResult, RetrievalValidationResult, SnapshotValidationResult, IntegrityMetrics } from './validation/index.ts';
export { validateGraphStructure, validateDependencyStructure, validateSemanticStructure, validateSymbolStructure, validateRetrievalStructure, validateMetricsStructure } from './validation/index.ts';
export { validateSnapshotReadiness, computeReadinessScore, computeIntegrityScore, determineValidationState } from './validation/index.ts';
export { generateValidationReport, aggregateValidationMetrics, summarizeCriticalIssues } from './validation/index.ts';
export type { ValidationReport } from './validation/index.ts';
export { ValidationError, GraphIntegrityError, RetrievalIntegrityError, SnapshotIntegrityError } from './validation/index.ts';

export { Phase4SystemVerifier, SnapshotFreezer, SystemBenchmark } from './verification/index.ts';
export type { VerificationReport, VerificationIssue, VerificationSummary, PerformanceMetrics, DeterminismFlags, SystemHealth, RemediationSummary, VerificationStatus } from './verification/index.ts';
export type { FreezableSnapshot, FrozenSnapshot } from './verification/index.ts';
export type { BenchmarkScale, BenchmarkTarget, ScaleBenchmarkResult, BenchmarkReport } from './verification/index.ts';
export { VerificationError, SystemVerificationError, SnapshotFrozenError, BenchmarkTargetError } from './verification/index.ts';

export { RetrievalEngine } from './retrieval/index.ts';
export type { RetrievalInput } from './retrieval/index.ts';
export type {
  RetrievalQuery, RetrievalContext, RetrievalResult, RetrievalMetadata, RetrievalStats,
  RetrievedNode, RetrievedEdge, NeighborhoodResult, BlastRadiusResult,
  ArchitecturalSliceResult, SymbolNeighborhoodResult,
} from './retrieval/index.ts';
export { createRetrievalCache } from './retrieval/index.ts';
export { retrieveDependencyNeighborhood, retrieveReverseDependencies, retrieveBidirectionalNeighborhood, retrieveDepthLimitedSubgraph } from './retrieval/index.ts';
export { retrieveSymbolOwners, retrieveSymbolNeighbors, retrieveSharedNamespaces, retrieveCrossModuleSymbolUsage } from './retrieval/index.ts';
export { retrieveBlastRadiusSubgraph, rankPropagationRisk, computeTraversalPressure, retrieveCriticalPropagationPaths } from './retrieval/index.ts';
export { retrieveArchitecturalSlice, retrieveInfrastructureSlice, retrieveBusinessDomainSlice, retrieveSemanticClusterSlice } from './retrieval/index.ts';
export { rankRetrievedNodes, computeRetrievalWeight, applyMetricWeighting, applySemanticWeighting, applyRiskWeighting } from './retrieval/index.ts';
export { stableNodeSort, stableEdgeSort, stableMetricSort } from './retrieval/index.ts';
export { RetrievalError, RetrievalTraversalError, RetrievalOrderingError } from './retrieval/index.ts';
