import type { ProviderCapabilities } from '../contracts/capabilities.ts';
import { DEFAULT_CAPABILITIES } from '../contracts/capabilities.ts';
import type { AIRequest } from '../contracts/request.ts';
import { createRequest } from '../contracts/request.ts';
import type { AIResponse } from '../contracts/response.ts';
import { createResponse } from '../contracts/response.ts';
import type { ProviderExecutionContext } from '../execution/execution-context.ts';
import { createExecutionContext } from '../execution/execution-context.ts';

export function sampleRequest(): AIRequest {
  return createRequest({
    prompt: 'What is the capital of France?',
    systemPrompt: 'You are a geography expert.',
    temperature: 0.3,
    maxTokens: 500,
    correlationId: 'test-correlation-001',
  });
}

export function sampleContext(): ProviderExecutionContext {
  return createExecutionContext({
    provider: 'mock',
    model: 'mock-model',
    stage: 'test',
    operationId: 'test-op-001',
    executionId: 'test-exec-001',
    deterministic: true,
  });
}

export function sampleCapabilities(): ProviderCapabilities {
  return {
    ...DEFAULT_CAPABILITIES,
    streaming: true,
    toolCalling: true,
    structuredOutput: true,
    contextWindow: 128_000,
    maxOutputTokens: 4096,
    retrySupport: true,
  };
}

export function emptyCapabilities(): ProviderCapabilities {
  return { ...DEFAULT_CAPABILITIES };
}

export function sampleResponse(overrides?: Partial<AIResponse>): AIResponse {
  return createResponse({
    text: 'Paris',
    tokenUsage: { promptTokens: 15, completionTokens: 3, totalTokens: 18 },
    latencyMs: 150,
    provider: 'mock',
    model: 'mock-model',
    finishReason: 'stop',
    ...overrides,
  });
}
