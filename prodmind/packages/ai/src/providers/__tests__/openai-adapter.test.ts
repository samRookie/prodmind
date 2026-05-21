import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: class MockOpenAI {
    constructor() {
      // mock constructor
    }
    get chat() {
      return {
        completions: {
          create: mockCreate,
        },
      };
    }
  },
}));

import { createProviderMessage,createProviderRequest } from '../contracts.ts';
import { OpenAIProviderAdapter } from '../openai/openai-provider-adapter.ts';

function makeRequest(overrides?: Record<string, unknown>) {
  return createProviderRequest({
    provider: 'openai',
    model: 'gpt-4',
    messages: [createProviderMessage({ role: 'user', content: 'hello' })],
    temperature: 0,
    maxTokens: 100,
    fingerprint: 'fp1',
    ...overrides,
  });
}

function makeSdkResponse(overrides?: Record<string, unknown>) {
  return {
    id: 'chatcmpl-123',
    object: 'chat.completion',
    created: 1677652288,
    model: 'gpt-4',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: 'Hello there!' },
        finish_reason: 'stop',
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    ...overrides,
  };
}

describe('OpenAIProviderAdapter', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  describe('execute', () => {
    it('returns ProviderResponse on successful SDK call', async () => {
      mockCreate.mockResolvedValueOnce(makeSdkResponse());

      const adapter = new OpenAIProviderAdapter({
        apiKey: 'sk-test',
        model: 'gpt-4',
      });

      const response = await adapter.execute(makeRequest());
      expect(response.text).toBe('Hello there!');
      expect(response.finishReason).toBe('stop');
      expect(response.tokenUsage.promptTokens).toBe(10);
      expect(response.tokenUsage.completionTokens).toBe(20);
      expect(response.tokenUsage.totalTokens).toBe(30);
      expect(response.provider).toBe('openai');
    });

    it('passes correct params to SDK', async () => {
      mockCreate.mockResolvedValueOnce(makeSdkResponse());

      const adapter = new OpenAIProviderAdapter({
        apiKey: 'sk-test',
        model: 'gpt-4',
      });

      await adapter.execute(makeRequest());

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          messages: [{ role: 'user', content: 'hello' }],
          temperature: 0,
          max_tokens: 100,
        }),
        expect.any(Object),
      );
    });

    it('includes system message when present', async () => {
      mockCreate.mockResolvedValueOnce(makeSdkResponse());

      const adapter = new OpenAIProviderAdapter({
        apiKey: 'sk-test',
        model: 'gpt-4',
      });

      await adapter.execute(makeRequest({
        messages: [
          createProviderMessage({ role: 'system', content: 'be helpful' }),
          createProviderMessage({ role: 'user', content: 'hi' }),
        ],
      }));

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            { role: 'system', content: 'be helpful' },
            { role: 'user', content: 'hi' },
          ],
        }),
        expect.any(Object),
      );
    });

    it('maps length finish reason', async () => {
      mockCreate.mockResolvedValueOnce(makeSdkResponse({
        choices: [{ index: 0, message: { role: 'assistant', content: 'partial' }, finish_reason: 'length' }],
      }));

      const adapter = new OpenAIProviderAdapter({ apiKey: 'sk-test', model: 'gpt-4' });
      const response = await adapter.execute(makeRequest());
      expect(response.finishReason).toBe('length');
    });

    it('maps content_filter to error', async () => {
      mockCreate.mockResolvedValueOnce(makeSdkResponse({
        choices: [{ index: 0, message: { role: 'assistant', content: '' }, finish_reason: 'content_filter' }],
      }));

      const adapter = new OpenAIProviderAdapter({ apiKey: 'sk-test', model: 'gpt-4' });
      const response = await adapter.execute(makeRequest());
      expect(response.finishReason).toBe('error');
    });

    it('throws on invalid request', async () => {
      const adapter = new OpenAIProviderAdapter({ apiKey: 'sk-test', model: 'gpt-4' });
      await expect(adapter.execute(makeRequest({ messages: [] }))).rejects.toThrow();
    });

    it('handles API error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API error'));

      const adapter = new OpenAIProviderAdapter({ apiKey: 'sk-test', model: 'gpt-4' });
      await expect(adapter.execute(makeRequest())).rejects.toThrow('API error');
    });

    it('handles 401 auth error', async () => {
      const err = new Error('Incorrect API key');
      (err as unknown as { status: number }).status = 401;
      mockCreate.mockRejectedValueOnce(err);

      const adapter = new OpenAIProviderAdapter({ apiKey: 'bad-key', model: 'gpt-4' });
      await expect(adapter.execute(makeRequest())).rejects.toThrow('Incorrect API key');
    });

    it('handles empty choices response', async () => {
      mockCreate.mockResolvedValueOnce(makeSdkResponse({ choices: [] }));

      const adapter = new OpenAIProviderAdapter({ apiKey: 'sk-test', model: 'gpt-4' });
      await expect(adapter.execute(makeRequest())).rejects.toThrow('No choices returned');
    });

    it('returns frozen response', async () => {
      mockCreate.mockResolvedValueOnce(makeSdkResponse());

      const adapter = new OpenAIProviderAdapter({ apiKey: 'sk-test', model: 'gpt-4' });
      const response = await adapter.execute(makeRequest());
      expect(Object.isFrozen(response)).toBe(true);
    });

    it('includes stop sequences when present', async () => {
      mockCreate.mockResolvedValueOnce(makeSdkResponse());

      const adapter = new OpenAIProviderAdapter({ apiKey: 'sk-test', model: 'gpt-4' });
      await adapter.execute(makeRequest({ stop: ['\n', 'END'] }));

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ stop: ['\n', 'END'] }),
        expect.any(Object),
      );
    });
  });

  describe('name', () => {
    it('returns openai', () => {
      const adapter = new OpenAIProviderAdapter({ apiKey: 'sk-test', model: 'gpt-4' });
      expect(adapter.name).toBe('openai');
    });
  });
});
