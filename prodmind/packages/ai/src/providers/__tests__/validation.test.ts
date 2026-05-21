import { describe, expect, it } from 'vitest';

import { createProviderMessage,createProviderRequest, createProviderResponse } from '../contracts.ts';
import { ProviderValidator } from '../validation/provider-validation.ts';

function validRequest() {
  return createProviderRequest({
    provider: 'openai',
    model: 'gpt-4',
    messages: [createProviderMessage({ role: 'user', content: 'hello' })],
    temperature: 0.5,
    maxTokens: 100,
    topP: 0.9,
  });
}

function validResponse() {
  return createProviderResponse({
    provider: 'openai',
    model: 'gpt-4',
    text: 'response',
    finishReason: 'stop',
    tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    latencyMs: 200,
  });
}

describe('ProviderValidator', () => {
  const v = new ProviderValidator();

  describe('validateRequest', () => {
    it('passes for valid request', () => {
      const result = v.validateRequest(validRequest());
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when provider is empty', () => {
      const result = v.validateRequest(createProviderRequest({
        provider: '', model: 'm',
        messages: [createProviderMessage({ role: 'user', content: 'hi' })],
      }));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Provider name is required');
    });

    it('fails when model is empty', () => {
      const result = v.validateRequest(createProviderRequest({
        provider: 't', model: '',
        messages: [createProviderMessage({ role: 'user', content: 'hi' })],
      }));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Model name is required');
    });

    it('fails with no messages', () => {
      const result = v.validateRequest(createProviderRequest({
        provider: 't', model: 'm', messages: [],
      }));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('At least one message is required');
    });

    it('fails with invalid role', () => {
      const result = v.validateRequest(createProviderRequest({
        provider: 't', model: 'm',
        messages: [{ role: 'invalid' as 'user', content: 'hi' }],
      }));
      expect(result.valid).toBe(false);
    });

    it('fails with empty message content', () => {
      const result = v.validateRequest(createProviderRequest({
        provider: 't', model: 'm',
        messages: [createProviderMessage({ role: 'user', content: '' })],
      }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('content must not be empty'))).toBe(true);
    });

    it('fails with oversized message content', () => {
      const result = v.validateRequest(createProviderRequest({
        provider: 't', model: 'm',
        messages: [createProviderMessage({ role: 'user', content: 'x'.repeat(130000) })],
      }));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('exceed'))).toBe(true);
    });

    it('fails with out-of-range temperature', () => {
      const result = v.validateRequest(createProviderRequest({
        provider: 't', model: 'm',
        messages: [createProviderMessage({ role: 'user', content: 'hi' })],
        temperature: 3,
      }));
      expect(result.valid).toBe(false);
    });

    it('fails with negative maxTokens', () => {
      const result = v.validateRequest(createProviderRequest({
        provider: 't', model: 'm',
        messages: [createProviderMessage({ role: 'user', content: 'hi' })],
        maxTokens: -1,
      }));
      expect(result.valid).toBe(false);
    });

    it('fails with out-of-range topP', () => {
      const result = v.validateRequest(createProviderRequest({
        provider: 't', model: 'm',
        messages: [createProviderMessage({ role: 'user', content: 'hi' })],
        topP: 1.5,
      }));
      expect(result.valid).toBe(false);
    });

    it('fails with too many stop sequences', () => {
      const result = v.validateRequest(createProviderRequest({
        provider: 't', model: 'm',
        messages: [createProviderMessage({ role: 'user', content: 'hi' })],
        stop: ['a', 'b', 'c', 'd', 'e'],
      }));
      expect(result.valid).toBe(false);
    });

    it('returns frozen result', () => {
      const result = v.validateRequest(validRequest());
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.errors)).toBe(true);
    });
  });

  describe('validateResponse', () => {
    it('passes for valid response', () => {
      const result = v.validateResponse(validResponse());
      expect(result.valid).toBe(true);
    });

    it('fails when provider is empty', () => {
      const result = v.validateResponse(createProviderResponse({
        provider: '', model: 'm', text: 'x',
      }));
      expect(result.valid).toBe(false);
    });

    it('fails when model is empty', () => {
      const result = v.validateResponse(createProviderResponse({
        provider: 't', model: '', text: 'x',
      }));
      expect(result.valid).toBe(false);
    });

    it('fails with negative latencyMs', () => {
      const result = v.validateResponse(createProviderResponse({
        provider: 't', model: 'm', text: 'x', latencyMs: -1,
      }));
      expect(result.valid).toBe(false);
    });

    it('fails with invalid finishReason', () => {
      const result = v.validateResponse(createProviderResponse({
        provider: 't', model: 'm', text: 'x',
        finishReason: 'unknown' as 'stop',
      }));
      expect(result.valid).toBe(false);
    });

    it('fails with mismatched totalTokens', () => {
      const result = v.validateResponse(createProviderResponse({
        provider: 't', model: 'm', text: 'x',
        tokenUsage: { promptTokens: 10, completionTokens: 10, totalTokens: 5 },
      }));
      expect(result.valid).toBe(false);
    });

    it('returns frozen result', () => {
      const result = v.validateResponse(validResponse());
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.errors)).toBe(true);
    });
  });
});
