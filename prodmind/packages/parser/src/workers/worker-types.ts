export enum WorkerTaskType {
  PARSE_FILE = 'PARSE_FILE',
  BUILD_AST = 'BUILD_AST',
  ANALYZE_DEPS = 'ANALYZE_DEPS',
  EXTRACT_SYMBOLS = 'EXTRACT_SYMBOLS',
  COMPUTE_METRICS = 'COMPUTE_METRICS',
  VALIDATE_STRUCTURE = 'VALIDATE_STRUCTURE',
}

export enum WorkerTaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface WorkerTask<T = unknown> {
  id: string;
  type: WorkerTaskType;
  payload: T;
  status: WorkerTaskStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  retries: number;
}

export interface WorkerTaskResult<T = unknown> {
  taskId: string;
  success: boolean;
  data?: T;
  error?: string;
  durationMs: number;
}

export interface ParseFilePayload {
  filePath: string;
  projectId: string;
  maxSizeKB: number;
  encoding?: string;
}

export interface BuildASTPayload {
  filePath: string;
  projectId: string;
  language: string;
  content: string;
  maxDepth: number;
}

export interface AnalyzeDepsPayload {
  filePath: string;
  projectId: string;
  content: string;
  maxImports: number;
}

export interface ExtractSymbolsPayload {
  filePath: string;
  projectId: string;
  content: string;
}

export interface ComputeMetricsPayload {
  filePath: string;
  projectId: string;
  ast: unknown;
  deps: string[];
  symbols: string[];
}
