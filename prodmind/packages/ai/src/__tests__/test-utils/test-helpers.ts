import type { TokenUsage } from '../../contracts/request.ts';
import { createResponse } from '../../contracts/response.ts';
import { createExecutionContext } from '../../execution/execution-context.ts';
import type { ExecutionSnapshot } from '../../execution-history/execution-snapshot.ts';
import { createExecutionSnapshot } from '../../execution-history/execution-snapshot.ts';
import { createMockProvider, deterministicRequest } from '../../testing/mock-provider.ts';

export function testRequest(): ReturnType<typeof deterministicRequest> {
  return deterministicRequest();
}

export function testTokenUsage(): TokenUsage {
  return { promptTokens: 10, completionTokens: 20, totalTokens: 30 };
}

export function testMockProvider(seed = 42) {
  return createMockProvider(seed);
}

export function testContext() {
  return createExecutionContext({
    provider: 'mock',
    model: 'mock-model',
    stage: 'test',
    deterministic: true,
  });
}

export function testResponse(overrides?: Partial<ReturnType<typeof createResponse>>) {
  return createResponse({
    text: 'Test response',
    tokenUsage: testTokenUsage(),
    latencyMs: 100,
    provider: 'mock',
    model: 'mock-model',
    finishReason: 'stop',
    ...overrides,
  });
}

export async function testSnapshot(): Promise<ExecutionSnapshot> {
  const response = testResponse();
  return createExecutionSnapshot({
    correlationId: 'test-correlation',
    promptId: 'test-prompt',
    promptVersion: 1,
    provider: 'mock',
    model: 'mock-model',
    renderedPrompt: 'What is the capital of France?',
    systemPrompt: 'You are a geography expert.',
    executionParams: { temperature: 0.5, maxTokens: 100 },
    response,
    retryCount: 0,
    status: 'success',
  });
}
