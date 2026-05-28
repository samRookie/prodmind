import { describe, it, expect } from 'vitest';
import { EnvValidator } from '../../env/env-validator.ts';
import { envSchema } from '../../env/env-schema.ts';

describe('EnvValidator', () => {
  it('validates development env', () => {
    const v = new EnvValidator();
    const env = envSchema.parse({});
    const result = v.validate(env);
    expect(result.valid).toBe(true);
  });

  it('warns about missing AI key in production', () => {
    const v = new EnvValidator();
    const env = envSchema.parse({ NODE_ENV: 'production', AI_PROVIDER: 'openai' });
    const result = v.validate(env);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('warns about wildcard CORS in production', () => {
    const v = new EnvValidator();
    const env = envSchema.parse({ NODE_ENV: 'production', CORS_ORIGINS: '*' });
    const result = v.validate(env);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('detects production mode', () => {
    const v = new EnvValidator();
    const env = envSchema.parse({ NODE_ENV: 'production' });
    expect(v.isProduction(env)).toBe(true);
  });
});
