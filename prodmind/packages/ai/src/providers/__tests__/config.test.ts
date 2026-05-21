import { describe, expect, it } from 'vitest';

import { createProviderConfig, providerConfigSchema } from '../config/provider-config.ts';

describe('providerConfigSchema', () => {
  it('parses default config', () => {
    const config = providerConfigSchema.parse({});
    expect(config.openai.model).toBe('gpt-4o');
    expect(config.openrouter.model).toBe('meta-llama/llama-3.1-8b-instruct:free');
    expect(config.groq.model).toBe('mixtral-8x7b-32768');
    expect(config.anthropic.model).toBe('claude-3-5-sonnet-latest');
    expect(config.gemini.model).toBe('gemini-2.0-flash');
    expect(config.local.model).toBe('qwen2.5:7b');
  });

  it('merges overrides', () => {
    const config = providerConfigSchema.parse({
      openai: { model: 'gpt-4o-mini' },
    });
    expect(config.openai.model).toBe('gpt-4o-mini');
    expect(config.openai.timeout.totalMs).toBe(60000);
  });

  it('applies governance defaults', () => {
    const config = providerConfigSchema.parse({});
    expect(config.anthropic.governance.maxContextTokens).toBe(200000);
    expect(config.gemini.governance.maxContextTokens).toBe(1048576);
    expect(config.local.governance.deterministic).toBe(true);
  });

  it('validates timeout values are positive', () => {
    const parse = () => providerConfigSchema.parse({
      openai: { timeout: { totalMs: -1 } },
    });
    expect(parse).toThrow();
  });
});

describe('createProviderConfig', () => {
  it('returns full config with defaults', () => {
    const config = createProviderConfig();
    expect(config.openai).toBeDefined();
    expect(config.local).toBeDefined();
  });

  it('accepts partial overrides', () => {
    const config = createProviderConfig({
      openai: { model: 'custom-model' },
    });
    expect(config.openai.model).toBe('custom-model');
  });

  it('has deterministic governance profile for local', () => {
    const config = createProviderConfig();
    expect(config.local.governance.deterministic).toBe(true);
  });
});
