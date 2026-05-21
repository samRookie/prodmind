import { describe, expect,it } from 'vitest';

import { createProviderConfig } from '../../config/provider-config.ts';

describe('createProviderConfig', () => {
  it('creates openai config with defaults', () => {
    const config = createProviderConfig('openai', { model: 'gpt-4' });

    expect(config.model).toBe('gpt-4');
    expect(config.timeoutMs).toBe(30000);
    expect(config.baseUrl).toBe('https://api.openai.com/v1');
    expect(config.retryPolicy.maxRetries).toBe(3);
  });

  it('creates anthropic config with defaults', () => {
    const config = createProviderConfig('anthropic', { model: 'claude-3-opus' });

    expect(config.model).toBe('claude-3-opus');
    expect(config.timeoutMs).toBe(60000);
    expect(config.baseUrl).toBe('https://api.anthropic.com/v1');
  });

  it('creates gemini config with defaults', () => {
    const config = createProviderConfig('gemini', { model: 'gemini-pro' });

    expect(config.model).toBe('gemini-pro');
    expect(config.timeoutMs).toBe(60000);
    expect(config.baseUrl).toBe('https://generativelanguage.googleapis.com/v1');
  });

  it('creates mock config with defaults', () => {
    const config = createProviderConfig('mock', { model: 'mock-model' });

    expect(config.model).toBe('mock-model');
    expect(config.timeoutMs).toBe(5000);
    expect(config.baseUrl).toBeUndefined();
    expect(config.retryPolicy.maxRetries).toBe(0);
  });

  it('overrides defaults with provided values', () => {
    const config = createProviderConfig('openai', {
      model: 'gpt-4-turbo',
      timeoutMs: 60000,
      apiKey: 'sk-test',
    });

    expect(config.model).toBe('gpt-4-turbo');
    expect(config.timeoutMs).toBe(60000);
    expect(config.apiKey).toBe('sk-test');
    expect(config.baseUrl).toBe('https://api.openai.com/v1');
  });

  it('merges retryPolicy override', () => {
    const config = createProviderConfig('openai', {
      model: 'gpt-4',
      retryPolicy: { maxRetries: 5, baseDelayMs: 2000, maxDelayMs: 60000, backoffFactor: 3, retryableStatusCodes: [429] },
    });

    expect(config.retryPolicy.maxRetries).toBe(5);
    expect(config.retryPolicy.baseDelayMs).toBe(2000);
  });
});
