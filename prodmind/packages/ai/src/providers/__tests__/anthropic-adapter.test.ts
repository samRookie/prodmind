import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    constructor() { }
    get messages() {
      return { create: mockCreate };
    }
  },
}));

import { AnthropicProviderAdapter } from '../anthropic/anthropic-provider-adapter.ts';
import { createProviderMessage,createProviderRequest } from '../contracts.ts';

function makeRequest(overrides?: Record<string, unknown>) {
  return createProviderRequest({
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-latest',
    messages: [createProviderMessage({ role: 'user', content: 'hello' })],
    temperature: 0,
    maxTokens: 100,
    fingerprint: 'fp1',
    ...overrides,
  });
}

function makeSdkResponse(overrides?: Record<string, unknown>) {
  return {
    id: 'msg_123',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: 'Hello from Claude' }],
    model: 'claude-3-5-sonnet-latest',
    stop_reason: 'end_turn',
    usage: { input_tokens: 10, output_tokens: 25 },
    ...overrides,
  };
}

describe('AnthropicProviderAdapter', () => {
  beforeEach(() => { mockCreate.mockReset(); });

  it('returns ProviderResponse on success', async () => {
    mockCreate.mockResolvedValueOnce(makeSdkResponse());
    const adapter = new AnthropicProviderAdapter({ apiKey: 'sk-ant-test', model: 'claude-3-5-sonnet-latest' });
    const response = await adapter.execute(makeRequest());
    expect(response.text).toBe('Hello from Claude');
    expect(response.finishReason).toBe('stop');
    expect(response.tokenUsage.promptTokens).toBe(10);
    expect(response.tokenUsage.completionTokens).toBe(25);
  });

  it('passes messages with system prompt separately', async () => {
    mockCreate.mockResolvedValueOnce(makeSdkResponse());
    const adapter = new AnthropicProviderAdapter({ apiKey: 'sk-ant-test', model: 'claude-3-5-sonnet-latest' });
    await adapter.execute(makeRequest({
      messages: [
        createProviderMessage({ role: 'system', content: 'be concise' }),
        createProviderMessage({ role: 'user', content: 'hello' }),
      ],
    }));
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      system: 'be concise',
      messages: [{ role: 'user', content: 'hello' }],
    }));
  });

  it('maps max_tokens stop reason to length', async () => {
    mockCreate.mockResolvedValueOnce(makeSdkResponse({
      stop_reason: 'max_tokens',
      content: [{ type: 'text', text: 'partial' }],
    }));
    const adapter = new AnthropicProviderAdapter({ apiKey: 'sk-ant-test', model: 'claude-3-5-sonnet-latest' });
    const response = await adapter.execute(makeRequest());
    expect(response.finishReason).toBe('length');
  });

  it('handles auth error', async () => {
    const err = new Error('Invalid API key');
    (err as unknown as { status: number }).status = 401;
    mockCreate.mockRejectedValueOnce(err);
    const adapter = new AnthropicProviderAdapter({ apiKey: 'bad', model: 'claude-3-5-sonnet-latest' });
    await expect(adapter.execute(makeRequest())).rejects.toThrow('Invalid API key');
  });

  it('returns frozen response', async () => {
    mockCreate.mockResolvedValueOnce(makeSdkResponse());
    const adapter = new AnthropicProviderAdapter({ apiKey: 'sk-ant-test', model: 'claude-3-5-sonnet-latest' });
    const response = await adapter.execute(makeRequest());
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('exposes name', () => {
    const adapter = new AnthropicProviderAdapter({ apiKey: 'sk-ant-test', model: 'claude-3-5-sonnet-latest' });
    expect(adapter.name).toBe('anthropic');
  });
});
