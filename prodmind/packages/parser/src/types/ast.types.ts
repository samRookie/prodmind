export enum SymbolType {
  FUNCTION = 'FUNCTION',
  CLASS = 'CLASS',
  INTERFACE = 'INTERFACE',
  ENUM = 'ENUM',
  TYPE_ALIAS = 'TYPE_ALIAS',
  VARIABLE = 'VARIABLE',
  MODULE = 'MODULE',
}

export interface SourceLocation {
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

export interface ImportMetadata {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isNamespace: boolean;
  location: SourceLocation;
}

export interface ExportMetadata {
  name: string;
  symbolType: SymbolType;
  isDefault: boolean;
  isNamed: boolean;
  location: SourceLocation;
}

export interface SymbolMetadata {
  name: string;
  symbolType: SymbolType;
  exported: boolean;
  isAsync: boolean;
  location: SourceLocation;
  dependencies: string[];
}

export interface ParseTiming {
  startTime: string;
  endTime: string;
  durationMs: number;
  parserVersion: string;
}

export interface ParsedFile {
  path: string;
  language: string;
  symbols: SymbolMetadata[];
  imports: ImportMetadata[];
  exports: ExportMetadata[];
  timing: ParseTiming;
}

export interface ParseSuccess {
  success: true;
  data: ParsedFile;
}

export interface ParseFailure {
  success: false;
  path: string;
  error: string;
  errorType: 'UNSUPPORTED' | 'MALFORMED_SYNTAX' | 'WORKER_CRASH' | 'TIMEOUT';
  timing: ParseTiming;
}

export type ParseResult = ParseSuccess | ParseFailure;
