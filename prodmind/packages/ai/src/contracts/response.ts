import type { TokenUsage } from './request.ts';

export type FinishReason = 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';

export interface RetryMetadata {
  readonly attempt: number;
  readonly totalAttempts: number;
  readonly totalDelayMs: number;
  readonly backoffApplied: boolean;
}

export interface AIResponse {
  readonly text: string;
  readonly structured?: Readonly<Record<string, unknown>>;
  readonly toolCalls?: readonly unknown[];
  readonly tokenUsage: TokenUsage;
  readonly latencyMs: number;
  readonly provider: string;
  readonly model: string;
  readonly finishReason: FinishReason;
  readonly retryMetadata?: RetryMetadata;
}

export interface CreateResponseOptions {
  text: string;
  structured?: Readonly<Record<string, unknown>>;
  toolCalls?: readonly unknown[];
  tokenUsage: TokenUsage;
  latencyMs: number;
  provider: string;
  model: string;
  finishReason: FinishReason;
  retryMetadata?: RetryMetadata;
}

export function createResponse(options: CreateResponseOptions): AIResponse {
  const response: AIResponse = {
    text: options.text,
    structured: options.structured,
    toolCalls: options.toolCalls ?? [],
    tokenUsage: options.tokenUsage,
    latencyMs: options.latencyMs,
    provider: options.provider,
    model: options.model,
    finishReason: options.finishReason,
    retryMetadata: options.retryMetadata,
  };

  return Object.freeze(response);
}
