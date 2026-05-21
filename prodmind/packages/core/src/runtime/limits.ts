import type { DbLimits as _DbLimits, GraphLimits as _GraphLimits, Limits as _Limits, ParseLimits as _ParseLimits, ServerLimits as _ServerLimits,UploadLimits as _UploadLimits } from '../config/limits.ts';
import { DEFAULT_LIMITS } from '../config/limits.ts';

export type Limits = _Limits;
export type UploadLimits = _UploadLimits;
export type ParseLimits = _ParseLimits;
export type GraphLimits = _GraphLimits;
export type DbLimits = _DbLimits;
export type ServerLimits = _ServerLimits;

let _limits: _Limits | null = null;

export function getLimits(): _Limits {
  if (_limits) return _limits;
  _limits = DEFAULT_LIMITS;
  return _limits;
}

export function setLimits(limits: _Limits): void {
  _limits = limits;
}

export function resetLimits(): void {
  _limits = null;
}

export const MAX_UPLOAD_SIZE_MB = 50;
export const MAX_EXTRACTION_SIZE_MB = 200;
export const MAX_FILE_COUNT = 100;
export const MAX_PARSE_TIME_MS = 30_000;
export const MAX_WORKER_THREADS = 4;
export const MAX_AST_FILE_SIZE_KB = 500;
export const MAX_GRAPH_NODES = 50_000;
export const MAX_GRAPH_EDGES = 200_000;

export const UPLOAD_LIMITS = {
  maxUploadSizeMB: MAX_UPLOAD_SIZE_MB,
  maxUploadSizeBytes: MAX_UPLOAD_SIZE_MB * 1024 * 1024,
  maxExtractionSizeMB: MAX_EXTRACTION_SIZE_MB,
  maxExtractionSizeBytes: MAX_EXTRACTION_SIZE_MB * 1024 * 1024,
  maxFileCount: MAX_FILE_COUNT,
} as const;

export const PARSE_LIMITS = {
  maxParseTimeMS: MAX_PARSE_TIME_MS,
  maxWorkerThreads: MAX_WORKER_THREADS,
  maxASTFileSizeKB: MAX_AST_FILE_SIZE_KB,
  maxASTFileSizeBytes: MAX_AST_FILE_SIZE_KB * 1024,
} as const;

export const GRAPH_LIMITS = {
  maxNodes: MAX_GRAPH_NODES,
  maxEdges: MAX_GRAPH_EDGES,
} as const;
