import { describe, expect, it } from 'vitest';

import { ProviderSecrets } from '../secrets/provider-secrets.ts';

describe('ProviderSecrets', () => {
  it('reports missing keys when not configured', () => {
    const secrets = new ProviderSecrets({});
    const result = secrets.validate();
    expect(result.valid).toBe(false);
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('throws when getting unset key', () => {
    const secrets = new ProviderSecrets({});
    expect(() => secrets.get('OPENAI_API_KEY')).toThrow('not configured');
  });

  it('returns key when configured', () => {
    const secrets = new ProviderSecrets({ OPENAI_API_KEY: 'sk-test-key-12345' });
    const key = secrets.get('OPENAI_API_KEY');
    expect(key).toBe('sk-test-key-12345');
  });

  it('has returns true for configured keys', () => {
    const secrets = new ProviderSecrets({ OPENAI_API_KEY: 'sk-test-key-12345' });
    expect(secrets.has('OPENAI_API_KEY')).toBe(true);
    expect(secrets.has('ANTHROPIC_API_KEY')).toBe(false);
  });

  it('mask shows first 3 and last 4 chars', () => {
    const secrets = new ProviderSecrets({});
    const masked = secrets.mask('sk-test-key-12345');
    expect(masked).toBe('sk-****2345');
  });

  it('mask returns **** for short values', () => {
    const secrets = new ProviderSecrets({});
    expect(secrets.mask('abc')).toBe('****');
  });

  it('getAllKeys returns all secret key names', () => {
    const secrets = new ProviderSecrets({});
    const keys = secrets.getAllKeys();
    expect(keys).toContain('OPENAI_API_KEY');
    expect(keys).toContain('ANTHROPIC_API_KEY');
    expect(keys).toContain('GEMINI_API_KEY');
    expect(keys).toContain('OPENROUTER_API_KEY');
    expect(keys).toContain('GROQ_API_KEY');
  });

  it('validate detects short keys', () => {
    const secrets = new ProviderSecrets({ OPENAI_API_KEY: 'short' });
    const result = secrets.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
