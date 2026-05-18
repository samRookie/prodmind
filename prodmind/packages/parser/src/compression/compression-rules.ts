export interface CompressionRulesConfig {
  stripSourceLocation: boolean;
  stripParseTiming: boolean;
  stripEmptySymbols: boolean;
  stripDuplicateImports: boolean;
  stripInternalOnlySymbols: boolean;
  maxSymbolsPerFile: number;
  maxDependenciesPerFile: number;
  prioritySymbolTypes: string[];
  highValueCentralityThreshold: number;
  preserveExportedAPIs: boolean;
  preserveAsyncMarkers: boolean;
  preserveModuleBoundaries: boolean;
  preserveDependencyChains: boolean;
  preserveSemanticClassification: boolean;
  preserveCriticalPaths: boolean;
  preserveIsolatedSubsystems: boolean;
  preserveCouplingHotspots: boolean;
}

export const DEFAULT_COMPRESSION_RULES: CompressionRulesConfig = {
  stripSourceLocation: true,
  stripParseTiming: true,
  stripEmptySymbols: true,
  stripDuplicateImports: true,
  stripInternalOnlySymbols: false,
  maxSymbolsPerFile: 50,
  maxDependenciesPerFile: 200,
  prioritySymbolTypes: ['CLASS', 'INTERFACE', 'FUNCTION'],
  highValueCentralityThreshold: 0.5,
  preserveExportedAPIs: true,
  preserveAsyncMarkers: true,
  preserveModuleBoundaries: true,
  preserveDependencyChains: true,
  preserveSemanticClassification: true,
  preserveCriticalPaths: true,
  preserveIsolatedSubsystems: true,
  preserveCouplingHotspots: true,
};
