export type QueueStrategy = 'fifo' | 'lifo' | 'priority';

export interface WorkerPoolConfig {
  maxWorkers: number;
  taskTimeout: number;
  queueStrategy: QueueStrategy;
  retryOnFailure: boolean;
  maxRetries: number;
}

export const DEFAULT_WORKER_POOL_CONFIG: WorkerPoolConfig = {
  maxWorkers: 4,
  taskTimeout: 30_000,
  queueStrategy: 'fifo',
  retryOnFailure: true,
  maxRetries: 3,
};

export function createWorkerPoolConfig(
  overrides?: Partial<WorkerPoolConfig>,
): WorkerPoolConfig {
  return {
    ...DEFAULT_WORKER_POOL_CONFIG,
    ...overrides,
  };
}

export interface WorkerPoolState {
  activeWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  isPaused: boolean;
}
