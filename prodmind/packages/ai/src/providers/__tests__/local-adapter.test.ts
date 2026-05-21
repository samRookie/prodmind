import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreate = vi.fn();

vi.mock('openai', () => ({
  default: class MockOpenAI {
    constructor() { }
    get chat() {
      return { completions: { create: mockCreate } };
    }
  },
}));

import { createProviderMessage,createProviderRequest } from '../contracts.ts';
import { LocalProviderAdapter } from '../local/local-provider-adapter.ts';

function makeRequest(overrides?: Record<string, unknown>) {
  return createProviderRequest({
    provider: 'local',
    model: 'qwen2.5:7b',
    messages: [createProviderMessage({ role: 'user', content: 'hello' })],
    temperature: 0,
    maxTokens: 100,
    fingerprint: 'fp1',
    ...overrides,
  });
}

function makeSdkResponse(overrides?: Record<string, unknown>) {
  return {
    id: 'local-cmpl',
    object: 'chat.completion',
    created: 1677652288,
    model: 'qwen2.5:7b',
    choices: [
      { index: 0, message: { role: 'assistant', content: 'Local response' }, finish_reason: 'stop' },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
    ...overrides,
  };
}

describe('LocalProviderAdapter', () => {
  beforeEach(() => { mockCreate.mockReset(); });

  it('returns ProviderResponse on success', async () => {
    mockCreate.mockResolvedValueOnce(makeSdkResponse());
    const adapter = new LocalProviderAdapter({ model: 'qwen2.5:7b' });
    const response = await adapter.execute(makeRequest());
    expect(response.text).toBe('Local response');
    expect(response.finishReason).toBe('stop');
  });

  it('passes correct params to SDK', async () => {
    mockCreate.mockResolvedValueOnce(makeSdkResponse());
    const adapter = new LocalProviderAdapter({ model: 'qwen2.5:7b' });
    await adapter.execute(makeRequest());
    const callArgs = mockCreate.mock.calls[0] as unknown[];
    const params = callArgs[0] as Record<string, unknown>;
    expect(params).toMatchObject({ model: 'qwen2.5:7b', messages: [{ role: 'user', content: 'hello' }] });
  });

  it('handles empty choices', async () => {
    mockCreate.mockResolvedValueOnce(makeSdkResponse({ choices: [] }));
    const adapter = new LocalProviderAdapter({ model: 'qwen2.5:7b' });
    await expect(adapter.execute(makeRequest())).rejects.toThrow('No choices returned');
  });

  it('maps length finish reason', async () => {
    mockCreate.mockResolvedValueOnce(makeSdkResponse({
      choices: [{ index: 0, message: { role: 'assistant', content: 'partial' }, finish_reason: 'length' }],
    }));
    const adapter = new LocalProviderAdapter({ model: 'qwen2.5:7b' });
    const response = await adapter.execute(makeRequest());
    expect(response.finishReason).toBe('length');
  });

  it('handles connection errors', async () => {
    mockCreate.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    const adapter = new LocalProviderAdapter({ model: 'qwen2.5:7b' });
    await expect(adapter.execute(makeRequest())).rejects.toThrow('Local model unavailable');
  });

  it('returns frozen response', async () => {
    mockCreate.mockResolvedValueOnce(makeSdkResponse());
    const adapter = new LocalProviderAdapter({ model: 'qwen2.5:7b' });
    const response = await adapter.execute(makeRequest());
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('exposes name', () => {
    const adapter = new LocalProviderAdapter({ model: 'qwen2.5:7b' });
    expect(adapter.name).toBe('local');
  });
});
