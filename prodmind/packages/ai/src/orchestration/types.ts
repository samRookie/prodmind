import type { FeatureFlagSnapshot } from '@prodmind/core';

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'skipped';

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface StepInput<T = unknown> {
  readonly data: T;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface StepOutput<T = unknown> {
  readonly data: T;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface StepContext {
  readonly workflowId: string;
  readonly stepId: string;
  readonly executionId: string;
  readonly traceId: string;
  readonly signal?: AbortSignal;
  readonly featureFlags: FeatureFlagSnapshot;
  readonly limits: Record<string, unknown>;
}

export interface Step<TInput = unknown, TOutput = unknown> {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  execute(input: StepInput<TInput>, context: StepContext): Promise<StepOutput<TOutput>>;
}

export type WorkflowErrorPolicy = 'abort' | 'skip' | 'fallback';

export interface StepExecutionRecord {
  readonly stepId: string;
  readonly stepName: string;
  readonly status: StepStatus;
  readonly inputFingerprint?: string;
  readonly outputFingerprint?: string;
  readonly durationMs: number;
  readonly errorCode?: string;
  readonly errorMessage?: string;
  readonly traceId: string;
}

export interface WorkflowResult<TOutput = unknown> {
  readonly status: WorkflowStatus;
  readonly output: TOutput | null;
  readonly executionRecords: readonly StepExecutionRecord[];
  readonly traceId: string;
  readonly durationMs: number;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface OrchestrationConfig {
  readonly workflowId?: string;
  readonly signal?: AbortSignal;
  readonly traceId?: string;
  readonly errorPolicy?: WorkflowErrorPolicy;
  readonly fallbackValue?: unknown;
}

export function createStepInput<T>(data: T, metadata?: Record<string, unknown>): StepInput<T> {
  return Object.freeze({ data, metadata: Object.freeze({ ...metadata }) });
}

export function createStepOutput<T>(data: T, metadata?: Record<string, unknown>): StepOutput<T> {
  return Object.freeze({ data, metadata: Object.freeze({ ...metadata }) });
}

export function createStepExecutionRecord(input: {
  stepId: string;
  stepName: string;
  status: StepStatus;
  durationMs: number;
  traceId: string;
  inputFingerprint?: string;
  outputFingerprint?: string;
  errorCode?: string;
  errorMessage?: string;
}): StepExecutionRecord {
  return Object.freeze({
    stepId: input.stepId,
    stepName: input.stepName,
    status: input.status,
    inputFingerprint: input.inputFingerprint,
    outputFingerprint: input.outputFingerprint,
    durationMs: input.durationMs,
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
    traceId: input.traceId,
  });
}
