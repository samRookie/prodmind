import { MockProvider } from '../adapters/mock.adapter.ts';
import type { AIRequest } from '../contracts/request.ts';
import { createRequest } from '../contracts/request.ts';
import type { AIResponse } from '../contracts/response.ts';

export function createMockProvider(seed = 42): MockProvider {
  return new MockProvider({
    model: 'mock-model',
    seed,
    delayMs: 0,
    simulatedTokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    failureRate: 0,
    consecutiveFailures: 0,
    timeoutMs: 5000,
  });
}

export function deterministicRequest(overrides?: Partial<AIRequest>): AIRequest {
  return createRequest({
    prompt: 'Test prompt',
    systemPrompt: 'You are a helpful test assistant.',
    temperature: 0.5,
    maxTokens: 100,
    correlationId: 'test-correlation-id',
    ...overrides,
  });
}

export function assertResponseEquals(
  a: unknown,
  b: unknown,
  path = 'root',
): void {
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  for (const key of new Set([...Object.keys(aObj), ...Object.keys(bObj)])) {
    const valA = aObj[key];
    const valB = bObj[key];
    const currentPath = `${path}.${key}`;

    if (typeof valA === 'object' && valA !== null && typeof valB === 'object' && valB !== null && !Array.isArray(valA) && !Array.isArray(valB)) {
      assertResponseEquals(valA, valB, currentPath);
    } else if (Array.isArray(valA) && Array.isArray(valB)) {
      if (valA.length !== valB.length) {
        throw new Error(`${currentPath}: Array length mismatch (${valA.length} vs ${valB.length})`);
      }
    } else if (valA !== valB) {
      throw new Error(`${currentPath}: Value mismatch (${JSON.stringify(valA)} vs ${JSON.stringify(valB)})`);
    }
  }
}

export function fingerprintResponse(response: AIResponse): string {
  const obj = {
    text: response.text,
    tokenUsage: response.tokenUsage,
    provider: response.provider,
    model: response.model,
    finishReason: response.finishReason,
  };
  return JSON.stringify(obj);
}
