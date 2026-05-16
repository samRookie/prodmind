import type { SymbolType } from '../types/ast.types.ts';
import type { EdgeType } from '@prodmind/contracts';

export interface ExportInfo {
  symbolName: string;
  localName: string;
  sourceFile: string;
  isDefault: boolean;
  isReExport: boolean;
  originalSource?: string;
}

export interface ExportMap {
  filePath: string;
  named: Map<string, ExportInfo>;
  defaultExport: ExportInfo | null;
  starExports: string[];
  namespaceExports: Map<string, string>;
}

export interface ResolvedImport {
  sourceFile: string;
  importSource: string;
  resolvedPath: string | null;
  resolvedSymbols: ResolvedSymbol[];
  isExternal: boolean;
  unresolvedReason: string | null;
}

export interface ResolvedSymbol {
  symbolName: string;
  owningFile: string | null;
  isDefault: boolean;
  isNamespace: boolean;
  confidence: number;
}

export interface SymbolRegistration {
  canonicalId: string;
  symbolName: string;
  owningFile: string;
  symbolType: SymbolType;
  isExported: boolean;
  reExportSources: string[];
}

export interface UnresolvedDependency {
  sourceFile: string;
  importSource: string;
  symbolName?: string;
  reason: string;
}

export interface ExportConflict {
  symbolName: string;
  files: string[];
  type: 'DUPLICATE' | 'CYCLE' | 'AMBIGUOUS';
}

export interface SemanticDependency {
  sourceFile: string;
  targetFile: string;
  relationshipType: EdgeType;
  symbols: ResolvedSymbol[];
  confidence: number;
}

export interface ResolutionResult {
  dependencies: SemanticDependency[];
  symbolRegistry: Map<string, SymbolRegistration[]>;
  unresolvedImports: UnresolvedDependency[];
  exportConflicts: ExportConflict[];
}

export interface ResolvedPath {
  resolvedPath: string | null;
  isExternal: boolean;
  reason: string | null;
}
