export { CompressionEngine } from './compression-engine.ts';
export { FileCompressor } from './file-compressor.ts';
export { ModuleCompressor } from './module-compressor.ts';
export { SymbolCompressor } from './symbol-compressor.ts';
export { RepositoryCompressor } from './repository-compressor.ts';
export { CompressionMetricsCalculator } from './compression-metrics.ts';
export { DEFAULT_COMPRESSION_RULES } from './compression-rules.ts';
export type { CompressionRulesConfig } from './compression-rules.ts';
export type {
  CompressionInput,
  CompressionOutput,
  CompressedFileContext,
  CompressedModuleContext,
  CompressedRepositoryContext,
  CompressionMetrics,
  CompressedSymbolRef,
  CompressedImport,
  CompressedExport,
  CompressedModuleSummary,
} from './compression-types.ts';
export {
  CompressionError,
  FileCompressionError,
  ModuleCompressionError,
  RepositoryCompressionError,
  MetricCalculationError,
} from './compression-errors.ts';
