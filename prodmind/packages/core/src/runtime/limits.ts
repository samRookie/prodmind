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
