import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSendMessage = vi.fn();

class MockChat {
  sendMessage = mockSendMessage;
}

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: class MockGoogleGenAI {
    constructor() { }
    getGenerativeModel() {
      return {
        startChat: () => new MockChat(),
      };
    }
  },
}));

import { createProviderMessage,createProviderRequest } from '../contracts.ts';
import { GeminiProviderAdapter } from '../gemini/gemini-provider-adapter.ts';

function makeRequest(overrides?: Record<string, unknown>) {
  return createProviderRequest({
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    messages: [createProviderMessage({ role: 'user', content: 'hello' })],
    temperature: 0,
    maxTokens: 100,
    fingerprint: 'fp1',
    ...overrides,
  });
}

function makeSdkResponse(overrides?: Record<string, unknown>) {
  return {
    response: {
      text: () => 'Hello from Gemini',
      candidates: [{ finishReason: 'STOP' }],
    },
    ...overrides,
  };
}

describe('GeminiProviderAdapter', () => {
  beforeEach(() => { mockSendMessage.mockReset(); });

  it('returns ProviderResponse on success', async () => {
    mockSendMessage.mockResolvedValueOnce(makeSdkResponse());
    const adapter = new GeminiProviderAdapter({ apiKey: 'gemini-test-key', model: 'gemini-2.0-flash' });
    const response = await adapter.execute(makeRequest());
    expect(response.text).toBe('Hello from Gemini');
    expect(response.finishReason).toBe('stop');
  });

  it('passes system instruction when present', async () => {
    mockSendMessage.mockResolvedValueOnce(makeSdkResponse());
    const adapter = new GeminiProviderAdapter({ apiKey: 'key', model: 'gemini-2.0-flash' });
    await adapter.execute(makeRequest({
      messages: [
        createProviderMessage({ role: 'system', content: 'be brief' }),
        createProviderMessage({ role: 'user', content: 'hello' }),
      ],
    }));
    expect(mockSendMessage).toHaveBeenCalledWith('hello');
  });

  it('maps MAX_TOKENS to length', async () => {
    mockSendMessage.mockResolvedValueOnce(makeSdkResponse({
      response: {
        text: () => 'partial',
        candidates: [{ finishReason: 'MAX_TOKENS' }],
      },
    }));
    const adapter = new GeminiProviderAdapter({ apiKey: 'key', model: 'gemini-2.0-flash' });
    const response = await adapter.execute(makeRequest());
    expect(response.finishReason).toBe('length');
  });

  it('maps SAFETY to error', async () => {
    mockSendMessage.mockResolvedValueOnce(makeSdkResponse({
      response: {
        text: () => '',
        candidates: [{ finishReason: 'SAFETY' }],
      },
    }));
    const adapter = new GeminiProviderAdapter({ apiKey: 'key', model: 'gemini-2.0-flash' });
    const response = await adapter.execute(makeRequest());
    expect(response.finishReason).toBe('error');
  });

  it('handles auth error', async () => {
    const err = new Error('API key not valid');
    (err as unknown as { status: number }).status = 401;
    mockSendMessage.mockRejectedValueOnce(err);
    const adapter = new GeminiProviderAdapter({ apiKey: 'bad', model: 'gemini-2.0-flash' });
    await expect(adapter.execute(makeRequest())).rejects.toThrow('API key not valid');
  });

  it('returns frozen response', async () => {
    mockSendMessage.mockResolvedValueOnce(makeSdkResponse());
    const adapter = new GeminiProviderAdapter({ apiKey: 'key', model: 'gemini-2.0-flash' });
    const response = await adapter.execute(makeRequest());
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('exposes name', () => {
    const adapter = new GeminiProviderAdapter({ apiKey: 'key', model: 'gemini-2.0-flash' });
    expect(adapter.name).toBe('gemini');
  });
});
