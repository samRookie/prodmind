import type { AIResponse } from '../../contracts/response.ts';
import type { RetryPolicy } from '../../retries/retry-policy.ts';

export type RuntimeLifecycleStage =
  | 'CREATED'
  | 'QUEUED'
  | 'VALIDATED'
  | 'SCHEDULED'
  | 'EXECUTING'
  | 'RETRYING'
  | 'NORMALIZING'
  | 'VALIDATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REPLAYED'
  | 'CANCELLED';

export type RuntimeFailureClass =
  | 'timeout'
  | 'malformed_response'
  | 'validation_failure'
  | 'provider_unavailable'
  | 'governance_rejection'
  | 'budget_overflow'
  | 'replay_mismatch'
  | 'retry_exhausted'
  | 'cancelled'
  | 'unknown';

export interface RuntimeLifecycleEntry {
  readonly stage: RuntimeLifecycleStage;
  readonly timestamp: string;
  readonly durationMs: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface RuntimePolicy {
  readonly maxExecutionDurationMs: number;
  readonly maxRetries: number;
  readonly allowedProviders: readonly string[];
  readonly maxTokenBudget: number;
  readonly maxContextTokens: number;
  readonly enforceReplay: boolean;
  readonly concurrencyLimit: number;
  readonly isolationLevel: RuntimeIsolationLevel;
}

export type RuntimeIsolationLevel = 'none' | 'logical';

export interface RuntimeExecutionRequest {
  readonly executionId: string;
  readonly provider: string;
  readonly model: string;
  readonly prompt: string;
  readonly systemPrompt?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly correlationId: string;
  readonly retryPolicy?: Partial<RetryPolicy>;
}

export interface RuntimeBudget {
  readonly promptTokens: number;
  readonly contextTokens: number;
  readonly estimatedLoad: number;
  readonly retryAmplification: number;
  readonly totalBudget: number;
  readonly remaining: number;
  readonly isOverBudget: boolean;
}

export interface RuntimeFailureRecord {
  readonly failureClass: RuntimeFailureClass;
  readonly message: string;
  readonly stage: RuntimeLifecycleStage;
  readonly code: string;
  readonly recoverable: boolean;
}

export interface RuntimePolicyDecision {
  readonly policy: RuntimePolicy;
  readonly allowed: boolean;
  readonly reasons: readonly string[];
}

export interface RuntimeRetryTrace {
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly totalDelayMs: number;
  readonly backoffApplied: boolean;
  readonly failureHistory: readonly RuntimeFailureRecord[];
}

export interface RuntimeSchedulingDecision {
  readonly queuePosition: number;
  readonly queueDepth: number;
  readonly scheduledAt: string;
  readonly estimatedStartAt: string;
  readonly priority: number;
}

export interface RuntimeExecutionTrace {
  readonly executionId: string;
  readonly lifecycleStages: readonly RuntimeLifecycleEntry[];
  readonly policyDecision?: RuntimePolicyDecision;
  readonly schedulingDecision?: RuntimeSchedulingDecision;
  readonly retryTrace?: RuntimeRetryTrace;
  readonly totalDurationMs: number;
}

export interface RuntimeExecutionMetrics {
  readonly queueWaitMs: number;
  readonly executionDurationMs: number;
  readonly totalDurationMs: number;
  readonly retriesAttempted: number;
  readonly policyEvaluations: number;
  readonly budgetUtilization: number;
  readonly finalLifecycleStage: RuntimeLifecycleStage;
  readonly failure?: RuntimeFailureRecord;
}

export interface RuntimeHealthSnapshot {
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly queueDepth: number;
  readonly activeExecutions: number;
  readonly retryStormDetected: boolean;
  readonly budgetExhausted: boolean;
  readonly failureRate: number;
  readonly uptimeMs: number;
  readonly lastError?: string;
}

export interface RuntimeExecutionResult {
  readonly request: RuntimeExecutionRequest;
  readonly response: AIResponse | null;
  readonly policy: RuntimePolicy;
  readonly budget: RuntimeBudget;
  readonly trace: RuntimeExecutionTrace;
  readonly metrics: RuntimeExecutionMetrics;
  readonly lifecycle: readonly RuntimeLifecycleEntry[];
  readonly healthSnapshot: RuntimeHealthSnapshot;
  readonly fingerprint: string;
  readonly generatedAt: string;
}

export const RUNTIME_LIFECYCLE_STAGES: readonly RuntimeLifecycleStage[] = Object.freeze([
  'CREATED', 'QUEUED', 'VALIDATED', 'SCHEDULED', 'EXECUTING', 'RETRYING',
  'NORMALIZING', 'VALIDATING', 'COMPLETED', 'FAILED', 'REPLAYED', 'CANCELLED',
]);

export function createRuntimeLifecycleEntry(input: {
  stage: RuntimeLifecycleStage;
  durationMs: number;
  metadata?: Record<string, unknown>;
}): RuntimeLifecycleEntry {
  return Object.freeze({
    stage: input.stage,
    timestamp: new Date().toISOString(),
    durationMs: input.durationMs,
    metadata: Object.freeze({ ...input.metadata }),
  });
}

export function createRuntimeExecutionRequest(input: {
  executionId: string;
  provider: string;
  model: string;
  prompt: string;
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
  correlationId: string;
  retryPolicy?: Partial<RetryPolicy>;
}): RuntimeExecutionRequest {
  return Object.freeze({
    executionId: input.executionId,
    provider: input.provider,
    model: input.model,
    prompt: input.prompt,
    systemPrompt: input.systemPrompt,
    metadata: Object.freeze({ ...input.metadata }),
    correlationId: input.correlationId,
    retryPolicy: input.retryPolicy ? Object.freeze({ ...input.retryPolicy }) : undefined,
  });
}

export function createRuntimePolicy(input: {
  maxExecutionDurationMs?: number;
  maxRetries?: number;
  allowedProviders?: readonly string[];
  maxTokenBudget?: number;
  maxContextTokens?: number;
  enforceReplay?: boolean;
  concurrencyLimit?: number;
  isolationLevel?: RuntimeIsolationLevel;
}): RuntimePolicy {
  const defaults: RuntimePolicy = Object.freeze({
    maxExecutionDurationMs: 60000,
    maxRetries: 3,
    allowedProviders: Object.freeze(['mock']),
    maxTokenBudget: 100000,
    maxContextTokens: 32000,
    enforceReplay: false,
    concurrencyLimit: 10,
    isolationLevel: 'logical',
  });
  return Object.freeze({
    maxExecutionDurationMs: input.maxExecutionDurationMs ?? defaults.maxExecutionDurationMs,
    maxRetries: input.maxRetries ?? defaults.maxRetries,
    allowedProviders: Object.freeze([...(input.allowedProviders ?? defaults.allowedProviders)]),
    maxTokenBudget: input.maxTokenBudget ?? defaults.maxTokenBudget,
    maxContextTokens: input.maxContextTokens ?? defaults.maxContextTokens,
    enforceReplay: input.enforceReplay ?? defaults.enforceReplay,
    concurrencyLimit: input.concurrencyLimit ?? defaults.concurrencyLimit,
    isolationLevel: input.isolationLevel ?? defaults.isolationLevel,
  });
}

export function createRuntimeBudget(input: {
  promptTokens: number;
  contextTokens: number;
  totalBudget: number;
  retryAmplification?: number;
}): RuntimeBudget {
  const estimatedLoad = input.promptTokens + input.contextTokens;
  const retryAmp = input.retryAmplification ?? 1;
    const total = estimatedLoad * retryAmp;
  return Object.freeze({
    promptTokens: input.promptTokens,
    contextTokens: input.contextTokens,
    estimatedLoad,
    retryAmplification: retryAmp,
    totalBudget: input.totalBudget,
    remaining: input.totalBudget - total,
    isOverBudget: total > input.totalBudget,
  });
}

export function createRuntimeFailureRecord(input: {
  failureClass: RuntimeFailureClass;
  message: string;
  stage: RuntimeLifecycleStage;
  code: string;
  recoverable?: boolean;
}): RuntimeFailureRecord {
  return Object.freeze({
    failureClass: input.failureClass,
    message: input.message,
    stage: input.stage,
    code: input.code,
    recoverable: input.recoverable ?? false,
  });
}

export function createEmptyRuntimeExecutionResult(request: RuntimeExecutionRequest, policy: RuntimePolicy): RuntimeExecutionResult {
  const budget = createRuntimeBudget({ promptTokens: 0, contextTokens: 0, totalBudget: policy.maxTokenBudget });
  const emptyTrace: RuntimeExecutionTrace = Object.freeze({
    executionId: request.executionId,
    lifecycleStages: Object.freeze([]),
    totalDurationMs: 0,
  });
  const health: RuntimeHealthSnapshot = Object.freeze({
    status: 'healthy', queueDepth: 0, activeExecutions: 0,
    retryStormDetected: false, budgetExhausted: false,
    failureRate: 0, uptimeMs: 0,
  });
  return Object.freeze({
    request,
    response: null,
    policy,
    budget,
    trace: emptyTrace,
    metrics: Object.freeze({
      queueWaitMs: 0, executionDurationMs: 0, totalDurationMs: 0,
      retriesAttempted: 0, policyEvaluations: 0, budgetUtilization: 0,
      finalLifecycleStage: 'CREATED',
    }),
    lifecycle: Object.freeze([]),
    healthSnapshot: health,
    fingerprint: 'pending',
    generatedAt: new Date().toISOString(),
  });
}
