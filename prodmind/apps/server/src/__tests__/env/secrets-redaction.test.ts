import { describe, it, expect } from 'vitest';
import { isSensitiveKey, redactValue, redactEnv } from '../../env/secrets-redaction.ts';

describe('SecretsRedaction', () => {
  it('detects sensitive keys', () => {
    expect(isSensitiveKey('AI_API_KEY')).toBe(true);
    expect(isSensitiveKey('DB_PASSWORD')).toBe(true);
    expect(isSensitiveKey('PORT')).toBe(false);
  });

  it('redacts values', () => {
    expect(redactValue('sk-test-key-12345')).toBe('sk-t****2345');
  });

  it('masks short values', () => {
    expect(redactValue('ab')).toBe('****');
  });

  it('redacts env object', () => {
    const env = { AI_API_KEY: 'sk-secret', PORT: '3000' };
    const redacted = redactEnv(env);
    expect(redacted.AI_API_KEY).not.toBe('sk-secret');
    expect(redacted.PORT).toBe('3000');
  });
});
