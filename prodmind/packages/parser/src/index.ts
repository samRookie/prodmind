export { ZipExtractor } from './extractors/index.ts';
export { ExtractionWorkspace } from './extractors/index.ts';
export type { ExtractionResult, ExtractionLimitsConfig } from './extractors/index.ts';
export {
  ExtractionError,
  ZipSlipError,
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
export {
  ParserError,
  UnsupportedFileError,
  MalformedSyntaxError,
  WorkerParserError,
} from './parsers/index.ts';

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
