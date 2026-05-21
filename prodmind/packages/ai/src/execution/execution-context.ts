import { generateId } from '@prodmind/db';

export interface ProviderExecutionContext {
  readonly operationId: string;
  readonly executionId: string;
  readonly snapshotId?: string;
  readonly projectId?: string;
  readonly provider: string;
  readonly model: string;
  readonly stage: string;
  readonly deterministic?: boolean;
  readonly traceId?: string;
  readonly signal?: AbortSignal;
}

export interface CreateExecutionContextOptions {
  provider: string;
  model: string;
  stage: string;
  operationId?: string;
  executionId?: string;
  snapshotId?: string;
  projectId?: string;
  deterministic?: boolean;
  traceId?: string;
  signal?: AbortSignal;
}

export function createExecutionContext(options: CreateExecutionContextOptions): ProviderExecutionContext {
  const context: ProviderExecutionContext = {
    operationId: options.operationId ?? generateId(),
    executionId: options.executionId ?? generateId(),
    snapshotId: options.snapshotId,
    projectId: options.projectId,
    provider: options.provider,
    model: options.model,
    stage: options.stage,
    deterministic: options.deterministic,
    traceId: options.traceId,
    signal: options.signal,
  };

  return Object.freeze(context);
}

export function generateExecutionId(): string {
  return generateId();
}
