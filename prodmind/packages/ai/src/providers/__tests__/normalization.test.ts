import { describe, expect, it } from 'vitest';

import { ProviderNormalizer } from '../normalization/provider-normalizer.ts';

describe('ProviderNormalizer', () => {
  const normalizer = new ProviderNormalizer();

  describe('normalizeRequest from AIRequest', () => {
    it('converts AIRequest to ProviderRequest', () => {
      const req = normalizer.normalizeRequest({
        source: {
          prompt: 'hello',
          systemPrompt: 'be helpful',
          temperature: 0.5,
          maxTokens: 100,
          topP: 0.9,
          stopSequences: ['\n'],
          correlationId: 'corr-1',
        },
        provider: 'openai',
        model: 'gpt-4',
      });

      expect(req.provider).toBe('openai');
      expect(req.model).toBe('gpt-4');
      expect(req.messages).toHaveLength(2);
      expect(req.messages[0]?.role).toBe('system');
      expect(req.messages[0]?.content).toBe('be helpful');
      expect(req.messages[1]?.role).toBe('user');
      expect(req.messages[1]?.content).toBe('hello');
      expect(req.temperature).toBe(0.5);
      expect(req.maxTokens).toBe(100);
      expect(req.topP).toBe(0.9);
      expect(req.stop).toEqual(['\n']);
    });

    it('handles request without system prompt', () => {
      const req = normalizer.normalizeRequest({
        source: { prompt: 'hi', correlationId: 'c1' },
        provider: 'test',
        model: 'm',
      });
      expect(req.messages).toHaveLength(1);
      expect(req.messages[0]?.role).toBe('user');
    });

    it('preserves metadata and correlationId', () => {
      const req = normalizer.normalizeRequest({
        source: { prompt: 'hi', metadata: { env: 'test' }, correlationId: 'c1' },
        provider: 'test',
        model: 'm',
      });
      expect(req.metadata).toHaveProperty('correlationId', 'c1');
      expect(req.metadata).toHaveProperty('env', 'test');
    });

    it('returns frozen request', () => {
      const req = normalizer.normalizeRequest({
        source: { prompt: 'hi', correlationId: 'c1' },
        provider: 't',
        model: 'm',
      });
      expect(Object.isFrozen(req)).toBe(true);
    });
  });

  describe('normalizeRequest from ProviderExecutionEnvelope', () => {
    it('converts envelope to ProviderRequest', () => {
      const req = normalizer.normalizeRequest({
        source: {
          renderedPrompt: 'analyze this',
          systemPrompt: 'be concise',
          constraints: { maxTokens: 2000, allowedCategories: [], timeoutMs: 30000 },
          metadata: { trace: 'abc' },
          fingerprint: 'fp1',
        },
        provider: 'anthropic',
        model: 'claude-3',
      });

      expect(req.provider).toBe('anthropic');
      expect(req.messages[0]?.content).toBe('be concise');
      expect(req.messages[1]?.content).toBe('analyze this');
      expect(req.maxTokens).toBe(2000);
      expect(req.fingerprint).toBe('fp1');
    });
  });

  describe('normalizeResponse', () => {
    it('creates ProviderResponse from raw data', () => {
      const res = normalizer.normalizeResponse({
        text: 'response text',
        provider: 'openai',
        model: 'gpt-4',
        finishReason: 'stop',
        promptTokens: 50,
        completionTokens: 100,
        latencyMs: 200,
      });

      expect(res.text).toBe('response text');
      expect(res.finishReason).toBe('stop');
      expect(res.tokenUsage.promptTokens).toBe(50);
      expect(res.tokenUsage.completionTokens).toBe(100);
      expect(res.tokenUsage.totalTokens).toBe(150);
      expect(res.latencyMs).toBe(200);
    });

    it('calculates totalTokens when only prompt+completion given', () => {
      const res = normalizer.normalizeResponse({
        text: 'x', provider: 't', model: 'm',
        promptTokens: 10, completionTokens: 20,
      });
      expect(res.tokenUsage.totalTokens).toBe(30);
    });

    it('returns frozen response', () => {
      const res = normalizer.normalizeResponse({ text: 'x', provider: 't', model: 'm' });
      expect(Object.isFrozen(res)).toBe(true);
    });
  });

  describe('fromAIResponse', () => {
    it('converts AIResponse to ProviderResponse', () => {
      const pr = normalizer.fromAIResponse({
        text: 'result',
        tokenUsage: { promptTokens: 5, completionTokens: 10, totalTokens: 15 },
        latencyMs: 50,
        provider: 'openai',
        model: 'gpt-4',
        finishReason: 'stop',
      });

      expect(pr.text).toBe('result');
      expect(pr.tokenUsage.totalTokens).toBe(15);
    });

    it('maps content_filter finish reason to error', () => {
      const pr = normalizer.fromAIResponse({
        text: '', tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        latencyMs: 0, provider: 't', model: 'm', finishReason: 'content_filter',
      });
      expect(pr.finishReason).toBe('error');
    });
  });

  describe('toAIResponse', () => {
    it('converts ProviderResponse to AIResponse', () => {
      const response = normalizer.normalizeResponse({
        text: 'hello back', provider: 'test', model: 'm',
      });

      const ai = normalizer.toAIResponse(response);
      expect(ai.text).toBe('hello back');
      expect(ai.provider).toBe('test');
    });
  });

  describe('canonicalSerialize', () => {
    it('produces stable output for same input', () => {
      const a = normalizer.canonicalSerialize({ b: 2, a: 1 });
      const b = normalizer.canonicalSerialize({ a: 1, b: 2 });
      expect(a).toBe(b);
    });

    it('removes undefined values', () => {
      const result = normalizer.canonicalSerialize({ a: 1, b: undefined });
      expect(result).not.toContain('b');
    });
  });
});
