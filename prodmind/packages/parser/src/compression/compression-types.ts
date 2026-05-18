export interface CompressedSymbolRef {
  id: string;
  name: string;
  type: string;
  visibility: 'exported' | 'internal';
  isAsync: boolean;
  dependencyCount: number;
  centralityScore: number;
}

export interface CompressedImport {
  source: string;
  specifiers: string[];
  isExternal: boolean;
}

export interface CompressedExport {
  name: string;
  isDefault: boolean;
}

export interface CompressedFileContext {
  filePath: string;
  purpose: string;
  language: string;
  symbols: CompressedSymbolRef[];
  imports: CompressedImport[];
  exports: CompressedExport[];
  isAsync: boolean;
  architecturalRole: string;
  semanticClassification: string;
  dependencyCount: number;
  dependencyFilePaths: string[];
}

export interface CompressedModuleSummary {
  modulePath: string;
  fileCount: number;
  symbolCount: number;
  dependencyCount: number;
  isIsolated: boolean;
  isHotspot: boolean;
}

export interface CompressedModuleContext {
  modulePath: string;
  totalFiles: number;
  totalSymbols: number;
  exportedSymbols: number;
  internalSymbols: number;
  filePaths: string[];
  dependencyModulePaths: string[];
  dependentModulePaths: string[];
  couplingLevel: 'high' | 'medium' | 'low';
  boundaryType: 'core' | 'infrastructure' | 'shared' | 'isolated';
  topSymbols: CompressedSymbolRef[];
}

export interface CompressedRepositoryContext {
  snapshotId: string;
  architectureSummary: string;
  totalFiles: number;
  totalModules: number;
  totalSymbols: number;
  totalDependencies: number;
  languages: string[];
  modules: CompressedModuleSummary[];
  dependencyTopologySummary: string;
  semanticDomainSummary: string;
  infrastructureSummary: string;
  couplingHotspots: string[];
  isolatedSubsystems: string[];
  generatedAt: string;
}

export interface CompressionMetrics {
  compressionRatio: number;
  tokenReductionRatio: number;
  preservedDependencyCount: number;
  preservedSymbolCoverage: number;
  preservedSemanticCoverage: number;
  graphRetentionScore: number;
  compressionConsistencyScore: number;
  originalTokenCount: number;
  compressedTokenCount: number;
  originalDependencyCount: number;
  originalSymbolCount: number;
  originalFileCount: number;
  compressedDependencyCount: number;
  compressedSymbolCount: number;
}

export interface CompressionInput {
  parseResults: import('../types/ast.types.ts').ParseResult[];
  resolution?: import('../resolution/resolution-types.ts').ResolutionResult;
  fileHashes: Map<string, string>;
  snapshotId: string;
}

export interface CompressionOutput {
  fileContexts: Map<string, CompressedFileContext>;
  moduleContexts: Map<string, CompressedModuleContext>;
  repositoryContext: CompressedRepositoryContext;
  metrics: CompressionMetrics;
}
