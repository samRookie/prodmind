import { describe, expect,it } from 'vitest';

import type { FinishReason } from '../../contracts/response.ts';
import { createResponse } from '../../contracts/response.ts';

describe('AIResponse', () => {
  it('creates a response with all required fields', () => {
    const response = createResponse({
      text: 'Paris',
      tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      latencyMs: 100,
      provider: 'mock',
      model: 'gpt-4',
      finishReason: 'stop',
    });

    expect(response.text).toBe('Paris');
    expect(response.tokenUsage.totalTokens).toBe(15);
    expect(response.latencyMs).toBe(100);
    expect(response.provider).toBe('mock');
    expect(response.model).toBe('gpt-4');
    expect(response.finishReason).toBe('stop');
  });

  it('defaults toolCalls to empty array', () => {
    const response = createResponse({
      text: 'Hello',
      tokenUsage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 0,
      provider: 'mock',
      model: 'test',
      finishReason: 'stop',
    });

    expect(response.toolCalls).toEqual([]);
  });

  it('accepts optional fields', () => {
    const response = createResponse({
      text: 'Hello',
      tokenUsage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      latencyMs: 0,
      provider: 'mock',
      model: 'test',
      finishReason: 'stop',
      structured: { answer: 'yes' },
      toolCalls: [{ id: 'call-1', type: 'function' }],
      retryMetadata: { attempt: 2, totalAttempts: 3, totalDelayMs: 1000, backoffApplied: true },
    });

    expect(response.structured).toEqual({ answer: 'yes' });
    expect(response.toolCalls).toHaveLength(1);
    expect(response.retryMetadata?.attempt).toBe(2);
  });

  it('freezes the returned object', () => {
    const response = createResponse({
      text: 'Paris',
      tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      latencyMs: 100,
      provider: 'mock',
      model: 'gpt-4',
      finishReason: 'stop',
    });

    expect(Object.isFrozen(response)).toBe(true);
  });

  it('accepts all valid finish reasons', () => {
    const reasons: FinishReason[] = ['stop', 'length', 'tool_calls', 'content_filter', 'error'];

    for (const reason of reasons) {
      const response = createResponse({
        text: 'test',
        tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs: 0,
        provider: 'test',
        model: 'test',
        finishReason: reason,
      });

      expect(response.finishReason).toBe(reason);
    }
  });
});
