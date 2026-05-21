import { describe, expect, it } from 'vitest';

import {
  createProviderFailure,
  createProviderFingerprint,
  createProviderGovernanceSnapshot,
  createProviderHealth,
  createProviderLimits,
  createProviderMessage,
  createProviderRateLimitState,
  createProviderRequest,
  createProviderResponse,
  createProviderSelectionResult,
  createProviderTelemetryEvent,
  createProviderTimeoutPolicy,
  generateProviderId,
} from '../contracts.ts';

describe('generateProviderId', () => {
  it('generates unique IDs', () => {
    const a = generateProviderId();
    const b = generateProviderId();
    expect(a).not.toBe(b);
  });

  it('uses provided prefix', () => {
    const id = generateProviderId('test');
    expect(id.startsWith('test_')).toBe(true);
  });
});

describe('createProviderMessage', () => {
  it('creates message with correct role and content', () => {
    const msg = createProviderMessage({ role: 'user', content: 'hello' });
    expect(msg.role).toBe('user');
    expect(msg.content).toBe('hello');
  });

  it('returns frozen object', () => {
    const msg = createProviderMessage({ role: 'system', content: 'sys' });
    expect(Object.isFrozen(msg)).toBe(true);
  });
});

describe('createProviderRequest', () => {
  it('creates request with defaults', () => {
    const req = createProviderRequest({
      provider: 'openai',
      model: 'gpt-4',
      messages: [createProviderMessage({ role: 'user', content: 'hello' })],
    });
    expect(req.provider).toBe('openai');
    expect(req.messages).toHaveLength(1);
    expect(req.temperature).toBe(0);
    expect(req.maxTokens).toBe(4096);
    expect(req.topP).toBe(1);
    expect(req.replayMode).toBe(false);
  });

  it('accepts overrides', () => {
    const req = createProviderRequest({
      provider: 'anthropic',
      model: 'claude-3',
      messages: [],
      temperature: 0.5,
      maxTokens: 1000,
      replayMode: true,
    });
    expect(req.temperature).toBe(0.5);
    expect(req.maxTokens).toBe(1000);
    expect(req.replayMode).toBe(true);
  });

  it('returns frozen request and messages', () => {
    const req = createProviderRequest({
      provider: 'test',
      model: 'm',
      messages: [createProviderMessage({ role: 'user', content: 'hi' })],
    });
    expect(Object.isFrozen(req)).toBe(true);
    expect(Object.isFrozen(req.messages)).toBe(true);
    expect(Object.isFrozen(req.messages[0])).toBe(true);
  });
});

describe('createProviderResponse', () => {
  it('creates response with defaults', () => {
    const res = createProviderResponse({ provider: 'openai', model: 'gpt-4', text: 'hello' });
    expect(res.finishReason).toBe('stop');
    expect(res.latencyMs).toBe(0);
    expect(res.tokenUsage.totalTokens).toBe(0);
  });

  it('accepts overrides', () => {
    const res = createProviderResponse({
      provider: 'test', model: 'm', text: 'ok',
      finishReason: 'length', latencyMs: 100,
      tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    });
    expect(res.finishReason).toBe('length');
    expect(res.latencyMs).toBe(100);
    expect(res.tokenUsage.totalTokens).toBe(30);
  });

  it('returns frozen object', () => {
    const res = createProviderResponse({ provider: 't', model: 'm', text: 'x' });
    expect(Object.isFrozen(res)).toBe(true);
    expect(Object.isFrozen(res.tokenUsage)).toBe(true);
  });
});

describe('createProviderHealth', () => {
  it('defaults to healthy', () => {
    const h = createProviderHealth({ provider: 'openai' });
    expect(h.status).toBe('healthy');
    expect(h.failureCount).toBe(0);
    expect(h.successCount).toBe(0);
  });

  it('allows custom values', () => {
    const h = createProviderHealth({ provider: 't', status: 'degraded', failureCount: 3 });
    expect(h.status).toBe('degraded');
    expect(h.failureCount).toBe(3);
  });
});

describe('createProviderRateLimitState', () => {
  it('defaults to not limited', () => {
    const s = createProviderRateLimitState({});
    expect(s.isLimited).toBe(false);
    expect(s.tokensRemaining).toBe(100000);
  });
});

describe('createProviderSelectionResult', () => {
  it('creates with provider and model', () => {
    const r = createProviderSelectionResult({ provider: 'openai', model: 'gpt-4', reason: 'policy match' });
    expect(r.provider).toBe('openai');
    expect(r.fingerprint).toBe('openai:gpt-4');
  });
});

describe('createProviderGovernanceSnapshot', () => {
  it('uses defaults when no overrides', () => {
    const s = createProviderGovernanceSnapshot({ provider: 'o', model: 'm' });
    expect(s.maxTokens).toBe(4096);
    expect(s.deterministic).toBe(false);
    expect(s.enabled).toBe(true);
  });

  it('merges overrides', () => {
    const s = createProviderGovernanceSnapshot({ provider: 'o', model: 'm', deterministic: true, maxTokens: 1000 });
    expect(s.deterministic).toBe(true);
    expect(s.maxTokens).toBe(1000);
  });
});

describe('createProviderFingerprint', () => {
  it('stores hash and frozen components', () => {
    const f = createProviderFingerprint({ hash: 'abc123', components: { prompt: 'hi' } });
    expect(f.hash).toBe('abc123');
    expect(Object.isFrozen(f.components)).toBe(true);
  });
});

describe('createProviderFailure', () => {
  it('uses defaults', () => {
    const f = createProviderFailure({ provider: 't', code: 'ERR', message: 'fail' });
    expect(f.recoverable).toBe(false);
    expect(f.stage).toBe('unknown');
  });
});

describe('createProviderTelemetryEvent', () => {
  it('creates event with timestamp', () => {
    const e = createProviderTelemetryEvent({ type: 'request', provider: 't', model: 'm' });
    expect(e.type).toBe('request');
    expect(typeof e.timestamp).toBe('string');
  });
});

describe('createProviderTimeoutPolicy', () => {
  it('uses defaults', () => {
    const t = createProviderTimeoutPolicy();
    expect(t.connectMs).toBe(10000);
    expect(t.totalMs).toBe(60000);
  });
});

describe('createProviderLimits', () => {
  it('uses defaults', () => {
    const l = createProviderLimits();
    expect(l.maxConcurrency).toBe(10);
    expect(l.maxRetries).toBe(3);
  });
});
