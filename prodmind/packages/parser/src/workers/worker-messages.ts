import type { WorkerTaskType, WorkerTask, WorkerTaskResult } from './worker-types.ts';

export interface WorkerRequest<T = unknown> {
  taskId: string;
  type: WorkerTaskType;
  data: T;
  timestamp: string;
}

export interface WorkerResponse<T = unknown> {
  taskId: string;
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  timestamp: string;
  durationMs: number;
}

export interface WorkerProgress {
  taskId: string;
  percent: number;
  message: string;
  timestamp: string;
}

export function createWorkerRequest<T>(
  task: WorkerTask<T>,
): WorkerRequest<T> {
  return {
    taskId: task.id,
    type: task.type,
    data: task.payload,
    timestamp: new Date().toISOString(),
  };
}

export function createWorkerResponse<T>(
  taskId: string,
  result: WorkerTaskResult<T>,
): WorkerResponse<T> {
  return {
    taskId,
    success: result.success,
    data: result.data,
    ...(result.error
      ? { error: { code: 'TASK_ERROR', message: result.error } }
      : {}),
    timestamp: new Date().toISOString(),
    durationMs: result.durationMs,
  };
}

export function isWorkerRequest(obj: unknown): obj is WorkerRequest {
  if (typeof obj !== 'object' || obj === null) return false;
  const req = obj as Record<string, unknown>;
  return (
    typeof req.taskId === 'string' &&
    typeof req.type === 'string' &&
    req.data !== undefined &&
    typeof req.timestamp === 'string'
  );
}

export function isWorkerResponse(obj: unknown): obj is WorkerResponse {
  if (typeof obj !== 'object' || obj === null) return false;
  const res = obj as Record<string, unknown>;
  return (
    typeof res.taskId === 'string' &&
    typeof res.success === 'boolean' &&
    typeof res.timestamp === 'string' &&
    typeof res.durationMs === 'number'
  );
}
