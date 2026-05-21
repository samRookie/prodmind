import { generateId } from '@prodmind/db';

export interface TokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface AIRequest {
  readonly prompt: string;
  readonly systemPrompt?: string;
  readonly temperature?: number;
  readonly topP?: number;
  readonly maxTokens?: number;
  readonly stopSequences?: readonly string[];
  readonly tools?: readonly unknown[];
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly correlationId: string;
}

export interface CreateRequestOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stopSequences?: readonly string[];
  tools?: readonly unknown[];
  metadata?: Readonly<Record<string, unknown>>;
  correlationId?: string;
}

export function createRequest(options: CreateRequestOptions): AIRequest {
  const request: AIRequest = {
    prompt: options.prompt,
    systemPrompt: options.systemPrompt,
    temperature: options.temperature ?? 0.7,
    topP: options.topP ?? 1,
    maxTokens: options.maxTokens ?? 4096,
    stopSequences: options.stopSequences ?? [],
    tools: options.tools ?? [],
    metadata: options.metadata ?? {},
    correlationId: options.correlationId ?? generateId(),
  };

  return Object.freeze(request);
}
