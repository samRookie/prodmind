import { describe, expect,it } from 'vitest';

import { AnthropicProvider } from '../../adapters/anthropic.adapter.ts';
import { GeminiProvider } from '../../adapters/gemini.adapter.ts';
import { MockProvider } from '../../adapters/mock.adapter.ts';
import { OpenAIProvider } from '../../adapters/openai.adapter.ts';
import type { AIProvider } from '../../providers/ai-provider.ts';

describe('AIProvider interface compliance', () => {
  const providers: { name: string; instance: AIProvider }[] = [
    { name: 'MockProvider', instance: new MockProvider({ model: 'mock', seed: 42, delayMs: 0, simulatedTokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, failureRate: 0, consecutiveFailures: 0, timeoutMs: 5000 }) },
    { name: 'OpenAIProvider', instance: new OpenAIProvider() },
    { name: 'AnthropicProvider', instance: new AnthropicProvider() },
    { name: 'GeminiProvider', instance: new GeminiProvider() },
  ];

  for (const { name, instance } of providers) {
    describe(name, () => {
      it('has a name property', () => {
        expect(instance.name).toBeDefined();
        expect(typeof instance.name).toBe('string');
      });

      it('has capabilities object', () => {
        expect(instance.capabilities).toBeDefined();
        expect(typeof instance.capabilities.streaming).toBe('boolean');
        expect(typeof instance.capabilities.toolCalling).toBe('boolean');
        expect(typeof instance.capabilities.structuredOutput).toBe('boolean');
        expect(typeof instance.capabilities.multimodal).toBe('boolean');
        expect(typeof instance.capabilities.contextWindow).toBe('number');
        expect(typeof instance.capabilities.maxOutputTokens).toBe('number');
        expect(typeof instance.capabilities.retrySupport).toBe('boolean');
      });

      it('has an execute method that returns a Promise', async () => {
        expect(instance.execute).toBeInstanceOf(Function);
        const result = instance.execute({ prompt: 'test', correlationId: 'test' } as never);
        expect(result).toBeInstanceOf(Promise);
        try {
          await result;
        } catch {
          // Stub adapters throw — that's expected
        }
      });
    });
  }
});
