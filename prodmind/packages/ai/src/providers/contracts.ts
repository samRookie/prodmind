export interface ProviderMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string;
}

export interface ProviderRequest {
  readonly id: string;
  readonly provider: string;
  readonly model: string;
  readonly messages: readonly ProviderMessage[];
  readonly temperature: number;
  readonly maxTokens: number;
  readonly topP: number;
  readonly stop: readonly string[];
  readonly fingerprint: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly replayMode: boolean;
}

export interface ProviderTokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface ProviderResponse {
  readonly id: string;
  readonly provider: string;
  readonly model: string;
  readonly text: string;
  readonly finishReason: 'stop' | 'length' | 'error';
  readonly tokenUsage: ProviderTokenUsage;
  readonly latencyMs: number;
  readonly fingerprint: string;
}

export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unavailable';

export interface ProviderHealth {
  readonly provider: string;
  readonly status: ProviderHealthStatus;
  readonly lastCheckMs: number;
  readonly failureCount: number;
  readonly successCount: number;
  readonly avgLatencyMs: number;
  readonly lastError?: string;
}

export interface ProviderRateLimitState {
  readonly tokensRemaining: number;
  readonly requestsRemaining: number;
  readonly resetAt: string;
  readonly isLimited: boolean;
}

export interface ProviderSelectionResult {
  readonly provider: string;
  readonly model: string;
  readonly reason: string;
  readonly fingerprint: string;
}

export interface ProviderGovernanceSnapshot {
  readonly provider: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly maxContextTokens: number;
  readonly temperature: number;
  readonly topP: number;
  readonly deterministic: boolean;
  readonly allowedCategories: readonly string[];
  readonly enabled: boolean;
}

export interface ProviderFingerprint {
  readonly hash: string;
  readonly components: Readonly<Record<string, string>>;
  readonly generatedAt: string;
}

export interface ProviderFailure {
  readonly provider: string;
  readonly code: string;
  readonly message: string;
  readonly recoverable: boolean;
  readonly stage: string;
}

export interface ProviderTelemetryEvent {
  readonly type: 'selection' | 'request' | 'response' | 'failure' | 'replay' | 'governance';
  readonly provider: string;
  readonly model: string;
  readonly timestamp: string;
  readonly durationMs: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ProviderTimeoutPolicy {
  readonly connectMs: number;
  readonly readMs: number;
  readonly writeMs: number;
  readonly totalMs: number;
}

export interface ProviderLimits {
  readonly maxTokensPerMin: number;
  readonly maxRequestsPerMin: number;
  readonly maxConcurrency: number;
  readonly maxRetries: number;
}

let providerIdCounter = 0;

export function generateProviderId(prefix = 'req'): string {
  providerIdCounter++;
  return `${prefix}_${Date.now().toString(36)}_${providerIdCounter}`;
}

export function createProviderMessage(input: {
  role: 'system' | 'user' | 'assistant';
  content: string;
}): ProviderMessage {
  return Object.freeze({ role: input.role, content: input.content });
}

export function createProviderRequest(input: {
  provider: string;
  model: string;
  messages: ProviderMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stop?: readonly string[];
  fingerprint?: string;
  metadata?: Record<string, unknown>;
  replayMode?: boolean;
}): ProviderRequest {
  return Object.freeze({
    id: generateProviderId('req'),
    provider: input.provider,
    model: input.model,
    messages: Object.freeze(input.messages.map(m => Object.freeze({ ...m }))),
    temperature: input.temperature ?? 0,
    maxTokens: input.maxTokens ?? 4096,
    topP: input.topP ?? 1,
    stop: Object.freeze([...(input.stop ?? [])]),
    fingerprint: input.fingerprint ?? '',
    metadata: Object.freeze({ ...input.metadata }),
    replayMode: input.replayMode ?? false,
  });
}

export function createProviderResponse(input: {
  provider: string;
  model: string;
  text: string;
  finishReason?: 'stop' | 'length' | 'error';
  tokenUsage?: ProviderTokenUsage;
  latencyMs?: number;
  fingerprint?: string;
}): ProviderResponse {
  return Object.freeze({
    id: generateProviderId('res'),
    provider: input.provider,
    model: input.model,
    text: input.text,
    finishReason: input.finishReason ?? 'stop',
    tokenUsage: Object.freeze(input.tokenUsage ?? { promptTokens: 0, completionTokens: 0, totalTokens: 0 }),
    latencyMs: input.latencyMs ?? 0,
    fingerprint: input.fingerprint ?? '',
  });
}

export function createProviderHealth(input: {
  provider: string;
  status?: ProviderHealthStatus;
  lastCheckMs?: number;
  failureCount?: number;
  successCount?: number;
  avgLatencyMs?: number;
  lastError?: string;
}): ProviderHealth {
  return Object.freeze({
    provider: input.provider,
    status: input.status ?? 'healthy',
    lastCheckMs: input.lastCheckMs ?? Date.now(),
    failureCount: input.failureCount ?? 0,
    successCount: input.successCount ?? 0,
    avgLatencyMs: input.avgLatencyMs ?? 0,
    lastError: input.lastError,
  });
}

export function createProviderRateLimitState(input: {
  tokensRemaining?: number;
  requestsRemaining?: number;
  resetAt?: string;
  isLimited?: boolean;
}): ProviderRateLimitState {
  return Object.freeze({
    tokensRemaining: input.tokensRemaining ?? 100000,
    requestsRemaining: input.requestsRemaining ?? 1000,
    resetAt: input.resetAt ?? new Date(Date.now() + 60000).toISOString(),
    isLimited: input.isLimited ?? false,
  });
}

export function createProviderSelectionResult(input: {
  provider: string;
  model: string;
  reason: string;
  fingerprint?: string;
}): ProviderSelectionResult {
  return Object.freeze({
    provider: input.provider,
    model: input.model,
    reason: input.reason,
    fingerprint: input.fingerprint ?? `${input.provider}:${input.model}`,
  });
}

export function createProviderGovernanceSnapshot(input: {
  provider: string;
  model: string;
  maxTokens?: number;
  maxContextTokens?: number;
  temperature?: number;
  topP?: number;
  deterministic?: boolean;
  allowedCategories?: readonly string[];
  enabled?: boolean;
}): ProviderGovernanceSnapshot {
  return Object.freeze({
    provider: input.provider,
    model: input.model,
    maxTokens: input.maxTokens ?? 4096,
    maxContextTokens: input.maxContextTokens ?? 128000,
    temperature: input.temperature ?? 0.7,
    topP: input.topP ?? 1,
    deterministic: input.deterministic ?? false,
    allowedCategories: Object.freeze([...(input.allowedCategories ?? [])]),
    enabled: input.enabled ?? true,
  });
}

export function createProviderFingerprint(input: {
  hash: string;
  components: Record<string, string>;
}): ProviderFingerprint {
  return Object.freeze({
    hash: input.hash,
    components: Object.freeze({ ...input.components }),
    generatedAt: new Date().toISOString(),
  });
}

export function createProviderFailure(input: {
  provider: string;
  code: string;
  message: string;
  recoverable?: boolean;
  stage?: string;
}): ProviderFailure {
  return Object.freeze({
    provider: input.provider,
    code: input.code,
    message: input.message,
    recoverable: input.recoverable ?? false,
    stage: input.stage ?? 'unknown',
  });
}

export function createProviderTelemetryEvent(input: {
  type: ProviderTelemetryEvent['type'];
  provider: string;
  model: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}): ProviderTelemetryEvent {
  return Object.freeze({
    type: input.type,
    provider: input.provider,
    model: input.model,
    timestamp: new Date().toISOString(),
    durationMs: input.durationMs ?? 0,
    metadata: Object.freeze({ ...input.metadata }),
  });
}

export function createProviderTimeoutPolicy(input?: {
  connectMs?: number;
  readMs?: number;
  writeMs?: number;
  totalMs?: number;
}): ProviderTimeoutPolicy {
  return Object.freeze({
    connectMs: input?.connectMs ?? 10000,
    readMs: input?.readMs ?? 30000,
    writeMs: input?.writeMs ?? 10000,
    totalMs: input?.totalMs ?? 60000,
  });
}

export function createProviderLimits(input?: {
  maxTokensPerMin?: number;
  maxRequestsPerMin?: number;
  maxConcurrency?: number;
  maxRetries?: number;
}): ProviderLimits {
  return Object.freeze({
    maxTokensPerMin: input?.maxTokensPerMin ?? 100000,
    maxRequestsPerMin: input?.maxRequestsPerMin ?? 1000,
    maxConcurrency: input?.maxConcurrency ?? 10,
    maxRetries: input?.maxRetries ?? 3,
  });
}
